/**
 * Next.js instrumentation hook: starts the in-process job scheduler (DECISIONS 2026-09-26 "jobs") in the Node.js
 * server runtime unless JOBS_MODE=off. Guarded by a globalThis flag so dev HMR never starts a second loop.
 * The lease in `job_locks` keeps runs single even when several servers or `npm run jobs` run at once.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.JOBS_MODE === "off" || process.env.NEXT_PHASE === "phase-production-build") return;
  const g = globalThis as unknown as { __dardachatScheduler?: boolean };
  if (g.__dardachatScheduler) return;
  g.__dardachatScheduler = true;
  const [{ createScheduler }, { allJobs }, { defaultDb }] = await Promise.all([
    import("./lib/jobs/scheduler"),
    import("./lib/jobs/registry"),
    import("./lib/context"),
  ]);
  createScheduler(allJobs, { db: defaultDb() }).start();
}
