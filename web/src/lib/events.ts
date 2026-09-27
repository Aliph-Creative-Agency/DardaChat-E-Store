/**
 * Business events (NFR-MNT-005): an append-style log of domain facts (`order.placed`, `payment.succeeded`,
 * `service.degraded`…) for reports, insights and in-process subscribers. Type naming: `<aggregate>.<verb>` in
 * lower snake case, past tense for facts. Pass `ctx.db = tx` so the event commits/rolls back with the change.
 */
import { and, desc, eq, lt, sql, type SQL } from "drizzle-orm";
import { businessEvents } from "../modules/core/schema";
import { dbOf, type ServiceContext } from "./context";

export interface BusinessEventInput {
  /** `<aggregate>.<verb>`, e.g. "order.placed". */
  type: string;
  /** e.g. "order", "payment", "service". */
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
}

export interface BusinessEvent {
  id: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  processedAt: Date | null;
}

const EVENT_TYPE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export async function recordBusinessEvent(input: BusinessEventInput, ctx?: ServiceContext): Promise<BusinessEvent> {
  if (!EVENT_TYPE.test(input.type)) throw new Error(`invalid business event type "${input.type}" (<aggregate>.<verb>)`);
  const [row] = await dbOf(ctx)
    .insert(businessEvents)
    .values({
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload ?? {},
      // DB clock_timestamp() (µs, advances inside a tx) keeps ordering stable; ctx.now pins it in tests.
      occurredAt: ctx?.now ?? sql`clock_timestamp()`,
    })
    .returning();
  return row as BusinessEvent;
}

export interface ListBusinessEventsQuery {
  aggregateType?: string;
  aggregateId?: string;
  type?: string;
  /** Default 50, max 500. */
  limit?: number;
  /** Cursor: only events strictly older than this. */
  before?: Date;
}

/** Newest first. */
export async function listBusinessEvents(query: ListBusinessEventsQuery = {}, ctx?: ServiceContext): Promise<BusinessEvent[]> {
  const where: SQL[] = [];
  if (query.aggregateType) where.push(eq(businessEvents.aggregateType, query.aggregateType));
  if (query.aggregateId) where.push(eq(businessEvents.aggregateId, query.aggregateId));
  if (query.type) where.push(eq(businessEvents.type, query.type));
  if (query.before) where.push(lt(businessEvents.occurredAt, query.before));
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 500);
  const rows = await dbOf(ctx)
    .select()
    .from(businessEvents)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(businessEvents.occurredAt), desc(businessEvents.id))
    .limit(limit);
  return rows as BusinessEvent[];
}
