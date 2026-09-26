/**
 * Adapter base (CI-003/CI-004): every call to an external service (payments, e-invoicing, WhatsApp, SMS, email,
 * LLM, storage, analytics) goes through `callExternal`, which applies injected faults, a timeout, exponential
 * backoff retries, a dead letter on final failure and the degradation registry.
 */
import { deadLetters } from "../../modules/core/schema";
import { dbOf, type ServiceContext } from "../context";
import { AppError } from "../errors";
import { applyFault, getFault } from "../faults";
import { reportDegradation, reportRecovery, type ServiceName } from "../health";
import { PermanentError, TimeoutError } from "./errors";

export interface CallExternalOptions<T> {
  service: ServiceName;
  /** e.g. "send", "initiate", "generate". Dead-letter source = `<service>.<operation>`. */
  operation: string;
  /** The real/mock call. Honour `signal` where the client supports it. */
  fn: (signal: AbortSignal) => Promise<T>;
  timeoutMs?: number;
  /** Retries after the first attempt (total attempts = retries + 1). */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** When given, a final failure writes a `dead_letters` row. */
  deadLetter?: { reference?: string; payload: Record<string, unknown> };
  ctx?: ServiceContext;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable for tests; jitter = up to 10% of the delay × random(). */
  random?: () => number;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number, random = Math.random): number {
  const base = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return base + Math.floor(base * 0.1 * random());
}

async function attemptOnce<T>(opts: CallExternalOptions<T>, attempt: number, timeoutMs: number): Promise<T> {
  const fault = await getFault(opts.service, opts.ctx);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);
  });
  try {
    const call = (async () => {
      await applyFault(opts.service, fault, { attempt, signal: controller.signal });
      return opts.fn(controller.signal);
    })();
    call.catch(() => {}); // the race below owns the error; avoid an unhandled rejection after a timeout
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function callExternal<T>(opts: CallExternalOptions<T>): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 200;
  const maxDelayMs = opts.maxDelayMs ?? 5000;
  const sleep = opts.sleep ?? realSleep;

  let lastError: unknown;
  let attempts = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    attempts = attempt + 1;
    try {
      const result = await attemptOnce(opts, attempt, timeoutMs);
      await reportRecovery(opts.service, opts.ctx);
      return result;
    } catch (error) {
      lastError = error;
      if (error instanceof PermanentError) break;
      if (attempt < retries) await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs, opts.random));
    }
  }

  const permanent = lastError instanceof PermanentError;
  const source = `${opts.service}.${opts.operation}`;
  const text = message(lastError);
  if (opts.deadLetter) {
    await dbOf(opts.ctx)
      .insert(deadLetters)
      .values({
        source,
        reference: opts.deadLetter.reference ?? null,
        payload: opts.deadLetter.payload,
        error: text.slice(0, 2000),
        attempts,
      });
  }
  // A permanent error is the request's fault (bad address…), not the service's: no degradation.
  if (!permanent) await reportDegradation(opts.service, lastError, "degraded", opts.ctx);
  throw new AppError(
    "unavailable",
    `${source} failed after ${attempts} attempt(s): ${text}`,
    { service: opts.service, operation: opts.operation, attempts, permanent },
    { cause: lastError },
  );
}
