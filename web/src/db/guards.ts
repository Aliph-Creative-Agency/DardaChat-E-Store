/**
 * Transaction-scoped switches read by the DB triggers in src/db/sql/010-append-only.sql and 015-journal.sql.
 * Each helper opens a transaction (a SAVEPOINT when given a transaction), sets the switch with
 * `set_config(…, true)` (= SET LOCAL), runs `fn`, then restores the previous value so the rest of an outer
 * transaction is unaffected. If `fn` throws, the (sub)transaction rolls back and the switch goes with it.
 */
import { sql } from "drizzle-orm";
import { actorTypeEnum } from "../modules/core/schema";
import type { DbOrTx, Tx } from "./connection";

async function withSettings<T>(db: DbOrTx, settings: Record<string, string>, fn: (tx: Tx) => Promise<T>): Promise<T> {
  // Db and Tx both expose transaction(); the union's call signatures differ only in their tx param type.
  const run = db.transaction.bind(db) as (cb: (tx: Tx) => Promise<T>) => Promise<T>;
  return run(async (tx) => {
    const previous: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      const [row] = await tx.execute<{ prev: string | null }>(
        sql`select current_setting(${key}, true) as prev, set_config(${key}, ${value}, true)`,
      );
      previous[key] = row?.prev ?? "";
    }
    const result = await fn(tx);
    for (const [key, value] of Object.entries(previous)) {
      await tx.execute(sql`select set_config(${key}, ${value}, true)`);
    }
    return result;
  });
}

/**
 * Personal-data erasure (FR-DAT-008): inside `fn`, UPDATE is allowed on append-only tables (DELETE never is) and
 * the journal records that columns were erased without copying their values.
 */
export function withErasure<T>(db: DbOrTx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withSettings(db, { "dardachat.erasure": "on" }, fn);
}

/** audit_entries.actor_type values. Payment-provider webhooks act as "system". */
export type ActorType = (typeof actorTypeEnum.enumValues)[number];
export interface Actor {
  type: ActorType;
  /** staff_users.id / customers.id; omit for system. */
  id?: string | null;
}

/**
 * Attribute every journalled row change made inside `fn` (FR-DAT-006) to `actor`. Without it the journal records
 * actor_type "system".
 */
export function withActor<T>(db: DbOrTx, actor: Actor, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withSettings(db, { "dardachat.actor_type": actor.type, "dardachat.actor_id": actor.id ?? "" }, fn);
}
