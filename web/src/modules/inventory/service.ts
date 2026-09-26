/**
 * Inventory contract implementation (Phase 0, PLATFORM). Real: availability, reservations (reserve/release),
 * locations, back-in-stock requests. Stubbed (STUB(contracts)): the ledger writes owned by the inventory team.
 *
 * Availability is derived: `stock_levels.on_hand` minus active, unexpired `reservations`. `stock_levels.reserved` is
 * not maintained in Phase 0 (the inventory team decides whether to keep it as a cache).
 */
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { dbOf, nowOf, type DbOrTx, type ServiceContext } from "../../lib/context";
import { AppError } from "../../lib/errors";
import { getSetting } from "../../lib/settings";
import { stubWarn } from "../../lib/stub";
import { backInStockRequests, locations, reservations, stockLevels } from "./schema";
import type {
  Availability,
  BackInStockInput,
  CommitDispatchInput,
  LocationView,
  RecordShortfallInput,
  ReservationOwnerType,
  ReservationRef,
  ReserveInput,
  RestoreOnReceiptInput,
  StockLineInput,
  StockMovementResult,
  WriteOffInput,
} from "./types";

const TTL_SETTING = "inventory.reservation_ttl_minutes";

function activeReservation(now: Date) {
  return and(isNull(reservations.releasedAt), or(isNull(reservations.expiresAt), gt(reservations.expiresAt, now)));
}

interface StockRow {
  variantId: string;
  locationId: string;
  locationCode: string;
  onHand: number;
  reserved: number;
}

async function stockRows(db: DbOrTx, variantIds: string[], now: Date, lock: boolean): Promise<StockRow[]> {
  if (variantIds.length === 0) return [];
  const base = db
    .select({
      variantId: stockLevels.variantId,
      locationId: stockLevels.locationId,
      locationCode: locations.code,
      onHand: stockLevels.onHand,
    })
    .from(stockLevels)
    .innerJoin(locations, eq(locations.id, stockLevels.locationId))
    .where(and(inArray(stockLevels.variantId, variantIds), eq(locations.isActive, true), eq(locations.isOrigin, true)))
    .orderBy(asc(locations.code))
    .$dynamic();
  // Inside reserve(): lock the stock rows so concurrent reservations of the same variant serialise.
  const levels = await (lock ? base.for("update", { of: stockLevels }) : base);
  const held = await db
    .select({
      variantId: reservations.variantId,
      locationId: reservations.locationId,
      qty: sql<number>`sum(${reservations.qty})::int`,
    })
    .from(reservations)
    .where(and(inArray(reservations.variantId, variantIds), activeReservation(now)))
    .groupBy(reservations.variantId, reservations.locationId);
  const heldBy = new Map(held.map((h) => [`${h.variantId}:${h.locationId}`, h.qty]));
  return levels.map((l) => ({ ...l, reserved: heldBy.get(`${l.variantId}:${l.locationId}`) ?? 0 }));
}

function toAvailability(variantId: string, rows: StockRow[]): Availability {
  const mine = rows.filter((r) => r.variantId === variantId);
  return {
    variantId,
    available: mine.reduce((s, r) => s + Math.max(0, r.onHand - r.reserved), 0),
    onHand: mine.reduce((s, r) => s + r.onHand, 0),
    reserved: mine.reduce((s, r) => s + r.reserved, 0),
    byLocation: mine.map((r) => ({ locationCode: r.locationCode, onHand: r.onHand, reserved: r.reserved })),
  };
}

/** One entry per requested variant (unknown / unstocked variants → zeros), in request order. */
export async function getAvailability(variantIds: readonly string[], ctx?: ServiceContext): Promise<Availability[]> {
  const ids = [...new Set(variantIds)];
  const rows = await stockRows(dbOf(ctx), ids, nowOf(ctx), false);
  return ids.map((id) => toAvailability(id, rows));
}

function mergeLines(lines: StockLineInput[]): StockLineInput[] {
  const byVariant = new Map<string, number>();
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty <= 0) {
      throw new AppError("invalid_input", "reservation qty must be a positive integer", { variantId: l.variantId, qty: l.qty });
    }
    byVariant.set(l.variantId, (byVariant.get(l.variantId) ?? 0) + l.qty);
  }
  return [...byVariant].map(([variantId, qty]) => ({ variantId, qty }));
}

async function releaseIn(db: DbOrTx, ownerId: string, now: Date, reason: string): Promise<number> {
  const rows = await db
    .update(reservations)
    .set({ releasedAt: now, releaseReason: reason })
    .where(and(eq(reservations.orderId, ownerId), isNull(reservations.releasedAt)))
    .returning({ id: reservations.id });
  return rows.length;
}

/**
 * Hold stock for a cart or an order. Sets the owner's hold to exactly `lines` (existing active reservations of the
 * owner are released first), so calling it again after a cart change is safe. Allocates from the origin with the
 * most free stock, splitting across origins when needed. Stock rows are locked, so concurrent reservations cannot
 * oversell. Throws `AppError("insufficient_stock", …, { variantId, requested, available })`.
 */
export async function reserve(input: ReserveInput, ctx?: ServiceContext): Promise<ReservationRef> {
  const lines = mergeLines(input.lines);
  const now = nowOf(ctx);
  const ttl =
    input.ttlMinutes ??
    (input.ownerType === "cart" ? await getSetting(TTL_SETTING, z.number().int().positive(), 30, ctx) : null);
  const expiresAt = ttl == null ? null : new Date(now.getTime() + ttl * 60_000);

  return dbOf(ctx).transaction(async (tx) => {
    await releaseIn(tx, input.ownerId, now, "replaced");
    const rows = await stockRows(
      tx,
      lines.map((l) => l.variantId),
      now,
      true,
    );
    const ref: ReservationRef = { ownerType: input.ownerType, ownerId: input.ownerId, expiresAt, lines: [] };
    for (const line of lines) {
      const avail = toAvailability(line.variantId, rows);
      if (avail.available < line.qty) {
        throw new AppError("insufficient_stock", "not enough stock to reserve", {
          variantId: line.variantId,
          requested: line.qty,
          available: avail.available,
        });
      }
      const candidates = rows
        .filter((r) => r.variantId === line.variantId)
        .map((r) => ({ row: r, free: Math.max(0, r.onHand - r.reserved) }))
        .sort((a, b) => b.free - a.free);
      let remaining = line.qty;
      for (const { row, free } of candidates) {
        if (remaining === 0) break;
        const take = Math.min(free, remaining);
        if (take === 0) continue;
        const [res] = await tx
          .insert(reservations)
          .values({ orderId: input.ownerId, variantId: line.variantId, locationId: row.locationId, qty: take, expiresAt })
          .returning({ id: reservations.id });
        row.reserved += take;
        remaining -= take;
        ref.lines.push({ reservationId: res!.id, variantId: line.variantId, locationCode: row.locationCode, qty: take });
      }
    }
    return ref;
  });
}

/** Release every active reservation of the owner. Returns how many rows were released. */
export async function release(ownerType: ReservationOwnerType, ownerId: string, ctx?: ServiceContext): Promise<number> {
  return releaseIn(dbOf(ctx), ownerId, nowOf(ctx), ownerType === "cart" ? "cart_released" : "cancelled");
}

export async function listLocations(ctx?: ServiceContext): Promise<LocationView[]> {
  const rows = await dbOf(ctx).select().from(locations).where(eq(locations.isActive, true)).orderBy(asc(locations.code));
  return rows.map((l) => ({
    id: l.id,
    code: l.code,
    nameAr: l.nameAr,
    nameEn: l.nameEn,
    kind: l.kind,
    isOrigin: l.isOrigin,
    governorate: l.governorate,
    locality: l.locality,
  }));
}

/** FR-INV-003 dispatch: decrement on-hand at `locationCode` and release the order's reservations. */
export async function commitDispatch(input: CommitDispatchInput, ctx?: ServiceContext): Promise<StockMovementResult> {
  // STUB(contracts): inventory team writes `sale_online` stock_movements (-qty) + updates stock_levels in one tx,
  // releases the order's reservations with reason "dispatched", idempotent per shipmentId.
  stubWarn("inventory.commitDispatch");
  void input;
  void ctx;
  return { movementIds: [] };
}

/** FR-INV-008 return received in sellable condition: increment on-hand. */
export async function restoreOnReceipt(input: RestoreOnReceiptInput, ctx?: ServiceContext): Promise<StockMovementResult> {
  // STUB(contracts): inventory team writes `return` stock_movements (+qty) + stock_levels, idempotent per returnId.
  stubWarn("inventory.restoreOnReceipt");
  void input;
  void ctx;
  return { movementIds: [] };
}

/** FR-INV-006 loss / damage: decrement on-hand with a mandatory reason. */
export async function writeOff(input: WriteOffInput, ctx?: ServiceContext): Promise<StockMovementResult> {
  // STUB(contracts): inventory team writes an `adjustment`/`loss_in_transit` movement (-qty) with the note + audit.
  stubWarn("inventory.writeOff");
  if (!input.reason.trim()) throw new AppError("invalid_input", "write-off needs a reason");
  void ctx;
  return { movementIds: [] };
}

/** FR-INV-010 a dispatched line was short: record the missing qty on the order line. */
export async function recordShortfall(input: RecordShortfallInput, ctx?: ServiceContext): Promise<void> {
  // STUB(contracts): inventory/orders teams set order_lines.shortfall_qty, release the unfilled reservation
  // (reason "shortfall") and emit `order.shortfall_recorded`.
  stubWarn("inventory.recordShortfall");
  void input;
  void ctx;
}

/** FR-INV-011 "notify me when back in stock" request. Real insert; notification on restock is the team's job. */
export async function requestBackInStock(input: BackInStockInput, ctx?: ServiceContext): Promise<{ requestId: string }> {
  // STUB(contracts): inventory team dedupes open requests per contact and notifies (engagement) on restock.
  stubWarn("inventory.requestBackInStock");
  const { phone, email } = input.contact;
  if (!phone && !email && !input.customerId) throw new AppError("invalid_input", "a phone, an email or a customer is required");
  const [row] = await dbOf(ctx)
    .insert(backInStockRequests)
    .values({
      variantId: input.variantId,
      customerId: input.customerId ?? null,
      phoneE164: phone ?? null,
      email: email ?? null,
      channel: phone ? "whatsapp" : "email",
      locale: input.locale,
    })
    .returning({ id: backInStockRequests.id });
  return { requestId: row!.id };
}
