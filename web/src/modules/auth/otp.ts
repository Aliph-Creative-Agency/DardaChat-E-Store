import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";
import { toLatinDigits } from "../../lib/phone";
import { OTP_MAX_ATTEMPTS, TTL } from "./config";
import { generateOtpCode, hashOtp, safeEqual } from "./crypto";
import type { Locale } from "./guards";
import { deliverOtp, type OtpChannel, type OtpDelivery, type OtpPurpose } from "./otp-delivery";
import { DbRateLimitStore, LIMITS, rateLimitAll } from "./rate-limit";
import { otpCodes } from "./schema";

/**
 * One-time codes (FR-ACC-002..004, NFR-SEC-007): 6 digits, 5-minute expiry, single use, at most 5 attempts,
 * 10 requests/hour per target and per IP. Only an HMAC of the code (bound to target + purpose) is stored.
 */

export type OtpTarget = { phoneE164: string } | { email: string };

export type IssueOtpResult =
  | { ok: true; channel: OtpChannel; expiresAt: Date }
  | { ok: false; error: "rate_limited"; retryAfterMs: number }
  | { ok: false; error: "delivery_failed" };

export type VerifyOtpResult = { ok: true } | { ok: false; error: "invalid_code" | "expired" | "locked" };

function targetOf(t: OtpTarget): { kind: "phone" | "email"; value: string } {
  return "phoneE164" in t ? { kind: "phone", value: t.phoneE164 } : { kind: "email", value: t.email.trim().toLowerCase() };
}

function targetKey(t: OtpTarget, purpose: OtpPurpose): string {
  const { kind, value } = targetOf(t);
  return `${purpose}:${kind}:${value}`;
}

function targetWhere(t: OtpTarget) {
  const { kind, value } = targetOf(t);
  return kind === "phone" ? eq(otpCodes.phoneE164, value) : eq(otpCodes.email, value);
}

export async function issueOtp(
  db: DbOrTx,
  input: { target: OtpTarget; purpose: OtpPurpose; locale: Locale; ip: string },
  deps: { delivery: OtpDelivery },
  now: Date = new Date(),
): Promise<IssueOtpResult> {
  const { kind, value } = targetOf(input.target);
  const limited = await rateLimitAll(
    new DbRateLimitStore(db),
    [
      { key: `otp:${kind}:${value}`, ...LIMITS.otpPerTarget },
      { key: `otp:ip:${input.ip}`, ...LIMITS.otpPerIp },
    ],
    now,
  );
  if (!limited.ok) return { ok: false, error: "rate_limited", retryAfterMs: limited.retryAfterMs };

  const code = generateOtpCode();
  let channel: OtpChannel;
  try {
    channel = await deliverOtp(db, deps.delivery, { kind, to: value, locale: input.locale, code, purpose: input.purpose });
  } catch {
    return { ok: false, error: "delivery_failed" };
  }

  // A new code supersedes every older unconsumed one for the same target + purpose.
  await db
    .update(otpCodes)
    .set({ consumedAt: now })
    .where(and(targetWhere(input.target), eq(otpCodes.purpose, input.purpose), isNull(otpCodes.consumedAt)));
  const expiresAt = new Date(now.getTime() + TTL.otpMs);
  await db.insert(otpCodes).values({
    ...(kind === "phone" ? { phoneE164: value } : { email: value }),
    codeHash: hashOtp(code, targetKey(input.target, input.purpose)),
    purpose: input.purpose,
    channel,
    expiresAt,
    ip: input.ip,
    createdAt: now,
  });
  return { ok: true, channel, expiresAt };
}

export async function verifyOtp(
  db: DbOrTx,
  input: { target: OtpTarget; purpose: OtpPurpose; code: string },
  now: Date = new Date(),
): Promise<VerifyOtpResult> {
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(targetWhere(input.target), eq(otpCodes.purpose, input.purpose), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!row) return { ok: false, error: "invalid_code" };
  if (row.expiresAt.getTime() <= now.getTime()) return { ok: false, error: "expired" };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "locked" };

  const code = toLatinDigits(String(input.code ?? "")).replace(/[\s-]+/g, "");
  const match = /^\d{6}$/.test(code) && safeEqual(hashOtp(code, targetKey(input.target, input.purpose)), row.codeHash);
  if (!match) {
    const [after] = await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(and(eq(otpCodes.id, row.id), lt(otpCodes.attempts, OTP_MAX_ATTEMPTS)))
      .returning({ attempts: otpCodes.attempts });
    return { ok: false, error: !after || after.attempts >= OTP_MAX_ATTEMPTS ? "locked" : "invalid_code" };
  }
  // Single use, also under concurrency: only one caller flips consumed_at.
  const consumed = await db
    .update(otpCodes)
    .set({ consumedAt: now })
    .where(and(eq(otpCodes.id, row.id), isNull(otpCodes.consumedAt), lt(otpCodes.attempts, OTP_MAX_ATTEMPTS)))
    .returning({ id: otpCodes.id });
  return consumed.length ? { ok: true } : { ok: false, error: "invalid_code" };
}
