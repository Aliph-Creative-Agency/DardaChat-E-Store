/** Inventory contract DTOs (FR-INV-001..011, FR-CRT reservations). Quantities are integers (units). */

export interface LocationStock {
  locationCode: string;
  onHand: number;
  /** Units held by active, unexpired reservations at this location. */
  reserved: number;
}

export interface Availability {
  variantId: string;
  /** Sellable now: Σ max(0, onHand − reserved) over active origin locations. */
  available: number;
  onHand: number;
  reserved: number;
  byLocation: LocationStock[];
}

export interface StockLineInput {
  variantId: string;
  qty: number;
}

/** Who holds a reservation. `ownerId` is the cart id or the order id (stored in `reservations.order_id`). */
export type ReservationOwnerType = "cart" | "order";

export interface ReserveInput {
  ownerType: ReservationOwnerType;
  ownerId: string;
  lines: StockLineInput[];
  /**
   * Minutes until the hold lapses. Default for carts: setting `inventory.reservation_ttl_minutes` (30);
   * default for orders: no expiry (released on dispatch / cancellation).
   */
  ttlMinutes?: number;
}

export interface ReservationRef {
  ownerType: ReservationOwnerType;
  ownerId: string;
  expiresAt: Date | null;
  lines: { reservationId: string; variantId: string; locationCode: string; qty: number }[];
}

export interface LocationView {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  kind: "store_room" | "household" | "other";
  isOrigin: boolean;
  governorate: string | null;
  locality: string | null;
}

export interface CommitDispatchInput {
  orderId: string;
  shipmentId?: string;
  lines: StockLineInput[];
  locationCode: string;
}

export interface RestoreOnReceiptInput {
  orderId: string;
  returnId?: string;
  lines: StockLineInput[];
  locationCode: string;
}

export interface WriteOffInput {
  variantId: string;
  qty: number;
  locationCode: string;
  /** Mandatory note (FR-INV-006), e.g. "damaged in transit". */
  reason: string;
}

export interface StockMovementResult {
  /** `stock_movements` ids written (empty while stubbed). */
  movementIds: string[];
}

export interface RecordShortfallInput {
  orderId: string;
  orderLineId: string;
  qty: number;
}

export interface BackInStockInput {
  variantId: string;
  contact: { phone?: string; email?: string };
  locale: "ar" | "en";
  customerId?: string;
}
