/**
 * Orders contract implementation (Phase 0, PLATFORM) — thin but real: placement in one transaction, Appendix A
 * transitions with an order_events row each, reads, delivery zones/fees/estimates.
 * STUB(contracts): the orders team owns the full rules — discounts/codes, free-delivery thresholds, backorders
 * (FR-INV-011), prepaid reservation expiry (FR-INV-009), origin override, split shipments, and the side effects
 * listed per transition in state-machine.ts (only the state change + event are done here).
 */
import { asc, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { withActor } from "../../db/guards";
import { actorOf, dbOf, nowOf, type ServiceContext, type Tx } from "../../lib/context";
import { AppError } from "../../lib/errors";
import { newOrderReference, normalizeOrderReference } from "../../lib/ids";
import { getSetting } from "../../lib/settings";
import { stubWarn } from "../../lib/stub";
import { businessDate, type BusinessDate } from "../../lib/time";
import { getVariants } from "../catalog";
import { notify } from "../engagement";
import { recordBusinessEvent } from "../insights";
import { listLocations, reserve } from "../inventory";
import { computeTotals } from "../payments";
import { deliveryZones, orderEvents, orderLines, orders } from "./schema";
import { assertTransition, TransitionError, type FulfilmentState, type Machine, type PaymentState } from "./state-machine";
import type {
  DeliveryEstimate,
  DeliveryZoneView,
  OrderAddressSnapshot,
  OrderSummary,
  OrderView,
  PlaceOrderInput,
  PlaceOrderResult,
  TransitionInput,
  TransitionResult,
} from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E164 = /^\+[1-9]\d{7,14}$/;

type OrderRow = typeof orders.$inferSelect;
type ZoneRow = typeof deliveryZones.$inferSelect;

// ---------------------------------------------------------------------------------------------------------------
// Delivery zones, fees, estimates (FR-ADR-006..008)
// ---------------------------------------------------------------------------------------------------------------

function zoneView(z: ZoneRow): DeliveryZoneView {
  return {
    id: z.id,
    governorate: z.governorate,
    locality: z.locality,
    nameAr: z.nameAr,
    nameEn: z.nameEn,
    flatRate: z.flatRate,
    codEligible: z.codEligible,
    codMaxTotal: z.codMaxTotal,
    estMinDays: z.estMinDays,
    estMaxDays: z.estMaxDays,
    isActive: z.isActive,
  };
}

async function loadZone(zoneId: string, ctx?: ServiceContext): Promise<ZoneRow> {
  const [z] = UUID.test(zoneId) ? await dbOf(ctx).select().from(deliveryZones).where(eq(deliveryZones.id, zoneId)) : [];
  if (!z) throw new AppError("not_found", "delivery zone not found", { zoneId });
  return z;
}

export async function listDeliveryZones(opts: { activeOnly?: boolean } = {}, ctx?: ServiceContext): Promise<DeliveryZoneView[]> {
  const rows = await dbOf(ctx)
    .select()
    .from(deliveryZones)
    .where(opts.activeOnly === false ? undefined : eq(deliveryZones.isActive, true))
    .orderBy(asc(deliveryZones.position), asc(deliveryZones.nameEn));
  return rows.map(zoneView);
}

/** Delivery fee in agorot (VAT-inclusive). Phase 0: the zone's flat rate (STUB: thresholds/promotions). */
export async function quoteDeliveryFee(zoneId: string, subtotal: number, ctx?: ServiceContext): Promise<number> {
  const zone = await loadZone(zoneId, ctx);
  if (!zone.isActive) throw new AppError("invalid_input", "delivery zone is not active", { zoneId });
  void subtotal; // STUB(contracts): free-delivery threshold belongs to the orders team.
  return zone.flatRate;
}

const WEEKDAYS = z.array(z.number().int().min(0).max(6));

function weekday(date: BusinessDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

function addDeliveryDays(date: BusinessDate, days: number, closed: ReadonlySet<number>): BusinessDate {
  let [y, m, d] = date.split("-").map(Number) as [number, number, number];
  let left = days;
  let current = date;
  while (left > 0) {
    d += 1;
    const t = new Date(Date.UTC(y, m - 1, d));
    [y, m, d] = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
    current = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!closed.has(weekday(current))) left -= 1;
  }
  return current;
}

/**
 * FR-ADR-008 window: placement business date (Asia/Jerusalem) + min/max delivery days, skipping non-delivery
 * weekdays (setting `orders.non_delivery_weekdays`, default [5] = Friday).
 */
export async function estimateDelivery(zoneId: string, placedAt?: Date, ctx?: ServiceContext): Promise<DeliveryEstimate> {
  const zone = await loadZone(zoneId, ctx);
  const closed = new Set(await getSetting("orders.non_delivery_weekdays", WEEKDAYS, [5], ctx));
  if (closed.size >= 7) throw new AppError("unavailable", "no delivery weekdays configured");
  const start = businessDate(placedAt ?? nowOf(ctx));
  return {
    zoneId: zone.id,
    minDays: zone.estMinDays,
    maxDays: zone.estMaxDays,
    earliest: addDeliveryDays(start, zone.estMinDays, closed),
    latest: addDeliveryDays(start, zone.estMaxDays, closed),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------------------------------

async function toView(row: OrderRow, ctx?: ServiceContext): Promise<OrderView> {
  const db = dbOf(ctx);
  const [lines, [zone]] = await Promise.all([
    db.select().from(orderLines).where(eq(orderLines.orderId, row.id)).orderBy(asc(orderLines.position)),
    db.select().from(deliveryZones).where(eq(deliveryZones.id, row.zoneId)),
  ]);
  return {
    id: row.id,
    reference: row.reference,
    customerId: row.customerId,
    fulfilmentState: row.status,
    paymentState: row.paymentState,
    paymentMethod: row.paymentMethod,
    locale: row.locale,
    contact: { name: row.contactName, phone: row.contactPhoneE164, email: row.contactEmail },
    totals: {
      subtotal: row.subtotal,
      discount: row.discount,
      delivery: row.delivery,
      total: row.total,
      vat: row.vatComponent,
      vatRateBp: row.vatRateBp,
    },
    lines: lines.map((l) => ({
      id: l.id,
      variantId: l.variantId,
      sku: l.sku,
      productNameAr: l.productNameAr,
      productNameEn: l.productNameEn,
      variantNameAr: l.variantNameAr,
      variantNameEn: l.variantNameEn,
      qty: l.quantity,
      shortfallQty: l.shortfallQty,
      unitPrice: l.unitPrice,
      discountAllocated: l.discountAllocated,
      lineTotal: l.lineTotal,
      lineVat: l.lineVat,
    })),
    address: row.deliveryAddress as OrderAddressSnapshot,
    zone: { id: row.zoneId, nameAr: zone?.nameAr ?? "", nameEn: zone?.nameEn ?? "" },
    originLocationId: row.originLocationId,
    customerNote: row.customerNote,
    placedAt: row.placedAt,
    dispatchedAt: row.dispatchedAt,
    deliveredAt: row.deliveredAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
  };
}

/** By UUID or by reference (tolerant: `dc 7k3m q9tx` works). Null when not found. */
export async function getOrder(idOrReference: string, ctx?: ServiceContext): Promise<OrderView | null> {
  let where;
  if (UUID.test(idOrReference)) where = eq(orders.id, idOrReference);
  else {
    const ref = normalizeOrderReference(idOrReference);
    if (!ref) return null;
    where = eq(orders.reference, ref);
  }
  const [row] = await dbOf(ctx).select().from(orders).where(where);
  return row ? toView(row, ctx) : null;
}

export async function listCustomerOrders(
  customerId: string,
  opts: { page?: number; pageSize?: number } = {},
  ctx?: ServiceContext,
): Promise<{ items: OrderSummary[]; total: number }> {
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const page = Math.max(1, opts.page ?? 1);
  const db = dbOf(ctx);
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: orders.id,
        reference: orders.reference,
        status: orders.status,
        paymentState: orders.paymentState,
        total: orders.total,
        placedAt: orders.placedAt,
        itemCount: sql<number>`(select coalesce(sum(${orderLines.quantity}), 0)::int from ${orderLines} where ${orderLines.orderId} = "orders"."id")`,
      })
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.placedAt), desc(orders.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(orders).where(eq(orders.customerId, customerId)),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      fulfilmentState: r.status,
      paymentState: r.paymentState,
      total: r.total,
      itemCount: Number(r.itemCount),
      placedAt: r.placedAt,
    })),
    total: totalRow?.n ?? 0,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Placement (FR-ORD-001, FR-CRT-008)
// ---------------------------------------------------------------------------------------------------------------

function validate(input: PlaceOrderInput): void {
  const bad = (msg: string, field: string) => new AppError("invalid_input", msg, { field });
  if (!input.idempotencyKey?.trim() || input.idempotencyKey.length > 200) throw bad("idempotencyKey is required", "idempotencyKey");
  if (!input.contact?.name?.trim()) throw bad("contact name is required", "contact.name");
  if (!E164.test(input.contact.phone ?? "")) throw bad("contact phone must be E.164", "contact.phone");
  if (input.address.recipientPhone && !E164.test(input.address.recipientPhone)) throw bad("recipient phone must be E.164", "address.recipientPhone");
  if (!input.address?.city?.trim() || !input.address.line1?.trim()) throw bad("address city and line1 are required", "address");
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw bad("an order needs at least one line", "lines");
  for (const l of input.lines) {
    if (!Number.isInteger(l.qty) || l.qty <= 0) throw bad("line quantity must be a positive integer", "lines.qty");
  }
}

async function findByIdempotencyKey(key: string, ctx?: ServiceContext): Promise<OrderRow | undefined> {
  const [row] = await dbOf(ctx).select().from(orders).where(eq(orders.idempotencyKey, key));
  return row;
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const e = error as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
  const c = e?.cause ?? e;
  return c?.code === "23505" && (c.constraint_name ?? "").includes(constraint);
}

/**
 * Place an order in one transaction: price from the catalogue, totals via payments (VAT contained), reference,
 * order + lines + order_events, inventory reservation (throws `insufficient_stock`), business event `order.placed`.
 * COD orders are accepted at once (PENDING → COD_CONFIRMED, UNPAID → COD_DUE) and get the confirmation message
 * after commit; prepaid orders stay PENDING/UNPAID until payments reports the outcome.
 */
export async function placeOrder(input: PlaceOrderInput, ctx?: ServiceContext): Promise<PlaceOrderResult> {
  validate(input);
  const key = input.idempotencyKey.trim();
  const replay = await findByIdempotencyKey(key, ctx);
  if (replay) return { order: await toView(replay, ctx), replayed: true };
  stubWarn("orders.placeOrder.rules");

  let row: OrderRow;
  try {
    row = await withActor(dbOf(ctx), actorOf(ctx), (tx) => placeInTx(input, key, { ...ctx, db: tx }, tx));
  } catch (error) {
    if (isUniqueViolation(error, "idempotency")) {
      const again = await findByIdempotencyKey(key, ctx);
      if (again) return { order: await toView(again, ctx), replayed: true };
    }
    throw error;
  }

  const order = await toView(row, ctx);
  if (row.paymentMethod === "cod") {
    try {
      await notify(
        "order.confirmation",
        { customerId: row.customerId ?? undefined, phone: row.contactPhoneE164, email: row.contactEmail ?? undefined, locale: row.locale },
        { orderId: row.id, reference: row.reference, total: row.total, name: row.contactName },
        ctx,
      );
    } catch (error) {
      // The order stands; the outbox retries transport failures. Anything else is logged for the orders team.
      console.error("[orders] confirmation notify failed", row.reference, error);
    }
  }
  return { order, replayed: false };
}

async function placeInTx(input: PlaceOrderInput, key: string, ctx: ServiceContext, tx: Tx): Promise<OrderRow> {
  const now = nowOf(ctx);
  const zone = await loadZone(input.address.zoneId, ctx);
  if (!zone.isActive) throw new AppError("invalid_input", "delivery zone is not active", { field: "address.zoneId" });

  // Merge duplicate variant lines, keep first-seen order.
  const qtyByVariant = new Map<string, number>();
  for (const l of input.lines) qtyByVariant.set(l.variantId, (qtyByVariant.get(l.variantId) ?? 0) + l.qty);
  const variantIds = [...qtyByVariant.keys()];
  const variants = await getVariants(variantIds, ctx);
  for (const id of variantIds) {
    const v = variants.find((x) => x.id === id);
    if (!v || v.status !== "active" || v.productStatus !== "published") {
      throw new AppError("invalid_input", "variant is not available for sale", { field: "lines.variantId", variantId: id });
    }
  }

  const lineInputs = variants.map((v) => ({ variant: v, qty: qtyByVariant.get(v.id)! }));
  const subtotal = lineInputs.reduce((s, l) => s + l.variant.price * l.qty, 0);
  const deliveryFee = await quoteDeliveryFee(zone.id, subtotal, ctx);
  const totals = await computeTotals(
    { lines: lineInputs.map((l) => ({ unitPrice: l.variant.price, qty: l.qty, vatRateBp: l.variant.vatRateBp })), deliveryFee, at: now },
    ctx,
  );

  if (input.paymentMethod === "cod") {
    // Minimal FR-PAY-001 / FR-ADR-007 guard; the orders/payments teams own the full rules.
    const globalCap = await getSetting("payments.cod_max_total", z.number().int().nonnegative(), 100_000, ctx);
    const cap = zone.codMaxTotal == null ? globalCap : Math.min(globalCap, zone.codMaxTotal);
    if (!zone.codEligible) throw new AppError("invalid_input", "cash on delivery is not available in this zone", { field: "paymentMethod" });
    if (totals.total > cap) throw new AppError("invalid_input", "order total exceeds the cash-on-delivery limit", { field: "paymentMethod", cap });
  }

  let originLocationId = zone.defaultOriginId;
  if (!originLocationId) {
    const [first] = await listLocations(ctx);
    if (!first) throw new AppError("unavailable", "no active dispatch origin");
    originLocationId = first.id;
  }

  const address: OrderAddressSnapshot = {
    recipientName: input.address.recipientName?.trim() || input.contact.name.trim(),
    phoneE164: input.address.recipientPhone || input.contact.phone,
    governorate: zone.governorate,
    locality: input.address.city.trim(),
    line1: input.address.line1.trim(),
    line2: input.address.line2?.trim() || null,
    landmark: input.address.landmark?.trim() || null,
    notes: input.address.notes?.trim() || null,
  };

  // References are random; retry on the (40-bit, very unlikely) collision via a savepoint.
  let row: OrderRow | undefined;
  for (let attempt = 0; !row; attempt++) {
    try {
      [row] = await tx.transaction((sp) =>
        sp
          .insert(orders)
          .values({
            reference: newOrderReference(),
            customerId: input.customerId ?? null,
            status: "PENDING",
            paymentState: "UNPAID",
            originLocationId: originLocationId!,
            zoneId: zone.id,
            subtotal: totals.subtotal,
            discount: totals.discount,
            delivery: totals.delivery,
            total: totals.total,
            vatComponent: totals.vat,
            vatRateBp: totals.rateBp,
            paymentMethod: input.paymentMethod,
            locale: input.locale,
            contactName: input.contact.name.trim(),
            contactPhoneE164: input.contact.phone,
            contactEmail: input.contact.email?.trim().toLowerCase() || null,
            deliveryAddress: address,
            customerNote: input.customerNote?.trim() || null,
            idempotencyKey: key,
            placedAt: now,
          })
          .returning(),
      );
    } catch (error) {
      if (attempt < 3 && isUniqueViolation(error, "reference")) continue;
      throw error;
    }
  }

  await tx.insert(orderLines).values(
    lineInputs.map((l, i) => {
      const t = totals.lines[i]!;
      return {
        orderId: row!.id,
        variantId: l.variant.id,
        sku: l.variant.sku,
        productNameAr: l.variant.productNameAr,
        productNameEn: l.variant.productNameEn,
        variantNameAr: l.variant.variantNameAr,
        variantNameEn: l.variant.variantNameEn,
        quantity: l.qty,
        unitPrice: l.variant.price,
        discountAllocated: t.discount,
        lineTotal: t.netTotal,
        lineVat: Math.round(t.lineVatUnrounded),
        position: i,
      };
    }),
  );

  const actor = actorOf(ctx);
  let seq = 0;
  // 1 ms apart so the timeline order of the placement events is unambiguous.
  const event = (machine: Machine, fromState: string | null, toState: string, trigger: string) => ({
    orderId: row!.id,
    machine,
    fromState,
    toState,
    trigger,
    actorType: actor.type,
    actorId: actor.id ?? null,
    occurredAt: new Date(now.getTime() + seq++),
  });
  const events = [event("fulfilment", null, "PENDING", "placed"), event("payment", null, "UNPAID", "placed")];
  if (input.paymentMethod === "cod") {
    assertTransition("fulfilment", "PENDING", "COD_CONFIRMED", { trigger: "cod_accepted" });
    assertTransition("payment", "UNPAID", "COD_DUE", { trigger: "cod_accepted" });
    events.push(event("fulfilment", "PENDING", "COD_CONFIRMED", "cod_accepted"), event("payment", "UNPAID", "COD_DUE", "cod_accepted"));
    [row] = await tx
      .update(orders)
      .set({ status: "COD_CONFIRMED", paymentState: "COD_DUE", updatedAt: now })
      .where(eq(orders.id, row!.id))
      .returning();
  }
  await tx.insert(orderEvents).values(events);

  await reserve({ ownerType: "order", ownerId: row!.id, lines: lineInputs.map((l) => ({ variantId: l.variant.id, qty: l.qty })) }, ctx);
  await recordBusinessEvent(
    {
      type: "order.placed",
      aggregateType: "order",
      aggregateId: row!.id,
      payload: { reference: row!.reference, total: row!.total, paymentMethod: row!.paymentMethod, zoneId: zone.id, lines: lineInputs.length },
    },
    ctx,
  );
  return row!;
}

// ---------------------------------------------------------------------------------------------------------------
// Transitions (Appendix A)
// ---------------------------------------------------------------------------------------------------------------

const TIMESTAMP_ON: Partial<Record<FulfilmentState, "dispatchedAt" | "deliveredAt" | "completedAt" | "cancelledAt">> = {
  DISPATCHED: "dispatchedAt",
  DELIVERED: "deliveredAt",
  COMPLETED: "completedAt",
  CANCELLED: "cancelledAt",
};

/**
 * Move one machine of an order to `to` if Appendix A allows it (else `invalid_transition`), append an order_events
 * row (actor from ctx). STUB(contracts): the per-row side effects (stock, messages, invoices) are the orders team's.
 */
export async function transition(orderId: string, input: TransitionInput, ctx?: ServiceContext): Promise<TransitionResult> {
  const now = nowOf(ctx);
  const actor = actorOf(ctx);
  return withActor(dbOf(ctx), actor, async (tx) => {
    const [row] = UUID.test(orderId) ? await tx.select().from(orders).where(eq(orders.id, orderId)).for("update") : [];
    if (!row) throw new AppError("not_found", "order not found", { orderId });
    const from = input.machine === "fulfilment" ? row.status : row.paymentState;
    let rule;
    try {
      rule =
        input.machine === "fulfilment"
          ? assertTransition("fulfilment", row.status, input.to as FulfilmentState, { trigger: input.trigger, paymentState: row.paymentState })
          : assertTransition("payment", row.paymentState, input.to as PaymentState, { trigger: input.trigger });
    } catch (error) {
      if (error instanceof TransitionError) {
        throw new AppError("invalid_transition", error.message, {
          machine: input.machine,
          from,
          to: input.to,
          trigger: input.trigger ?? null,
          reason: error.reason,
        });
      }
      throw error;
    }
    const patch: Partial<typeof orders.$inferInsert> = { updatedAt: now };
    if (input.machine === "fulfilment") {
      patch.status = rule.to as FulfilmentState;
      const stamp = TIMESTAMP_ON[rule.to as FulfilmentState];
      if (stamp) patch[stamp] = now;
    } else {
      patch.paymentState = rule.to as PaymentState;
    }
    await tx.update(orders).set(patch).where(eq(orders.id, row.id));
    const [ev] = await tx
      .insert(orderEvents)
      .values({
        orderId: row.id,
        machine: input.machine,
        fromState: from,
        toState: rule.to,
        trigger: rule.trigger,
        actorType: actor.type,
        actorId: actor.id ?? null,
        data: input.data ?? null,
        occurredAt: now,
      })
      .returning({ id: orderEvents.id });
    return { orderId: row.id, machine: input.machine, from, to: rule.to, trigger: rule.trigger, eventId: ev!.id };
  });
}

/** Order events, oldest first (for timelines). */
export async function listOrderEvents(orderId: string, ctx?: ServiceContext) {
  return dbOf(ctx).select().from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(asc(orderEvents.occurredAt), asc(orderEvents.id));
}
