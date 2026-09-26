import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { DbOrTx } from "../../db/connection";
import { withActor } from "../../db/guards";
import { normalizePhone } from "../../lib/phone";
import { customers } from "../engagement/schema";
import { dummyVerify, hashPassword, needsRehash, verifyPassword } from "./crypto";
import type { Locale } from "./guards";
import { issueOtp, verifyOtp } from "./otp";
import type { OtpDelivery } from "./otp-delivery";
import { checkPasswordWithSettings, type PasswordProblem } from "./password-policy";
import { DbRateLimitStore, LIMITS, rateLimitAll } from "./rate-limit";
import { createSession, revokeSessionByToken, type SessionMeta } from "./session";

/**
 * Customer email + password (FR-ACC-001, FR-ACC-005, NFR-SEC-004). Auth writes only the identity columns of
 * `customers` (email, phone_e_164, password_hash, *_verified_at, last_login_at, status); the rest is ENGAGEMENT's.
 * Errors are generic so responses never reveal whether an email is registered (except `email_taken` on sign-up,
 * which the form needs; it is rate-limited like sign-in).
 */

export type AuthFailure =
  | { ok: false; error: "invalid_input"; fields?: string[] }
  | { ok: false; error: "weak_password"; problems: PasswordProblem[] }
  | { ok: false; error: "email_taken" }
  | { ok: false; error: "invalid_credentials" }
  | { ok: false; error: "rate_limited"; retryAfterMs: number };

export type SignedIn = { ok: true; token: string; customerId: string };

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export function normaliseEmail(input: unknown): string | null {
  const r = emailSchema.safeParse(input);
  return r.success ? r.data : null;
}

type Meta = SessionMeta & { ip: string };

export async function registerCustomer(
  db: DbOrTx,
  input: {
    email: string;
    password: string;
    name?: string | null;
    locale?: Locale;
  },
  meta: Meta,
  now: Date = new Date(),
): Promise<SignedIn | AuthFailure> {
  const email = normaliseEmail(input.email);
  if (!email || typeof input.password !== "string") {
    return {
      ok: false,
      error: "invalid_input",
      fields: [...(email ? [] : ["email"]), ...(typeof input.password === "string" ? [] : ["password"])],
    };
  }
  const limited = await rateLimitAll(
    new DbRateLimitStore(db),
    [
      { key: `signup:email:${email}`, ...LIMITS.signInPerIdentity },
      { key: `signin:ip:${meta.ip}`, ...LIMITS.signInPerIp },
    ],
    now,
  );
  if (!limited.ok)
    return {
      ok: false,
      error: "rate_limited",
      retryAfterMs: limited.retryAfterMs,
    };

  const name = input.name?.trim().slice(0, 120) || null;
  const problems = await checkPasswordWithSettings(db, input.password, {
    kind: "customer",
    identity: [email, name],
  });
  if (problems.length) return { ok: false, error: "weak_password", problems };

  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(sql`lower(${customers.email})`, email));
  // A guest/phone customer with this email claims the account through "forgot password" (proves the mailbox).
  if (existing) return { ok: false, error: "email_taken" };

  const passwordHash = await hashPassword(input.password);
  const inserted = await db
    .insert(customers)
    .values({
      email,
      passwordHash,
      name,
      locale: input.locale ?? "ar",
      lastLoginAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: customers.id });
  if (!inserted[0]) return { ok: false, error: "email_taken" };
  const { token } = await createSession(db, { type: "customer", id: inserted[0].id }, meta, now);
  return { ok: true, token, customerId: inserted[0].id };
}

export async function signInCustomer(
  db: DbOrTx,
  input: { email: string; password: string },
  meta: Meta,
  now: Date = new Date(),
): Promise<SignedIn | AuthFailure> {
  const email = normaliseEmail(input.email);
  if (!email || typeof input.password !== "string" || input.password.length > 1024) {
    return { ok: false, error: "invalid_credentials" };
  }
  const limited = await rateLimitAll(
    new DbRateLimitStore(db),
    [
      { key: `signin:customer:${email}`, ...LIMITS.signInPerIdentity },
      { key: `signin:ip:${meta.ip}`, ...LIMITS.signInPerIp },
    ],
    now,
  );
  if (!limited.ok)
    return {
      ok: false,
      error: "rate_limited",
      retryAfterMs: limited.retryAfterMs,
    };

  const [c] = await db
    .select({
      id: customers.id,
      passwordHash: customers.passwordHash,
      status: customers.status,
    })
    .from(customers)
    .where(eq(sql`lower(${customers.email})`, email));
  if (!c?.passwordHash) {
    await dummyVerify(input.password);
    return { ok: false, error: "invalid_credentials" };
  }
  const valid = await verifyPassword(c.passwordHash, input.password);
  if (!valid || c.status !== "active") return { ok: false, error: "invalid_credentials" };

  const rehash = needsRehash(c.passwordHash) ? await hashPassword(input.password) : undefined;
  await withActor(db, { type: "customer", id: c.id }, (tx) =>
    tx
      .update(customers)
      .set({ lastLoginAt: now, ...(rehash ? { passwordHash: rehash } : {}) })
      .where(eq(customers.id, c.id)),
  );
  const { token } = await createSession(db, { type: "customer", id: c.id }, meta, now);
  return { ok: true, token, customerId: c.id };
}

export async function signOut(db: DbOrTx, token: string | null | undefined, now: Date = new Date()): Promise<void> {
  if (token) await revokeSessionByToken(db, token, now);
}

// ---------------------------------------------------------------------------------------------------------------
// Phone + OTP sign-in (FR-ACC-002, CON-05). The first successful verification creates the account (no password).
// ---------------------------------------------------------------------------------------------------------------

export type PhoneRequestResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; error: "invalid_phone" }
  | { ok: false; error: "rate_limited"; retryAfterMs: number }
  | { ok: false; error: "delivery_failed" };

export type PhoneVerifyResult =
  SignedIn | { ok: false; error: "invalid_phone" | "invalid_code" | "expired" | "locked" | "account_disabled" };

/** Same response whether or not an account exists for the number (the code is what proves ownership). */
export async function requestPhoneSignIn(
  db: DbOrTx,
  phoneInput: string,
  meta: Meta & { locale?: Locale },
  deps: { delivery: OtpDelivery },
  now: Date = new Date(),
): Promise<PhoneRequestResult> {
  const phone = normalizePhone(phoneInput);
  if (!phone.ok) return { ok: false, error: "invalid_phone" };
  const r = await issueOtp(
    db,
    { target: { phoneE164: phone.e164 }, purpose: "login", locale: meta.locale ?? "ar", ip: meta.ip },
    deps,
    now,
  );
  return r.ok ? { ok: true, expiresAt: r.expiresAt } : r;
}

export async function verifyPhoneSignIn(
  db: DbOrTx,
  phoneInput: string,
  code: string,
  meta: Meta & { locale?: Locale },
  now: Date = new Date(),
): Promise<PhoneVerifyResult> {
  const phone = normalizePhone(phoneInput);
  if (!phone.ok) return { ok: false, error: "invalid_phone" };
  const v = await verifyOtp(db, { target: { phoneE164: phone.e164 }, purpose: "login", code }, now);
  if (!v.ok) return v;

  const find = () =>
    db
      .select({ id: customers.id, status: customers.status, phoneVerifiedAt: customers.phoneVerifiedAt })
      .from(customers)
      .where(eq(customers.phoneE164, phone.e164));
  let [c] = await find();
  if (!c) {
    await db
      .insert(customers)
      .values({ phoneE164: phone.e164, phoneVerifiedAt: now, locale: meta.locale ?? "ar", lastLoginAt: now })
      .onConflictDoNothing();
    [c] = await find();
    if (!c) return { ok: false, error: "invalid_code" };
  }
  if (c.status !== "active") return { ok: false, error: "account_disabled" };
  const id = c.id;
  await withActor(db, { type: "customer", id }, (tx) =>
    tx
      .update(customers)
      .set({ lastLoginAt: now, isGuest: false, ...(c.phoneVerifiedAt ? {} : { phoneVerifiedAt: now }) })
      .where(eq(customers.id, id)),
  );
  const { token } = await createSession(db, { type: "customer", id }, meta, now);
  return { ok: true, token, customerId: id };
}
