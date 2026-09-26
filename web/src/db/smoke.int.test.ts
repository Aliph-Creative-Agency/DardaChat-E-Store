import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { settings } from "./schema";
import { createTestDb, truncateAll } from "./test-utils";

const { db, close } = createTestDb();

beforeAll(() => truncateAll(db));
afterAll(() => close());

describe("db smoke", () => {
  it("runs select 1 against the test database", async () => {
    const rows = await db.execute<{ ok: number; db: string }>(sql`select 1 as ok, current_database() as db`);
    expect(rows[0]).toEqual({ ok: 1, db: "dardachat_test" });
  });

  it("round-trips a settings row", async () => {
    await db.insert(settings).values({ key: "smoke.test", value: { n: 1, ar: "مرحبا" } });
    const [row] = await db.select().from(settings).where(eq(settings.key, "smoke.test"));
    expect(row?.value).toEqual({ n: 1, ar: "مرحبا" });
    expect(row?.updatedAt).toBeInstanceOf(Date);
  });
});
