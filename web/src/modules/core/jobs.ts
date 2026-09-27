import type { JobDefinition } from "../../lib/jobs/types";
import { dispatchDueMessages } from "./messaging";

/** Scheduled jobs of the core module. Collected by src/lib/jobs/registry.ts. */
export const jobs: JobDefinition[] = [
  {
    name: "core.outbox.dispatch",
    intervalMs: 30_000,
    timeoutMs: 120_000,
    async run({ db, log }) {
      const r = await dispatchDueMessages({ limit: 50, maxAttempts: 5 }, { db });
      if (r.picked > 0) log(`picked ${r.picked}: sent ${r.sent}, failed ${r.failed}, dead ${r.dead}, superseded ${r.superseded}`);
      return r;
    },
  },
];
