/**
 * ServiceContext: the optional last argument of every module contract function. Pass `db` (a transaction) to
 * compose one transaction across modules, `actor` for journal/audit attribution, `now` to pin the clock in tests.
 */
import { createDb, defaultDatabaseUrl, type Db, type DbOrTx } from "../db/connection";
import type { Actor } from "../db/guards";

export type { Actor } from "../db/guards";
export type { Db, DbOrTx, Tx } from "../db/connection";

export interface ServiceContext {
  db?: DbOrTx;
  actor?: Actor;
  now?: Date;
}

export const systemActor: Actor = { type: "system", id: null };

// Same globalThis key as src/db/client.ts so the app, scripts and services share one pool per process.
// Not importing `@/db/client` directly keeps this usable from plain Node scripts (it imports "server-only").
const globalForDb = globalThis as unknown as { __dardachatDb?: Db };

export function defaultDb(): Db {
  if (!globalForDb.__dardachatDb) globalForDb.__dardachatDb = createDb(defaultDatabaseUrl()).db;
  return globalForDb.__dardachatDb;
}

export function dbOf(ctx?: ServiceContext): DbOrTx {
  return ctx?.db ?? defaultDb();
}

export function nowOf(ctx?: ServiceContext): Date {
  return ctx?.now ?? new Date();
}

export function actorOf(ctx?: ServiceContext) {
  return ctx?.actor ?? systemActor;
}
