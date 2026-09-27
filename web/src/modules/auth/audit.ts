import { and, desc, eq, lt, type SQL } from "drizzle-orm";
import type { DbOrTx, Tx } from "../../db/connection";
import { type Actor, withActor } from "../../db/guards";
import { auditEntries } from "../core/schema";

/**
 * Action audit log (FR-ACC-011). Entries are append-only (DCA01) and outlive the actor (FR-ACC-014).
 * Values under keys that look secret are replaced by "[redacted]" before they are stored.
 */

export type { Actor } from "../../db/guards";

export interface AuditInput {
  actor: Actor;
  action: string;
  target: { type: string; id?: string | null };
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

const SECRET_KEY = /password|token|secret|code|hash|otp/i;
export const REDACTED = "[redacted]";

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEY.test(k) ? REDACTED : redact(v)]),
    );
  }
  return value;
}

/** Keep only the fields whose value differs (shallow, JSON comparison). */
export function changed<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: T | null | undefined,
): { before: Partial<T>; after: Partial<T> } {
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const k of keys) {
    const bv = before?.[k];
    const av = after?.[k];
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      (b as Record<string, unknown>)[k] = bv;
      (a as Record<string, unknown>)[k] = av;
    }
  }
  return { before: b, after: a };
}

export async function audit(db: DbOrTx, input: AuditInput): Promise<void> {
  await db.insert(auditEntries).values({
    actorType: input.actor.type,
    actorId: input.actor.id ?? null,
    action: input.action,
    targetType: input.target.type,
    targetId: input.target.id ?? null,
    before: input.before === undefined ? null : redact(input.before),
    after: input.after === undefined ? null : redact(input.after),
    ip: input.ip ?? null,
  });
}

export type AuditEntry = typeof auditEntries.$inferSelect;

export async function listAuditEntries(
  db: DbOrTx,
  q: { targetType?: string; targetId?: string; actorId?: string; limit?: number; before?: Date } = {},
): Promise<AuditEntry[]> {
  const where: SQL[] = [];
  if (q.targetType) where.push(eq(auditEntries.targetType, q.targetType));
  if (q.targetId) where.push(eq(auditEntries.targetId, q.targetId));
  if (q.actorId) where.push(eq(auditEntries.actorId, q.actorId));
  if (q.before) where.push(lt(auditEntries.occurredAt, q.before));
  return db
    .select()
    .from(auditEntries)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(auditEntries.occurredAt), desc(auditEntries.id))
    .limit(Math.min(Math.max(q.limit ?? 50, 1), 500));
}

/**
 * Run a mutation attributed to `actor` (row journal via `withActor`) and write its action entry in the same
 * transaction, so the journal and the audit log always agree. `fn` returns `{ result, before?, after?, targetId? }`
 * (`targetId` names a row the mutation itself created, e.g. a new user's id).
 */
export async function auditedMutation<T>(
  db: DbOrTx,
  actor: Actor,
  meta: { action: string; target: { type: string; id?: string | null }; ip?: string | null },
  fn: (tx: Tx) => Promise<{ result: T; before?: unknown; after?: unknown; targetId?: string }>,
): Promise<T> {
  return withActor(db, actor, async (tx) => {
    const { result, before, after, targetId } = await fn(tx);
    const target = targetId ? { ...meta.target, id: targetId } : meta.target;
    await audit(tx, { actor, ...meta, target, before, after });
    return result;
  });
}
