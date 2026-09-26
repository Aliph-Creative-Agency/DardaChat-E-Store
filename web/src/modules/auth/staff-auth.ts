import { and, desc, eq, like, ne, isNull, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { generateSecret, generateURI, verify as verifyTotpCode } from "otplib";
import type { DbOrTx } from "../../db/connection";
import { withActor } from "../../db/guards";
import { audit } from "./audit";
import { decryptSecret, dummyVerify, encryptSecret, hashPassword, hashToken, needsRehash, verifyPassword } from "./crypto";
import { normaliseEmail } from "./customer-auth";
import { checkPasswordWithSettings, type PasswordProblem } from "./password-policy";
import { DbRateLimitStore, LIMITS, rateLimit, rateLimitAll } from "./rate-limit";
import { rateLimitHits, sessions, staffUsers, totpSecrets } from "./schema";
import { createSession, markSecondFactor, type Session, type SessionMeta } from "./session";

/**
 * Back-office sign-in + mandatory TOTP second factor (FR-ACC-012, FR-ACC-005, NFR-SEC-004).
 * A password sign-in yields a session with `second_factor_at = null`; guards refuse it until enrolment or the
 * challenge rotates it into a full session. Pure: every function takes `db` and an explicit `now`.
 */

export const TOTP_ISSUER = "DardaChat";
const TOTP_PERIOD_S = 30;
/** ±1 time step (30 s either side) for clock drift. */
const TOTP_TOLERANCE_S = TOTP_PERIOD_S;
export const RECOVERY_CODE_COUNT = 10;
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 symbols, no 0/O/1/I → 50 bits per code

type Meta = SessionMeta & { ip: string };
type RateLimited = { ok: false; error: "rate_limited"; retryAfterMs: number };

export type StaffSignInResult =
  | {
      ok: true;
      token: string;
      staffId: string;
      /** What the pending session must do next: first-time enrolment or the TOTP challenge. */
      next: "enrol" | "challenge";
      mustChangePassword: boolean;
    }
  | { ok: false; error: "invalid_credentials" }
  | RateLimited;

export async function signInStaff(
  db: DbOrTx,
  input: { email: string; password: string },
  meta: Meta,
  now: Date = new Date(),
): Promise<StaffSignInResult> {
  const email = normaliseEmail(input.email);
  if (!email || typeof input.password !== "string" || input.password.length > 1024) {
    return { ok: false, error: "invalid_credentials" };
  }
  const limited = await rateLimitAll(
    new DbRateLimitStore(db),
    [
      { key: `signin:staff:${email}`, ...LIMITS.signInPerIdentity },
      { key: `signin:ip:${meta.ip}`, ...LIMITS.signInPerIp },
    ],
    now,
  );
  if (!limited.ok) return { ok: false, error: "rate_limited", retryAfterMs: limited.retryAfterMs };

  const [u] = await db
    .select()
    .from(staffUsers)
    .where(eq(sql`lower(${staffUsers.email})`, email));
  if (!u) {
    await dummyVerify(input.password);
    return { ok: false, error: "invalid_credentials" };
  }
  const valid = await verifyPassword(u.passwordHash, input.password);
  // suspended / revoked users get the same generic answer (no account-state oracle)
  if (!valid || u.status !== "active") return { ok: false, error: "invalid_credentials" };

  const rehash = needsRehash(u.passwordHash) ? await hashPassword(input.password) : undefined;
  const actor = { type: "staff" as const, id: u.id };
  await withActor(db, actor, async (tx) => {
    await tx
      .update(staffUsers)
      .set({ lastLoginAt: now, ...(rehash ? { passwordHash: rehash } : {}) })
      .where(eq(staffUsers.id, u.id));
    await audit(tx, { actor, action: "auth.staff_sign_in", target: { type: "staff_user", id: u.id }, ip: meta.ip });
  });
  const { token } = await createSession(db, { type: "staff", id: u.id }, meta, now);
  const [t] = await db
    .select({ confirmedAt: totpSecrets.confirmedAt })
    .from(totpSecrets)
    .where(eq(totpSecrets.userId, u.id));
  return {
    ok: true,
    token,
    staffId: u.id,
    next: t?.confirmedAt ? "challenge" : "enrol",
    mustChangePassword: u.mustChangePassword,
  };
}

/** Does this staff user have a confirmed authenticator? */
export async function hasConfirmedTotp(db: DbOrTx, userId: string): Promise<boolean> {
  const [t] = await db
    .select({ confirmedAt: totpSecrets.confirmedAt })
    .from(totpSecrets)
    .where(eq(totpSecrets.userId, userId));
  return t?.confirmedAt != null;
}

// ---------------------------------------------------------------------------------------------------------------
// Enrolment
// ---------------------------------------------------------------------------------------------------------------

export type EnrolmentStart =
  | { ok: true; otpauthUri: string; secret: string; groupedSecret: string }
  | { ok: false; error: "not_staff" | "already_enrolled" };

/** Space-separated groups of four for manual entry (`ABCD EFGH …`). */
export function groupSecret(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? []).join(" ");
}

/**
 * Start (or restart) enrolment for the session's user. Refused once an authenticator is confirmed — otherwise a
 * password-only session could replace the second factor. Resetting 2FA is an Owner action (staff-users.ts).
 */
export async function beginTotpEnrolment(
  db: DbOrTx,
  session: Session,
  now: Date = new Date(),
): Promise<EnrolmentStart> {
  if (session.subjectType !== "staff") return { ok: false, error: "not_staff" };
  const userId = session.subjectId;
  const [u] = await db.select({ email: staffUsers.email }).from(staffUsers).where(eq(staffUsers.id, userId));
  if (!u) return { ok: false, error: "not_staff" };
  if (await hasConfirmedTotp(db, userId)) return { ok: false, error: "already_enrolled" };

  const secret = generateSecret({ length: 20 });
  const secretEncrypted = encryptSecret(secret);
  await db
    .insert(totpSecrets)
    .values({ userId, secretEncrypted, recoveryCodeHashes: [], confirmedAt: null, createdAt: now })
    .onConflictDoUpdate({
      target: totpSecrets.userId,
      set: { secretEncrypted, recoveryCodeHashes: [], confirmedAt: null, createdAt: now },
    });
  const otpauthUri = generateURI({ issuer: TOTP_ISSUER, label: u.email, secret, period: TOTP_PERIOD_S });
  return { ok: true, otpauthUri, secret, groupedSecret: groupSecret(secret) };
}

export type SecondFactorResult =
  | { ok: true; token: string; session: Session; recoveryCodes?: string[]; recoveryCodesLeft?: number }
  | { ok: false; error: "not_staff" | "not_enrolled" | "already_enrolled" | "invalid_code" }
  | RateLimited;

/** Confirm enrolment with a first code → 10 recovery codes (shown once) and a rotated full session. */
export async function confirmTotpEnrolment(
  db: DbOrTx,
  session: Session,
  code: string,
  meta: Meta,
  now: Date = new Date(),
): Promise<SecondFactorResult> {
  if (session.subjectType !== "staff") return { ok: false, error: "not_staff" };
  const userId = session.subjectId;
  const limited = await rateLimit(new DbRateLimitStore(db), { key: `totp:user:${userId}`, ...LIMITS.totpPerUser }, now);
  if (!limited.ok) return { ok: false, error: "rate_limited", retryAfterMs: limited.retryAfterMs };

  return db.transaction(async (tx) => {
    await lockTotp(tx, userId);
    const [t] = await tx.select().from(totpSecrets).where(eq(totpSecrets.userId, userId));
    if (!t) return { ok: false, error: "not_enrolled" } as const;
    if (t.confirmedAt) return { ok: false, error: "already_enrolled" } as const;
    const step = await checkTotp(tx, userId, decryptSecret(t.secretEncrypted), code, now);
    if (step == null) return { ok: false, error: "invalid_code" } as const;

    const recoveryCodes = generateRecoveryCodes();
    const actor = { type: "staff" as const, id: userId };
    await withActor(tx, actor, async (a) => {
      await a
        .update(totpSecrets)
        .set({ confirmedAt: now, recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode) })
        .where(eq(totpSecrets.userId, userId));
      await recordStep(a, userId, step, now);
      await audit(a, { actor, action: "auth.2fa_enrolled", target: { type: "staff_user", id: userId }, ip: meta.ip });
    });
    const rotated = await markSecondFactor(tx, session, meta, now);
    return { ok: true, token: rotated.token, session: rotated.session, recoveryCodes } as const;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Challenge
// ---------------------------------------------------------------------------------------------------------------

/** Accepts a 6-digit TOTP code (±1 step, no reuse of an accepted step) or a single-use recovery code. */
export async function challengeTotp(
  db: DbOrTx,
  session: Session,
  codeOrRecovery: string,
  meta: Meta,
  now: Date = new Date(),
): Promise<SecondFactorResult> {
  if (session.subjectType !== "staff") return { ok: false, error: "not_staff" };
  const userId = session.subjectId;
  const limited = await rateLimit(new DbRateLimitStore(db), { key: `totp:user:${userId}`, ...LIMITS.totpPerUser }, now);
  if (!limited.ok) return { ok: false, error: "rate_limited", retryAfterMs: limited.retryAfterMs };

  const input = String(codeOrRecovery ?? "").trim();
  return db.transaction(async (tx) => {
    await lockTotp(tx, userId);
    const [t] = await tx.select().from(totpSecrets).where(eq(totpSecrets.userId, userId));
    if (!t?.confirmedAt) return { ok: false, error: "not_enrolled" } as const;
    const actor = { type: "staff" as const, id: userId };
    const target = { type: "staff_user", id: userId };

    const digits = input.replace(/\s+/g, "");
    if (/^\d{6}$/.test(digits)) {
      const step = await checkTotp(tx, userId, decryptSecret(t.secretEncrypted), digits, now);
      if (step == null) return { ok: false, error: "invalid_code" } as const;
      await withActor(tx, actor, async (a) => {
        await recordStep(a, userId, step, now);
        await audit(a, { actor, action: "auth.2fa_challenge", target, ip: meta.ip });
      });
      const rotated = await markSecondFactor(tx, session, meta, now);
      return { ok: true, token: rotated.token, session: rotated.session } as const;
    }

    const hash = hashRecoveryCode(input);
    const hashes = t.recoveryCodeHashes ?? [];
    if (!hash || !hashes.includes(hash)) return { ok: false, error: "invalid_code" } as const;
    const left = hashes.filter((h) => h !== hash);
    await withActor(tx, actor, async (a) => {
      await a.update(totpSecrets).set({ recoveryCodeHashes: left }).where(eq(totpSecrets.userId, userId));
      await audit(a, {
        actor,
        action: "auth.2fa_recovery_code_used",
        target,
        after: { recoveryCodesLeft: left.length },
        ip: meta.ip,
      });
    });
    const rotated = await markSecondFactor(tx, session, meta, now);
    return { ok: true, token: rotated.token, session: rotated.session, recoveryCodesLeft: left.length } as const;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Own password
// ---------------------------------------------------------------------------------------------------------------

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: "invalid_credentials" | "not_staff" }
  | { ok: false; error: "weak_password"; problems: PasswordProblem[] }
  | RateLimited;

/**
 * Staff change their own password (FR-ACC-015). Requires the current password; clears `must_change_password`;
 * signs out every OTHER session of the user (the current one stays).
 */
export async function changeOwnPassword(
  db: DbOrTx,
  session: Session,
  input: { currentPassword: string; newPassword: string },
  meta: Meta,
  now: Date = new Date(),
): Promise<ChangePasswordResult> {
  if (session.subjectType !== "staff") return { ok: false, error: "not_staff" };
  const userId = session.subjectId;
  if (typeof input.currentPassword !== "string" || typeof input.newPassword !== "string") {
    return { ok: false, error: "invalid_credentials" };
  }
  const limited = await rateLimit(
    new DbRateLimitStore(db),
    { key: `pwchange:staff:${userId}`, ...LIMITS.signInPerIdentity },
    now,
  );
  if (!limited.ok) return { ok: false, error: "rate_limited", retryAfterMs: limited.retryAfterMs };

  const [u] = await db.select().from(staffUsers).where(eq(staffUsers.id, userId));
  if (!u || u.status !== "active") return { ok: false, error: "not_staff" };
  if (input.currentPassword.length > 1024 || !(await verifyPassword(u.passwordHash, input.currentPassword))) {
    return { ok: false, error: "invalid_credentials" };
  }
  const problems = await checkPasswordWithSettings(db, input.newPassword, {
    kind: "staff",
    identity: [u.email, u.name],
  });
  if (input.newPassword === input.currentPassword && !problems.includes("breached")) problems.push("breached");
  if (problems.length) return { ok: false, error: "weak_password", problems };

  const passwordHash = await hashPassword(input.newPassword);
  const actor = { type: "staff" as const, id: userId };
  await withActor(db, actor, async (tx) => {
    await tx.update(staffUsers).set({ passwordHash, mustChangePassword: false }).where(eq(staffUsers.id, userId));
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.subjectType, "staff"),
          eq(sessions.subjectId, userId),
          ne(sessions.id, session.id),
          isNull(sessions.revokedAt),
        ),
      );
    await audit(tx, {
      actor,
      action: "auth.password_changed",
      target: { type: "staff_user", id: userId },
      before: { mustChangePassword: u.mustChangePassword },
      after: { mustChangePassword: false },
      ip: meta.ip,
    });
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------------------------------------------

async function lockTotp(tx: DbOrTx, userId: string): Promise<void> {
  // serialise concurrent submissions for one user so the same code cannot win twice
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`totp:lock:${userId}`}))`);
}

const stepKeyPrefix = (userId: string) => `totp:step:${userId}:`;

/** Returns the accepted time step, or null. Rejects any step ≤ the last accepted one (replay protection). */
async function checkTotp(db: DbOrTx, userId: string, secret: string, code: string, now: Date): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const [last] = await db
    .select({ key: rateLimitHits.key })
    .from(rateLimitHits)
    .where(like(rateLimitHits.key, `${stepKeyPrefix(userId)}%`))
    .orderBy(desc(rateLimitHits.hitAt))
    .limit(1);
  const lastStep = last ? Number(last.key.slice(stepKeyPrefix(userId).length)) : undefined;
  try {
    const r = await verifyTotpCode({
      secret,
      token: code,
      period: TOTP_PERIOD_S,
      epoch: Math.floor(now.getTime() / 1000),
      epochTolerance: TOTP_TOLERANCE_S,
      ...(lastStep != null && Number.isFinite(lastStep) ? { afterTimeStep: lastStep } : {}),
    });
    return r.valid && "timeStep" in r ? r.timeStep : null;
  } catch {
    return null;
  }
}

async function recordStep(db: DbOrTx, userId: string, step: number, now: Date): Promise<void> {
  await db.insert(rateLimitHits).values({ key: `${stepKeyPrefix(userId)}${step}`, hitAt: now });
}

export function generateRecoveryCodes(n = RECOVERY_CODE_COUNT): string[] {
  const one = () => Array.from({ length: 10 }, () => RECOVERY_ALPHABET[randomInt(0, RECOVERY_ALPHABET.length)]).join("");
  const codes = new Set<string>();
  while (codes.size < n) {
    const c = one();
    codes.add(`${c.slice(0, 5)}-${c.slice(5)}`);
  }
  return [...codes];
}

/** Case-, space- and dash-insensitive. Empty string for input that cannot be a recovery code. */
export function hashRecoveryCode(input: string): string {
  const norm = String(input ?? "")
    .toUpperCase()
    .replace(/[\s-]+/g, "");
  if (norm.length !== 10 || ![...norm].every((ch) => RECOVERY_ALPHABET.includes(ch))) return "";
  return hashToken(`recovery:${norm}`);
}
