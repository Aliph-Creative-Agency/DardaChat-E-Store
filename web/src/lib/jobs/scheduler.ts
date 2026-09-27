/**
 * In-process job scheduler (DECISIONS 2026-09-26 "jobs"). Every `tickMs` it tries each job's lease; the lease
 * guarantees one runner across processes and the interval. Job errors are caught, logged and recorded in
 * `job_locks.last_status/last_error`; they never stop the loop.
 */
import { randomUUID } from "node:crypto";
import os from "node:os";
import type { DbOrTx } from "../../db/connection";
import { acquireLease, releaseLease } from "./lock";
import type { JobDefinition } from "./types";

export interface SchedulerOptions {
  db: DbOrTx;
  /** Default 5 s. */
  tickMs?: number;
  /** Lease owner id; default `<host>:<pid>:<random>`. */
  owner?: string;
  log?: (message: string) => void;
}

export interface JobRunResult {
  name: string;
  ran: boolean;
  status?: "ok" | "error";
  error?: string;
  durationMs?: number;
}

export interface Scheduler {
  readonly owner: string;
  start(): void;
  stop(): Promise<void>;
  /** One pass over every job (respects leases and intervals). */
  tick(): Promise<JobRunResult[]>;
  /** Run one job now, ignoring its interval (still takes the lease). */
  runOnce(name: string): Promise<JobRunResult>;
}

const DEFAULT_TIMEOUT_MS = 5 * 60_000;

export function createScheduler(jobs: readonly JobDefinition[], opts: SchedulerOptions): Scheduler {
  const owner = opts.owner ?? `${os.hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
  const tickMs = opts.tickMs ?? 5000;
  const log = opts.log ?? ((m: string) => console.log(`[jobs] ${m}`));
  const byName = new Map(jobs.map((j) => [j.name, j]));
  const stopController = new AbortController();
  let timer: ReturnType<typeof setInterval> | undefined;
  let running: Promise<unknown> | undefined;

  async function execute(job: JobDefinition, force: boolean): Promise<JobRunResult> {
    const timeoutMs = job.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let acquired: boolean;
    try {
      acquired = await acquireLease(opts.db, job.name, owner, { leaseMs: timeoutMs + 30_000, intervalMs: job.intervalMs, force });
    } catch (error) {
      log(`${job.name}: lease error ${error instanceof Error ? error.message : String(error)}`);
      return { name: job.name, ran: false, status: "error", error: String(error) };
    }
    if (!acquired) return { name: job.name, ran: false };

    const started = Date.now();
    const controller = new AbortController();
    const onStop = () => controller.abort();
    stopController.signal.addEventListener("abort", onStop, { once: true });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let status: "ok" | "error" = "ok";
    let errorText: string | undefined;
    try {
      await Promise.race([
        job.run({ db: opts.db, now: new Date(), log: (m) => log(`${job.name}: ${m}`), signal: controller.signal }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(new Error(`timed out after ${timeoutMs} ms`));
          }, timeoutMs);
        }),
      ]);
    } catch (error) {
      status = "error";
      errorText = error instanceof Error ? error.message : String(error);
      log(`${job.name}: error ${errorText}`);
    } finally {
      clearTimeout(timeout);
      stopController.signal.removeEventListener("abort", onStop);
    }
    try {
      await releaseLease(opts.db, job.name, owner, { status, error: errorText?.slice(0, 2000) ?? null });
    } catch (error) {
      log(`${job.name}: release error ${error instanceof Error ? error.message : String(error)}`);
    }
    return { name: job.name, ran: true, status, error: errorText, durationMs: Date.now() - started };
  }

  async function tick(): Promise<JobRunResult[]> {
    const results: JobRunResult[] = [];
    for (const job of jobs) {
      if (stopController.signal.aborted) break;
      results.push(await execute(job, false));
    }
    return results;
  }

  return {
    owner,
    start() {
      if (timer) return;
      const loop = () => {
        if (running) return; // previous tick still busy
        running = tick()
          .catch((e: unknown) => log(`tick error ${String(e)}`))
          .finally(() => (running = undefined));
      };
      timer = setInterval(loop, tickMs);
      timer.unref?.();
      loop();
      log(`scheduler started (${jobs.length} jobs, tick ${tickMs} ms, owner ${owner})`);
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
      stopController.abort();
      await running;
    },
    tick,
    async runOnce(name) {
      const job = byName.get(name);
      if (!job) throw new Error(`unknown job "${name}" (known: ${[...byName.keys()].join(", ")})`);
      return execute(job, true);
    },
  };
}
