import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";
import { withActor } from "../../db/guards";
import { customers } from "../engagement/schema";
import { audit } from "./audit";
import { getAppUrl, TTL } from "./config";
import { hashPassword, hashToken, randomToken } from "./crypto";
import { normaliseEmail } from "./customer-auth";
import type { Locale } from "./guards";
import type { ResetLinkDelivery } from "./otp-delivery";
import { checkPasswordWithSettings, type PasswordProblem } from "./password-policy";
import { DbRateLimitStore, LIMITS, rateLimitAll } from "./rate-limit";
import { passwordResetTokens, staffUsers } from "./schema";
import { revokeAllSessions, type SubjectType } from "./session";

/**
 * Password reset for customers and staff (FR-ACC-006, FR-ACC-015, NFR-SEC-004). The request answers the same way
 * whether or not the email is known; only the SHA-256 of the 32-byte token is stored; 60 min; single use; a reset
 * signs the subject out everywhere.
 */

export type ResetRequestResult = { ok: true } | { ok: false; error: "rate_limited"; retryAfterMs: number };

export type ResetResult =
  | { ok: true; subjectType: SubjectType; subjectId: string }
  | { ok: false; error: "invalid_token" }
  | { ok: false; error: "weak_password"; problems: PasswordProblem[] };

type Subject = { id: string; email: string; name: string | null; locale: Locale; active: boolean };

async function findSubjectByEmail(db: DbOrTx, type: SubjectType, email: string): Promise<Subject | null> {
  if (type === "staff") {
    const [u] = await db
      .select({
        id: staffUsers.id,
        email: staffUsers.email,
        name: staffUsers.name,
        locale: staffUsers.locale,
        status: staffUsers.status,
      })
      .from(staffUsers)
      .where(eq(sql`lower(${staffUsers.email})`, email));
    return u ? { ...u, active: u.status === "active" } : null;
  }
  const [c] = await db
    .select({
      id: customers.id,
      email: customers.email,
      name: customers.name,
      locale: customers.locale,
      status: customers.status,
    })
    .from(customers)
    .where(eq(sql`lower(${customers.email})`, email));
  return c?.email ? { ...c, email: c.email, active: c.status === "active" } : null;
}

async function findSubjectById(db: DbOrTx, type: SubjectType, id: string): Promise<Subject | null> {
  if (type === "staff") {
    const [u] = await db.select().from(staffUsers).where(eq(staffUsers.id, id));
    return u ? { id: u.id, email: u.email, name: u.name, locale: u.locale, active: u.status === "active" } : null;
  }
  const [c] = await db.select().from(customers).where(eq(customers.id, id));
  return c ? { id: c.id, email: c.email ?? "", name: c.name, locale: c.locale, active: c.status === "active" } : null;
}

export function resetUrl(type: SubjectType, locale: Locale, token: string): string {
  const path = type === "staff" ? "staff/reset-password" : "reset-password";
  return `${getAppUrl()}/${locale}/${path}?token=${encodeURIComponent(token)}`;
}

export async function requestPasswordReset(
  db: DbOrTx,
  emailInput: string,
  subjectType: SubjectType,
  meta: { ip: string },
  deps: { delivery: ResetLinkDelivery },
  now: Date = new Date(),
): Promise<ResetRequestResult> {
  const email = normaliseEmail(emailInput);
  const limited = await rateLimitAll(
    new DbRateLimitStore(db),
    [
      { key: `reset:${subjectType}:${email ?? "invalid"}`, ...LIMITS.resetPerIdentity },
      { key: `reset:ip:${meta.ip}`, ...LIMITS.resetPerIp },
    ],
    now,
  );
  if (!limited.ok) return { ok: false, error: "rate_limited", retryAfterMs: limited.retryAfterMs };
  if (!email) return { ok: true };

  const subject = await findSubjectByEmail(db, subjectType, email);
  if (!subject || !subject.active) return { ok: true };

  // Older unused tokens for this subject stop working.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.subjectType, subjectType),
        eq(passwordResetTokens.subjectId, subject.id),
        isNull(passwordResetTokens.usedAt),
      ),
    );
  const token = randomToken();
  await db.insert(passwordResetTokens).values({
    subjectType,
    subjectId: subject.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + TTL.resetTokenMs),
    createdAt: now,
  });
  await deps.delivery.sendResetLink({
    to: subject.email,
    locale: subject.locale,
    url: resetUrl(subjectType, subject.locale, token),
    subjectType,
  });
  return { ok: true };
}

/** Looks a token up without consuming it (the reset page uses it to show "link expired" early). */
export async function peekResetToken(
  db: DbOrTx,
  token: string,
  now: Date = new Date(),
): Promise<{ subjectType: SubjectType; subjectId: string } | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    );
  return row ? { subjectType: row.subjectType, subjectId: row.subjectId } : null;
}

export async function resetPassword(
  db: DbOrTx,
  token: string,
  newPassword: string,
  meta: { ip?: string } = {},
  now: Date = new Date(),
): Promise<ResetResult> {
  const found = await peekResetToken(db, token, now);
  if (!found || typeof newPassword !== "string") return { ok: false, error: "invalid_token" };
  const subject = await findSubjectById(db, found.subjectType, found.subjectId);
  if (!subject || !subject.active) return { ok: false, error: "invalid_token" };

  const problems = await checkPasswordWithSettings(db, newPassword, {
    kind: found.subjectType,
    identity: [subject.email, subject.name],
  });
  if (problems.length) return { ok: false, error: "weak_password", problems };
  const passwordHash = await hashPassword(newPassword);

  const actor = { type: found.subjectType, id: subject.id } as const;
  const done = await withActor(db, actor, async (tx) => {
    const used = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.tokenHash, hashToken(token)), isNull(passwordResetTokens.usedAt)))
      .returning({ id: passwordResetTokens.id });
    if (!used.length) return false; // lost a race with a concurrent use
    if (found.subjectType === "staff") {
      await tx
        .update(staffUsers)
        .set({ passwordHash, mustChangePassword: false, updatedAt: now })
        .where(eq(staffUsers.id, subject.id));
      await audit(tx, {
        actor,
        action: "auth.password_reset",
        target: { type: "staff_user", id: subject.id },
        ip: meta.ip,
      });
    } else {
      // The link proved the mailbox: a guest record with this email becomes a full account.
      await tx
        .update(customers)
        .set({
          passwordHash,
          isGuest: false,
          emailVerifiedAt: sql`coalesce(${customers.emailVerifiedAt}, ${now.toISOString()}::timestamptz)`,
        })
        .where(eq(customers.id, subject.id));
    }
    await revokeAllSessions(tx, found.subjectType, subject.id, now);
    return true;
  });
  return done
    ? { ok: true, subjectType: found.subjectType, subjectId: subject.id }
    : { ok: false, error: "invalid_token" };
}
