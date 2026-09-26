import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";
import { rateLimitHits } from "./schema";

/**
 * Sliding-window rate limiting (FR-ACC-004, NFR-SEC-004). A refused attempt is not recorded, so the caller can try
 * again as soon as the oldest hit in the window ages out (`retryAfterMs`). Keys carry identifiers (phone, email, IP,
 * user id), never secrets.
 */

export interface RateLimitStore {
  /** Record a hit for `key` unless `limit` hits already sit in the window ending at `now`. */
  hit(key: string, windowMs: number, now: Date, limit: number): Promise<{ allowed: boolean; count: number; oldest: Date | null }>;
}

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;

export const LIMITS = {
  otpPerTarget: { limit: 10, windowMs: HOUR }, // FR-ACC-004: 11th request in an hour refused
  otpPerIp: { limit: 10, windowMs: HOUR },
  signInPerIdentity: { limit: 10, windowMs: 15 * MIN },
  signInPerIp: { limit: 50, windowMs: 15 * MIN },
  resetPerIdentity: { limit: 5, windowMs: HOUR },
  resetPerIp: { limit: 20, windowMs: HOUR },
  totpPerUser: { limit: 5, windowMs: 15 * MIN },
  assistantPerSession: { limit: 30, windowMs: 10 * MIN }, // exported for ASSISTANT
  assistantPerIp: { limit: 60, windowMs: 10 * MIN },
} as const satisfies Record<string, RateLimitRule>;

export type LimitName = keyof typeof LIMITS;

export async function rateLimit(
  store: RateLimitStore,
  opts: { key: string } & RateLimitRule,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const r = await store.hit(opts.key, opts.windowMs, now, opts.limit);
  if (r.allowed) return { ok: true, remaining: Math.max(0, opts.limit - r.count), retryAfterMs: 0 };
  const retryAfterMs = r.oldest ? Math.max(1000, r.oldest.getTime() + opts.windowMs - now.getTime()) : opts.windowMs;
  return { ok: false, remaining: 0, retryAfterMs };
}

/** Check several limits; stops at the first refusal. */
export async function rateLimitAll(
  store: RateLimitStore,
  checks: Array<{ key: string } & RateLimitRule>,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  let last: RateLimitResult = { ok: true, remaining: Infinity, retryAfterMs: 0 };
  for (const c of checks) {
    const r = await rateLimit(store, c, now);
    if (!r.ok) return r;
    last = { ok: true, remaining: Math.min(last.remaining, r.remaining), retryAfterMs: 0 };
  }
  return last;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, number[]>();
  async hit(key: string, windowMs: number, now: Date, limit: number) {
    const t = now.getTime();
    const list = (this.hits.get(key) ?? []).filter((h) => h > t - windowMs);
    const allowed = list.length < limit;
    if (allowed) list.push(t);
    this.hits.set(key, list);
    return { allowed, count: list.length, oldest: list.length ? new Date(list[0]!) : null };
  }
}

const PRUNE_AFTER_MS = 24 * HOUR;

export class DbRateLimitStore implements RateLimitStore {
  constructor(private readonly db: DbOrTx) {}

  async hit(key: string, windowMs: number, now: Date, limit: number) {
    const since = new Date(now.getTime() - windowMs);
    return this.db.transaction(async (tx) => {
      // serialise concurrent hits on the same key
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
      const [row] = await tx
        .select({ n: sql<number>`count(*)::int`, oldest: sql<Date | null>`min(${rateLimitHits.hitAt})` })
        .from(rateLimitHits)
        .where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.hitAt, since)));
      const count = row?.n ?? 0;
      const oldest = row?.oldest ? new Date(row.oldest) : null;
      if (count >= limit) return { allowed: false, count, oldest };
      await tx.insert(rateLimitHits).values({ key, hitAt: now });
      if (Math.random() < 0.02) {
        await tx.delete(rateLimitHits).where(lt(rateLimitHits.hitAt, new Date(now.getTime() - PRUNE_AFTER_MS)));
      }
      return { allowed: true, count: count + 1, oldest: oldest ?? now };
    });
  }
}

/** Client IP for rate-limit keys: first `x-forwarded-for` hop, else `x-real-ip`, else "unknown". */
export function clientIp(headers: { get(name: string): string | null }): string {
  const xff = headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "unknown";
}
