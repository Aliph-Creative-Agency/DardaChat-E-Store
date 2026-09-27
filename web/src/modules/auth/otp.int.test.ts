import { and, desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, truncateAll } from "../../db/test-utils";
import { settings } from "../core/schema";
import { messages } from "../engagement/schema";
import { issueOtp, verifyOtp } from "./otp";
import { OTP_WHATSAPP_SETTING, outboxOtpDelivery, type OtpDelivery } from "./otp-delivery";
import { otpCodes, rateLimitHits } from "./schema";
import { AUTH_SETTINGS } from "./seed";

const { db, close } = createTestDb();
const delivery = outboxOtpDelivery(db);
const PHONE = "+970591234567";
const T0 = new Date("2026-09-27T08:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);

async function lastMessage(to: string) {
  const [m] = await db.select().from(messages).where(eq(messages.to, to)).orderBy(desc(messages.createdAt)).limit(1);
  return m!;
}
async function lastCode(to: string): Promise<string> {
  return ((await lastMessage(to)).payload as { code: string }).code;
}
const issue = (phone: string, now: Date, ip = "203.0.113.1", d: OtpDelivery = delivery) =>
  issueOtp(db, { target: { phoneE164: phone }, purpose: "login", locale: "ar", ip }, { delivery: d }, now);

beforeAll(async () => {
  await truncateAll(db);
  await db.insert(settings).values(Object.entries(AUTH_SETTINGS).map(([key, value]) => ({ key, value })));
});
// truncateAll is slow (~20 s); per test only the tables this service touches are cleared.
beforeEach(async () => {
  await db.delete(otpCodes);
  await db.delete(messages);
  await db.delete(rateLimitHits);
  await db.update(settings).set({ value: true }).where(eq(settings.key, OTP_WHATSAPP_SETTING));
});
afterAll(() => close());

describe("OTP service", () => {
  it("issues via WhatsApp by default, stores only an HMAC, bilingual text in the outbox", async () => {
    const r = await issue(PHONE, T0);
    expect(r).toMatchObject({ ok: true, channel: "whatsapp" });
    const m = await lastMessage(PHONE);
    expect(m).toMatchObject({ channel: "whatsapp", eventKey: "auth.otp", locale: "ar" });
    const code = await lastCode(PHONE);
    expect(code).toMatch(/^\d{6}$/);
    expect((m.payload as { text: string }).text).toContain(code);
    const [row] = await db.select().from(otpCodes);
    expect(row!.codeHash).not.toContain(code);
    expect(row!.channel).toBe("whatsapp");
  });

  it("valid at 4:59, expired at 5:00", async () => {
    await issue(PHONE, T0);
    const code = await lastCode(PHONE);
    expect(await verifyOtp(db, { target: { phoneE164: PHONE }, purpose: "login", code }, at(5 * 60_000))).toEqual({
      ok: false,
      error: "expired",
    });
    expect(
      await verifyOtp(db, { target: { phoneE164: PHONE }, purpose: "login", code }, at(4 * 60_000 + 59_000)),
    ).toEqual({
      ok: true,
    });
  });

  it("single use: the second verification fails", async () => {
    await issue(PHONE, T0);
    const code = await lastCode(PHONE);
    const v = () => verifyOtp(db, { target: { phoneE164: PHONE }, purpose: "login", code }, at(1000));
    expect(await v()).toEqual({ ok: true });
    expect(await v()).toEqual({ ok: false, error: "invalid_code" });
  });

  it("accepts Arabic-Indic digits; a code for another purpose does not verify", async () => {
    await issue(PHONE, T0);
    const code = await lastCode(PHONE);
    expect(
      await verifyOtp(db, { target: { phoneE164: PHONE }, purpose: "verify_phone", code }, at(1000)),
    ).toMatchObject({
      ok: false,
    });
    const arabic = code.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
    expect(await verifyOtp(db, { target: { phoneE164: PHONE }, purpose: "login", code: arabic }, at(1000))).toEqual({
      ok: true,
    });
  });

  it("five wrong codes lock it; the right code then fails too", async () => {
    await issue(PHONE, T0);
    const code = await lastCode(PHONE);
    const wrong = code === "000000" ? "111111" : "000000";
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(
        (await verifyOtp(db, { target: { phoneE164: PHONE }, purpose: "login", code: wrong }, at(1000))) as {
          error?: string;
        },
      );
    }
    expect(results.map((r) => r.error)).toEqual([
      "invalid_code",
      "invalid_code",
      "invalid_code",
      "invalid_code",
      "locked",
    ]);
    expect(await verifyOtp(db, { target: { phoneE164: PHONE }, purpose: "login", code }, at(2000))).toEqual({
      ok: false,
      error: "locked",
    });
  });

  it("a new code supersedes the previous one", async () => {
    await issue(PHONE, T0);
    const first = await lastCode(PHONE);
    await issue(PHONE, at(1000));
    const second = await lastCode(PHONE);
    if (first !== second) {
      expect(
        await verifyOtp(db, { target: { phoneE164: PHONE }, purpose: "login", code: first }, at(2000)),
      ).toMatchObject({ ok: false });
    }
    expect(await verifyOtp(db, { target: { phoneE164: PHONE }, purpose: "login", code: second }, at(2000))).toEqual({
      ok: true,
    });
  });

  it("the 11th request for one number within an hour is refused; allowed again after the window", async () => {
    for (let i = 0; i < 10; i++) expect((await issue(PHONE, at(i * 1000), `198.51.100.${i}`)).ok).toBe(true);
    expect(await issue(PHONE, at(11_000), "198.51.100.99")).toMatchObject({ ok: false, error: "rate_limited" });
    expect((await issue(PHONE, at(60 * 60_000 + 1000), "198.51.100.99")).ok).toBe(true);
  });

  it("the 11th request from one IP across different numbers is refused", async () => {
    for (let i = 0; i < 10; i++) expect((await issue(`+97059123450${i}`, at(i * 1000))).ok).toBe(true);
    expect(await issue("+970591234599", at(11_000))).toMatchObject({ ok: false, error: "rate_limited" });
  });

  it("WhatsApp disabled → SMS", async () => {
    await db.update(settings).set({ value: false }).where(eq(settings.key, OTP_WHATSAPP_SETTING));
    expect(await issue(PHONE, T0)).toMatchObject({ ok: true, channel: "sms" });
    expect((await lastMessage(PHONE)).channel).toBe("sms");
    const [row] = await db.select().from(otpCodes);
    expect(row!.channel).toBe("sms");
  });

  it("WhatsApp send throws → SMS", async () => {
    const flaky: OtpDelivery = {
      async send(m) {
        if (m.channel === "whatsapp") throw new Error("provider down");
        return delivery.send(m);
      },
    };
    expect(await issue(PHONE, T0, "203.0.113.1", flaky)).toMatchObject({ ok: true, channel: "sms" });
    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.to, PHONE)));
    expect(rows.map((r) => r.channel)).toEqual(["sms"]);
  });

  it("email target → email channel (lower-cased)", async () => {
    const r = await issueOtp(
      db,
      { target: { email: "Mona@Example.PS" }, purpose: "verify_email", locale: "en", ip: "203.0.113.1" },
      { delivery },
      T0,
    );
    expect(r).toMatchObject({ ok: true, channel: "email" });
    const code = await lastCode("mona@example.ps");
    expect((await lastMessage("mona@example.ps")).payload).toMatchObject({ purpose: "verify_email" });
    expect(
      await verifyOtp(db, { target: { email: "mona@example.ps" }, purpose: "verify_email", code }, at(1000)),
    ).toEqual({ ok: true });
  });
});
