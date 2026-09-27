/**
 * Lease lock on `job_locks` so a job runs in at most one process at a time and at most once per interval.
 * Times use the DB clock (now()) so several processes agree.
 */
import { sql } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";

/**
 * Try to take the lease for `name`. Succeeds when nobody holds a live lease and (unless `force`) the last start
 * is at least `intervalMs` ago. On success `last_run_at` = now (interval is start-to-start).
 */
export async function acquireLease(
  db: DbOrTx,
  name: string,
  owner: string,
  opts: { leaseMs: number; intervalMs: number; force?: boolean },
): Promise<boolean> {
  const lease = `${Math.max(1, Math.ceil(opts.leaseMs))} milliseconds`;
  const interval = `${Math.max(0, Math.floor(opts.intervalMs))} milliseconds`;
  const intervalCheck = opts.force
    ? sql`true`
    : sql`(job_locks.last_run_at is null or job_locks.last_run_at <= now() - ${interval}::interval)`;
  const rows = await db.execute<{ name: string }>(sql`
    insert into job_locks (name, locked_until, locked_by, last_run_at)
    values (${name}, now() + ${lease}::interval, ${owner}, now())
    on conflict (name) do update
      set locked_until = excluded.locked_until, locked_by = excluded.locked_by, last_run_at = excluded.last_run_at
      where (job_locks.locked_until is null or job_locks.locked_until < now()) and ${intervalCheck}
    returning name`);
  return rows.length > 0;
}

export async function releaseLease(
  db: DbOrTx,
  name: string,
  owner: string,
  outcome: { status: "ok" | "error"; error?: string | null },
): Promise<void> {
  await db.execute(sql`
    update job_locks
       set locked_until = null, locked_by = null, last_status = ${outcome.status}, last_error = ${outcome.error ?? null}
     where name = ${name} and locked_by = ${owner}`);
}
