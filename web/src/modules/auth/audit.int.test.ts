import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, truncateAll } from "../../db/test-utils";
import { auditEntries } from "../core/schema";
import { audit, auditedMutation, changed, listAuditEntries, REDACTED } from "./audit";
import { staffUsers } from "./schema";

const { db, close } = createTestDb();
let userId: string;

beforeAll(async () => {
  await truncateAll(db);
  [{ id: userId }] = (await db
    .insert(staffUsers)
    .values({ email: "a@audit.test", name: "A", passwordHash: "$argon2id$x" })
    .returning({ id: staffUsers.id })) as [{ id: string }];
});
afterAll(() => close());

describe("audit", () => {
  it("records actor, action, target, before, after, ip and a timestamp", async () => {
    await audit(db, {
      actor: { type: "staff", id: userId },
      action: "user.suspend",
      target: { type: "staff_user", id: userId },
      before: { status: "active" },
      after: { status: "suspended" },
      ip: "203.0.113.1",
    });
    const [e] = await listAuditEntries(db, { targetType: "staff_user", targetId: userId });
    expect(e).toMatchObject({
      actorType: "staff",
      actorId: userId,
      action: "user.suspend",
      before: { status: "active" },
      after: { status: "suspended" },
      ip: "203.0.113.1",
    });
    expect(e!.occurredAt).toBeInstanceOf(Date);
  });

  it("redacts secret-looking keys recursively", async () => {
    await audit(db, {
      actor: { type: "system" },
      action: "test.redact",
      target: { type: "x" },
      after: { email: "e@x", passwordHash: "$argon2id$abc", nested: { otpCode: "123456", token: "t", ok: 1 }, list: [{ secret: "s" }] },
    });
    const [e] = await listAuditEntries(db, { targetType: "x" });
    expect(e!.after).toEqual({
      email: "e@x",
      passwordHash: REDACTED,
      nested: { otpCode: REDACTED, token: REDACTED, ok: 1 },
      list: [{ secret: REDACTED }],
    });
    expect(JSON.stringify(e)).not.toContain("123456");
  });

  it("changed() keeps only differing fields", () => {
    expect(changed({ a: 1, b: 2, c: "x" }, { a: 1, b: 3, c: "x" })).toEqual({ before: { b: 2 }, after: { b: 3 } });
  });

  it("auditedMutation attributes the row journal and the entry to the same actor in one transaction", async () => {
    await auditedMutation(db, { type: "staff", id: userId }, { action: "user.rename", target: { type: "staff_user", id: userId } }, async (tx) => {
      await tx.update(staffUsers).set({ name: "B" }).where(eq(staffUsers.id, userId));
      return { result: null, ...changed({ name: "A" }, { name: "B" }) };
    });
    const entries = await listAuditEntries(db, { targetId: userId, limit: 10 });
    expect(entries.find((e) => e.action === "user.rename")).toMatchObject({ actorId: userId, before: { name: "A" }, after: { name: "B" } });
  });

  it("auditedMutation rolls back the entry when the mutation throws", async () => {
    await expect(
      auditedMutation(db, { type: "system" }, { action: "test.rollback", target: { type: "y" } }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await listAuditEntries(db, { targetType: "y" })).toHaveLength(0);
  });

  it("entries remain after the actor is revoked and are append-only", async () => {
    await db.update(staffUsers).set({ status: "revoked" }).where(eq(staffUsers.id, userId));
    expect((await listAuditEntries(db, { actorId: userId })).length).toBeGreaterThan(0);
    await expect(db.execute(sql`update audit_entries set action = 'tampered'`)).rejects.toMatchObject({
      cause: { code: "DCA01" },
    });
    expect((await db.select().from(auditEntries).where(eq(auditEntries.action, "tampered"))).length).toBe(0);
  });
});
