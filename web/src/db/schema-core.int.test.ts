import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addresses, auditEntries, consentRecords, customers, roles, sessions, staffUsers, userRoles } from "./schema";
import { createTestDb, truncateAll } from "./test-utils";

const { db, close } = createTestDb();

beforeAll(() => truncateAll(db));
afterAll(() => close());

describe("core + auth + customer records schema", () => {
  it("stores and reads back a staff user with role and session", async () => {
    const [user] = await db
      .insert(staffUsers)
      .values({ email: "owner@example.test", name: "Owner", passwordHash: "$argon2id$stub" })
      .returning();
    const [role] = await db.insert(roles).values({ key: "owner", nameAr: "المالك", nameEn: "Owner" }).returning();
    expect(user && role).toBeTruthy();
    await db.insert(userRoles).values({ userId: user!.id, roleId: role!.id });
    await db.insert(sessions).values({
      tokenHash: "hash-1",
      subjectType: "staff",
      subjectId: user!.id,
      expiresAt: new Date(Date.now() + 3600_000),
    });

    const [s] = await db.select().from(sessions).where(eq(sessions.subjectId, user!.id));
    expect(s?.subjectType).toBe("staff");
    expect(user!.status).toBe("active");
    expect(user!.locale).toBe("ar");

    // case-insensitive unique email
    await expect(
      db.insert(staffUsers).values({ email: "OWNER@example.test", name: "Dup", passwordHash: "x" }),
    ).rejects.toThrow();
  });

  it("stores a customer with an address and a consent record", async () => {
    const [c] = await db
      .insert(customers)
      .values({ phoneE164: "+970599123456", name: "سارة", locale: "ar" })
      .returning();
    await db.insert(addresses).values({
      customerId: c!.id,
      recipientName: "سارة",
      phoneE164: "+970599123456",
      governorate: "Ramallah and Al-Bireh",
      locality: "البيرة",
      line1: "شارع القدس، بجانب المخبز",
      landmark: "مقابل مسجد العين",
    });
    await db.insert(consentRecords).values({
      customerId: c!.id,
      purpose: "marketing_whatsapp",
      granted: true,
      source: "checkout",
      policyVersion: "privacy-v1",
    });

    const [a] = await db.select().from(addresses).where(eq(addresses.customerId, c!.id));
    const [k] = await db.select().from(consentRecords).where(eq(consentRecords.customerId, c!.id));
    expect(a?.locality).toBe("البيرة");
    expect(k?.granted).toBe(true);
    expect(k?.recordedAt).toBeInstanceOf(Date);
  });

  it("refuses a customer with no contact and a duplicate phone", async () => {
    await expect(db.insert(customers).values({ name: "no contact" })).rejects.toThrow();
    await expect(db.insert(customers).values({ phoneE164: "+970599123456" })).rejects.toThrow();
  });

  it("writes an audit entry", async () => {
    const [e] = await db
      .insert(auditEntries)
      .values({ actorType: "system", action: "test.insert", targetType: "customers", before: null, after: { a: 1 } })
      .returning();
    expect(e?.occurredAt).toBeInstanceOf(Date);
  });
});
