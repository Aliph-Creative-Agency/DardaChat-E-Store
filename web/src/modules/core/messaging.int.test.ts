import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { deadLetters, messages } from "../../db/schema";
import { createTestDb } from "../../db/test-utils";
import { setFault } from "../../lib/faults";
import { dispatchDueMessages, sendMessage } from "./messaging";

const { db, close } = createTestDb();
const ctx = { db };
const phone = "+970599000111";

afterAll(close);
afterEach(async () => {
  for (const s of ["whatsapp", "sms", "email"] as const) await setFault(s, null, ctx);
});

const rowsFor = (eventKey: string) => db.select().from(messages).where(eq(messages.eventKey, eventKey)).orderBy(messages.createdAt);

describe("sendMessage", () => {
  it("all up → whatsapp sent", async () => {
    const res = await sendMessage(
      { channels: ["whatsapp", "sms"], to: { phone }, eventKey: "test.up", locale: "ar", text: "رمز التحقق 123456" },
      ctx,
    );
    expect(res).toMatchObject({ channel: "whatsapp", status: "sent" });
    const rows = await rowsFor("test.up");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.providerRef).toMatch(/^mock-whatsapp-/);
    expect(rows[0]?.sentAt).toBeInstanceOf(Date);
    expect((rows[0]?.payload as { text: string }).text).toBe("رمز التحقق 123456");
  });

  it("whatsapp down → sms sent, whatsapp row failed", async () => {
    await setFault("whatsapp", "down", ctx);
    const res = await sendMessage(
      { channels: ["whatsapp", "sms"], to: { phone }, eventKey: "test.fallback", locale: "en", text: "hello" },
      ctx,
    );
    expect(res).toMatchObject({ channel: "sms", status: "sent" });
    const rows = await rowsFor("test.fallback");
    expect(rows.map((r) => [r.channel, r.status])).toEqual([
      ["whatsapp", "failed"],
      ["sms", "sent"],
    ]);

    // Once whatsapp is back, the dispatcher retires the failed sibling instead of sending a duplicate.
    await setFault("whatsapp", null, ctx);
    await dispatchDueMessages({}, { db, now: new Date(Date.now() + 86_400_000) });
    const after = await rowsFor("test.fallback");
    expect(after.find((r) => r.channel === "whatsapp")?.status).toBe("dead");
    expect(after.find((r) => r.channel === "whatsapp")?.error).toMatch(/superseded/);
  });

  it("all down → failed; 5 dispatch runs → dead + 1 dead letter", async () => {
    await setFault("email", "down", ctx);
    const res = await sendMessage(
      { channels: ["email"], to: { email: "a@example.com" }, eventKey: "test.alldown", locale: "en", text: "x", subject: "s" },
      ctx,
    );
    expect(res.status).toBe("failed");
    let at = Date.now();
    for (let i = 0; i < 5; i++) {
      at += 86_400_000;
      await dispatchDueMessages({ maxAttempts: 5 }, { db, now: new Date(at) });
    }
    const [row] = await rowsFor("test.alldown");
    expect(row?.status).toBe("dead");
    expect(row?.attempts).toBe(5);
    const dl = await db.select().from(deadLetters).where(and(eq(deadLetters.source, "email.send"), eq(deadLetters.reference, row!.id)));
    expect(dl).toHaveLength(1);
  });

  it("duplicate dedupeKey returns the same message", async () => {
    const input = {
      channels: ["sms" as const],
      to: { phone },
      eventKey: "test.dedupe",
      locale: "ar" as const,
      text: "x",
      dedupeKey: `test.dedupe:${Date.now()}`,
    };
    const a = await sendMessage(input, ctx);
    const b = await sendMessage(input, ctx);
    expect(b.messageId).toBe(a.messageId);
    expect(await rowsFor("test.dedupe")).toHaveLength(1);
  });

  it("invalid phone → permanent failure, no retries, dead letter", async () => {
    const res = await sendMessage({ channels: ["sms"], to: { phone: "0599" }, eventKey: "test.invalid", locale: "ar", text: "x" }, ctx);
    expect(res.status).toBe("failed");
    const [row] = await rowsFor("test.invalid");
    expect(row?.status).toBe("dead");
    expect(row?.attempts).toBe(1);
    expect(row?.error).toMatch(/after 1 attempt/);
  });

  it("rejects a request with no usable address", async () => {
    await expect(
      sendMessage({ channels: ["email"], to: { phone }, eventKey: "test.noaddr", locale: "ar", text: "x" }, ctx),
    ).rejects.toMatchObject({ code: "invalid_input" });
  });
});
