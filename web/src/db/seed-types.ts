import type { Db } from "./connection";

/** Passed to every module's `seed(ctx)` (src/modules/<m>/seed.ts). Seeds must be idempotent: insert-if-missing by
 * natural key, never overwrite what an admin may have changed. */
export interface SeedContext {
  db: Db;
  /** Back-office accounts. Plaintext passwords only ever live in web/.env.local (resolved by the CLI scripts). */
  staff: {
    owner: { email: string; password: string };
    staff: { email: string; password: string };
  };
  log: (message: string) => void;
}

export type ModuleSeed = (ctx: SeedContext) => Promise<void>;
