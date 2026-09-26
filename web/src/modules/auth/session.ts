import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";
import { customers } from "../engagement/schema";
import { COOKIE_NAMES, cookieSecure, TTL } from "./config";
import { hashToken, randomToken } from "./crypto";
import { sessions, staffUsers } from "./schema";

/**
 * DB-backed sessions (NFR-SCL-003, NFR-SEC-010, FR-ACC-012..014). The cookie carries a random token; only its
 * SHA-256 is stored. Pure: every function takes `db` and an explicit `now` so tests use a fake clock.
 */

export type SubjectType = "customer" | "staff";
export type Session = typeof sessions.$inferSelect;
export interface SessionMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export function ttlFor(subjectType: SubjectType): { idleMs: number; absoluteMs: number } {
  return subjectType === "staff"
    ? { idleMs: TTL.staffIdleMs, absoluteMs: TTL.staffAbsoluteMs }
    : { idleMs: TTL.customerIdleMs, absoluteMs: TTL.customerAbsoluteMs };
}

export async function createSession(
  db: DbOrTx,
  subject: { type: SubjectType; id: string },
  meta: SessionMeta = {},
  now: Date = new Date(),
  extra: { secondFactorAt?: Date | null; rotatedFrom?: string | null; expiresAt?: Date } = {},
): Promise<{ token: string; session: Session }> {
  const token = randomToken();
  const [session] = await db
    .insert(sessions)
    .values({
      tokenHash: hashToken(token),
      subjectType: subject.type,
      subjectId: subject.id,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: extra.expiresAt ?? new Date(now.getTime() + ttlFor(subject.type).absoluteMs),
      secondFactorAt: extra.secondFactorAt ?? null,
      rotatedFrom: extra.rotatedFrom ?? null,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
    })
    .returning();
  return { token, session: session! };
}

/** Is the subject still allowed to hold a session? (staff `active`, customer `active`). */
export async function subjectIsActive(db: DbOrTx, type: SubjectType, id: string): Promise<boolean> {
  if (type === "staff") {
    const [u] = await db.select({ status: staffUsers.status }).from(staffUsers).where(eq(staffUsers.id, id));
    return u?.status === "active";
  }
  const [c] = await db.select({ status: customers.status }).from(customers).where(eq(customers.id, id));
  return c?.status === "active";
}

/**
 * Returns the live session for `token` or null. Rejects: unknown, other subject type, revoked, past absolute
 * expiry, idle longer than the limit, subject no longer active. Touches `last_seen_at` at most once a minute.
 */
export async function validateSession(
  db: DbOrTx,
  token: string | null | undefined,
  subjectType: SubjectType,
  now: Date = new Date(),
): Promise<Session | null> {
  if (!token || token.length > 200) return null;
  const [s] = await db.select().from(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  if (!s || s.subjectType !== subjectType || s.revokedAt) return null;
  if (s.expiresAt.getTime() <= now.getTime()) return null;
  if (now.getTime() - s.lastSeenAt.getTime() > ttlFor(subjectType).idleMs) return null;
  if (!(await subjectIsActive(db, s.subjectType, s.subjectId))) return null;
  if (now.getTime() - s.lastSeenAt.getTime() >= TTL.touchIntervalMs) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, s.id));
    s.lastSeenAt = now;
  }
  return s;
}

/** New token for the same subject; the old session is revoked. Keeps `second_factor_at` unless overridden. */
export async function rotateSession(
  db: DbOrTx,
  old: Session,
  meta: SessionMeta = {},
  now: Date = new Date(),
  opts: { secondFactorAt?: Date | null } = {},
): Promise<{ token: string; session: Session }> {
  return db.transaction(async (tx) => {
    await tx.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.id, old.id), isNull(sessions.revokedAt)));
    return createSession(
      tx,
      { type: old.subjectType, id: old.subjectId },
      { ip: meta.ip ?? old.ip, userAgent: meta.userAgent ?? old.userAgent },
      now,
      {
        secondFactorAt: opts.secondFactorAt === undefined ? old.secondFactorAt : opts.secondFactorAt,
        rotatedFrom: old.id,
      },
    );
  });
}

/** Staff completed 2FA: rotate and stamp `second_factor_at` (FR-ACC-012). */
export function markSecondFactor(db: DbOrTx, session: Session, meta: SessionMeta = {}, now: Date = new Date()) {
  return rotateSession(db, session, meta, now, { secondFactorAt: now });
}

export async function revokeSession(db: DbOrTx, sessionId: string, now: Date = new Date()): Promise<void> {
  await db.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

export async function revokeSessionByToken(db: DbOrTx, token: string, now: Date = new Date()): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt)));
}

/** Sign a subject out everywhere (suspension, revocation, password reset — FR-ACC-013/014, FR-ACC-006). */
export async function revokeAllSessions(
  db: DbOrTx,
  subjectType: SubjectType,
  subjectId: string,
  now: Date = new Date(),
): Promise<number> {
  const rows = await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.subjectType, subjectType), eq(sessions.subjectId, subjectId), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });
  return rows.length;
}

/** Delete sessions past absolute expiry (or revoked) more than a day ago. For the scheduler. */
export async function purgeExpiredSessions(db: DbOrTx, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60_000);
  const rows = await db
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, cutoff), lt(sessions.revokedAt, cutoff)))
    .returning({ id: sessions.id });
  return rows.length;
}

export interface CookieDescriptor {
  name: string;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export function sessionCookie(subjectType: SubjectType): CookieDescriptor {
  return {
    name: COOKIE_NAMES[subjectType],
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: Math.floor(ttlFor(subjectType).absoluteMs / 1000),
  };
}
