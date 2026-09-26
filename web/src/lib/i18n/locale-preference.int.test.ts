import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditEntries, customers, staffUsers } from "@/db/schema";
import { createTestDb, truncateAll } from "@/db/test-utils";
import { persistLocalePreference, preferredLocale } from "./locale-preference";

const { db, close } = createTestDb();
let staffId = "";
let customerId = "";

beforeAll(async () => {
  await truncateAll(db);
  const [s] = await db
    .insert(staffUsers)
    .values({ email: "locale-staff@example.test", name: "Staff", passwordHash: "$argon2id$stub" })
    .returning();
  staffId = s!.id;
  const [c] = await db.insert(customers).values({ phoneE164: "+970599000111", name: "سلمى" }).returning();
  customerId = c!.id;
});

afterAll(async () => {
  await close();
});

describe("locale preference", () => {
  it("defaults to Arabic for both tables", async () => {
    expect(await preferredLocale({ type: "staff", id: staffId }, db)).toBe("ar");
    expect(await preferredLocale({ type: "customer", id: customerId }, db)).toBe("ar");
  });

  it("persists and reads back a staff member's locale", async () => {
    expect(await persistLocalePreference({ type: "staff", id: staffId }, "en", db)).toBe(true);
    expect(await preferredLocale({ type: "staff", id: staffId }, db)).toBe("en");
    const [row] = await db.select().from(staffUsers).where(eq(staffUsers.id, staffId));
    expect(row!.locale).toBe("en");
  });

  it("persists a customer's locale and the journal attributes it to the customer", async () => {
    expect(await persistLocalePreference({ type: "customer", id: customerId }, "en", db)).toBe(true);
    expect(await preferredLocale({ type: "customer", id: customerId }, db)).toBe("en");
    const entries = await db
      .select()
      .from(auditEntries)
      .where(and(eq(auditEntries.targetType, "customers"), eq(auditEntries.targetId, customerId)));
    const update = entries.find((e) => e.actorType === "customer" && e.actorId === customerId);
    expect(update, JSON.stringify(entries.map((e) => [e.action, e.actorType]))).toBeDefined();

    expect(await persistLocalePreference({ type: "customer", id: customerId }, "ar", db)).toBe(true);
    expect(await preferredLocale({ type: "customer", id: customerId }, db)).toBe("ar");
  });

  it("rejects unsupported locales and reports unknown users", async () => {
    await expect(persistLocalePreference({ type: "staff", id: staffId }, "fr", db)).rejects.toThrow(RangeError);
    const missing = "00000000-0000-4000-8000-000000000000";
    expect(await persistLocalePreference({ type: "customer", id: missing }, "en", db)).toBe(false);
    expect(await preferredLocale({ type: "customer", id: missing }, db)).toBeNull();
  });
});
