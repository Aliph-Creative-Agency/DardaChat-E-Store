/**
 * Outbound messaging for every module (DECISIONS 2026-09-26 "outbound message API"). `sendMessage` writes one
 * `messages` row per channel tried (the outbox, /dev/outbox), delivers synchronously through the channel adapter
 * via `callExternal` and falls through to the next channel on failure. Failed rows are retried by
 * `dispatchDueMessages` (job `core.outbox.dispatch`) and end `dead` + a dead letter when exhausted.
 *
 * `attempts` counts delivery cycles (one cycle = one `callExternal` with its own short retry).
 * All rows written by one `sendMessage` call share `payload.sendGroup`; once any of them is sent, the dispatcher
 * retires its failed siblings (status `dead`, error "superseded") instead of delivering a duplicate.
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray, like, lte, or, sql } from "drizzle-orm";
// Tables via the schema barrel: `messages` is defined in engagement/schema.ts but the outbox transport is core's.
import { deadLetters, messages } from "../../db/schema";
import { callExternal } from "../../lib/adapters/call";
import { getChannelAdapter, type Channel } from "../../lib/channels";
import { dbOf, nowOf, type ServiceContext } from "../../lib/context";
import { AppError, isAppError } from "../../lib/errors";

export type MessageChannel = Channel;

export interface SendMessageInput {
  /** Tried in order: the first that has a matching address and succeeds wins (fallback). */
  channels: MessageChannel[];
  to: { phone?: string; email?: string };
  /** e.g. "auth.otp", "order.confirmation". */
  eventKey: string;
  locale: "ar" | "en";
  text: string;
  subject?: string;
  payload?: Record<string, unknown>;
  customerId?: string;
  /** Same key again returns the existing message instead of sending twice. */
  dedupeKey?: string;
}

export interface SendMessageResult {
  messageId: string;
  channel: MessageChannel;
  status: "sent" | "queued" | "failed";
}

const SEND_TIMEOUT_MS = 3000;
const SEND_RETRIES = 1;

type MessageRow = typeof messages.$inferSelect;

function resultOf(row: Pick<MessageRow, "id" | "channel" | "status">): SendMessageResult {
  const status = row.status === "sent" ? "sent" : row.status === "queued" || row.status === "sending" ? "queued" : "failed";
  return { messageId: row.id, channel: row.channel, status };
}

/** Retry schedule for failed rows: 30 s × 2^(attempts-1), capped at 1 h. */
export function nextAttemptDelayMs(attempts: number): number {
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1));
}

function addressFor(channel: MessageChannel, to: SendMessageInput["to"]): string | undefined {
  return channel === "email" ? to.email : to.phone;
}

interface DeliveryOutcome {
  ok: boolean;
  permanent: boolean;
}

/** One delivery cycle for an existing row; updates the row. */
async function deliver(row: MessageRow, ctx?: ServiceContext): Promise<DeliveryOutcome> {
  const db = dbOf(ctx);
  const payload = row.payload as { text?: string; subject?: string };
  const attempts = row.attempts + 1;
  try {
    const { providerRef } = await callExternal({
      service: row.channel,
      operation: "send",
      timeoutMs: SEND_TIMEOUT_MS,
      retries: SEND_RETRIES,
      fn: (signal) =>
        getChannelAdapter(row.channel).send(
          { to: row.to, text: payload.text ?? "", subject: payload.subject, locale: row.locale },
          signal,
        ),
      ctx,
    });
    const now = nowOf(ctx);
    await db
      .update(messages)
      .set({ status: "sent", providerRef, sentAt: now, attempts, error: null, updatedAt: now })
      .where(eq(messages.id, row.id));
    return { ok: true, permanent: false };
  } catch (error) {
    const permanent = isAppError(error) && error.details?.permanent === true;
    const text = error instanceof Error ? error.message : String(error);
    const now = nowOf(ctx);
    await db
      .update(messages)
      .set({
        status: permanent ? "dead" : "failed",
        attempts,
        error: text.slice(0, 2000),
        nextAttemptAt: new Date(now.getTime() + nextAttemptDelayMs(attempts)),
        updatedAt: now,
      })
      .where(eq(messages.id, row.id));
    if (permanent) {
      await db.insert(deadLetters).values({
        source: `${row.channel}.send`,
        reference: row.id,
        payload: { messageId: row.id, eventKey: row.eventKey, to: row.to },
        error: text.slice(0, 2000),
        attempts,
      });
    }
    return { ok: false, permanent };
  }
}

async function findByDedupeKey(key: string, ctx?: ServiceContext): Promise<MessageRow | undefined> {
  const rows = await dbOf(ctx)
    .select()
    .from(messages)
    .where(or(eq(messages.dedupeKey, key), like(messages.dedupeKey, `${key.replace(/[\\%_]/g, "\\$&")}#%`)))
    .orderBy(messages.createdAt);
  return rows.find((r) => r.status === "sent") ?? rows[rows.length - 1];
}

export async function sendMessage(input: SendMessageInput, ctx?: ServiceContext): Promise<SendMessageResult> {
  if (input.dedupeKey) {
    const existing = await findByDedupeKey(input.dedupeKey, ctx);
    if (existing) return resultOf(existing);
  }
  const plan = input.channels
    .map((channel) => ({ channel, to: addressFor(channel, input.to) }))
    .filter((p): p is { channel: MessageChannel; to: string } => Boolean(p.to));
  if (plan.length === 0) {
    throw new AppError("invalid_input", "no address for any requested channel", { channels: input.channels });
  }

  const sendGroup = randomUUID();
  let last: MessageRow | undefined;
  for (const [index, step] of plan.entries()) {
    const [row] = await dbOf(ctx)
      .insert(messages)
      .values({
        channel: step.channel,
        to: step.to,
        customerId: input.customerId ?? null,
        eventKey: input.eventKey,
        locale: input.locale,
        payload: { ...(input.payload ?? {}), text: input.text, subject: input.subject ?? null, sendGroup },
        status: "sending",
        dedupeKey: input.dedupeKey ? (index === 0 ? input.dedupeKey : `${input.dedupeKey}#${step.channel}`) : null,
        nextAttemptAt: nowOf(ctx),
      })
      .returning();
    if (!row) throw new Error("messages insert returned no row");
    const outcome = await deliver(row, ctx);
    const [fresh] = await dbOf(ctx).select().from(messages).where(eq(messages.id, row.id));
    last = fresh ?? row;
    if (outcome.ok) return resultOf(last);
  }
  return { ...resultOf(last!), status: "failed" };
}

export interface DispatchResult {
  picked: number;
  sent: number;
  failed: number;
  dead: number;
  superseded: number;
}

/**
 * Retry due `queued`/`failed` rows (and `sending` rows stuck > 5 min). Safe to run concurrently: rows are claimed
 * with `for update skip locked`. At `maxAttempts` a row becomes `dead` with a dead letter.
 */
export async function dispatchDueMessages(
  opts: { limit?: number; maxAttempts?: number } = {},
  ctx?: ServiceContext,
): Promise<DispatchResult> {
  const limit = opts.limit ?? 50;
  const maxAttempts = opts.maxAttempts ?? 5;
  const now = nowOf(ctx);
  const db = dbOf(ctx);
  const stuckBefore = new Date(now.getTime() - 5 * 60_000);

  const claimed = await db.transaction(async (tx) => {
    const due = await tx
      .select({ id: messages.id })
      .from(messages)
      .where(
        or(
          and(inArray(messages.status, ["queued", "failed"]), lte(messages.nextAttemptAt, now)),
          and(eq(messages.status, "sending"), lte(messages.updatedAt, stuckBefore)),
        ),
      )
      .orderBy(messages.nextAttemptAt)
      .limit(limit)
      .for("update", { skipLocked: true });
    if (due.length === 0) return [] as MessageRow[];
    return tx
      .update(messages)
      .set({ status: "sending", updatedAt: now })
      .where(inArray(messages.id, due.map((d) => d.id)))
      .returning();
  });

  const result: DispatchResult = { picked: claimed.length, sent: 0, failed: 0, dead: 0, superseded: 0 };
  for (const row of claimed) {
    const group = (row.payload as { sendGroup?: string }).sendGroup;
    if (group) {
      const [sibling] = await db
        .select({ id: messages.id, channel: messages.channel })
        .from(messages)
        .where(and(sql`${messages.payload}->>'sendGroup' = ${group}`, eq(messages.status, "sent")))
        .limit(1);
      if (sibling) {
        await db
          .update(messages)
          .set({ status: "dead", error: `superseded: delivered via ${sibling.channel} (${sibling.id})`, updatedAt: now })
          .where(eq(messages.id, row.id));
        result.superseded++;
        continue;
      }
    }
    const outcome = await deliver(row, ctx);
    if (outcome.ok) {
      result.sent++;
    } else if (outcome.permanent) {
      result.dead++;
    } else if (row.attempts + 1 >= maxAttempts) {
      const [fresh] = await db
        .update(messages)
        .set({ status: "dead", updatedAt: now })
        .where(eq(messages.id, row.id))
        .returning();
      await db.insert(deadLetters).values({
        source: `${row.channel}.send`,
        reference: row.id,
        payload: { messageId: row.id, eventKey: row.eventKey, to: row.to },
        error: fresh?.error ?? "delivery failed",
        attempts: row.attempts + 1,
      });
      result.dead++;
    } else {
      result.failed++;
    }
  }
  return result;
}
