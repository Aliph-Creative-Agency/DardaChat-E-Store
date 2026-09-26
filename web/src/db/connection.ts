// Framework-free DB factory (usable from scripts, seeds and tests). App code imports `@/db/client` instead.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Schema = typeof schema;

export function createDb(url: string, opts: { max?: number } = {}) {
  const client = postgres(url, { max: opts.max ?? 10, onnotice: () => {} });
  // casing must match drizzle.config.ts: camelCase TS keys ↔ snake_case columns.
  const db = drizzle(client, { schema, casing: "snake_case" });
  return { db, client };
}

export type Db = ReturnType<typeof createDb>["db"];
/** A transaction handle (what `db.transaction(async (tx) => …)` passes). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Anything that can run queries: the db or a transaction. */
export type DbOrTx = Db | Tx;

export function defaultDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ?? `postgres://postgres:postgres@localhost:${process.env.PG_PORT ?? 54320}/dardachat`
  );
}
