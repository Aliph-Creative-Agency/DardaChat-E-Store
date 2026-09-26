// Helpers for *.int.test.ts files. They always target the test database.
import { sql } from "drizzle-orm";
import { createDb, type Db } from "./connection";

export function testDatabaseUrl(): string {
  return (
    process.env.TEST_DATABASE_URL ??
    `postgres://postgres:postgres@localhost:${process.env.PG_PORT ?? 54320}/dardachat_test`
  );
}

/** A fresh client on the test DB. Call `close()` in afterAll. */
export function createTestDb(): { db: Db; close: () => Promise<void> } {
  const { db, client } = createDb(testDatabaseUrl(), { max: 5 });
  return { db, close: () => client.end() };
}

/**
 * Empty every table in `public`. Append-only triggers (010-append-only.sql) refuse TRUNCATE unless
 * `dardachat.test_reset` is on for the transaction — this is the only place that sets it.
 */
export async function truncateAll(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    const rows = await tx.execute<{ tablename: string }>(
      sql`select tablename from pg_tables where schemaname = 'public'`,
    );
    const names = rows.map((r) => `"public"."${r.tablename}"`);
    if (names.length === 0) return;
    await tx.execute(sql`select set_config('dardachat.test_reset', 'on', true)`);
    await tx.execute(sql.raw(`truncate ${names.join(", ")} restart identity cascade`));
  });
}
