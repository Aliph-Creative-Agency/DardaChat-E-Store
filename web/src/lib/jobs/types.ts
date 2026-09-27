import type { DbOrTx } from "../../db/connection";

export interface JobContext {
  db: DbOrTx;
  now: Date;
  log: (message: string) => void;
  /** Aborted when the job exceeds its timeout or the scheduler stops. */
  signal: AbortSignal;
}

/** A scheduled job. Name = `<module>.<job>`. Jobs must be idempotent (a crash mid-run means it runs again). */
export interface JobDefinition {
  name: string;
  /** Minimum time between two starts, across every process (enforced by the `job_locks` lease). */
  intervalMs: number;
  /** Default 5 min. Also the lease length, so a crashed runner's lock expires. */
  timeoutMs?: number;
  run(ctx: JobContext): Promise<unknown>;
}
