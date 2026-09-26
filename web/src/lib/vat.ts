/**
 * VAT for a VAT-inclusive market (AS-06, FR-CRT-007, FR-CRT-009, FR-CUR-005).
 * - Prices, delivery and totals are gross (VAT included). VAT is an "of which" figure, never added to the total.
 * - Rates are basis points: 1600 = 16%.
 * - Discounts are allocated to lines in proportion to line value (largest remainder, sums exactly).
 * - Delivery carries VAT at the goods rate.
 * - Order VAT = Σ post-discount line VAT + delivery VAT, kept unrounded and rounded ONCE at order level (half-up).
 */
import { agorot, MoneyError, type Agorot } from "./money";

export class VatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VatError";
  }
}

function assertRate(rateBp: number) {
  if (!Number.isSafeInteger(rateBp) || rateBp < 0 || rateBp > 10000) {
    throw new VatError(`invalid VAT rate: ${rateBp} bp`);
  }
}

/** Unrounded VAT contained in a gross amount (for display/audit of per-line figures only). */
export function vatContainedUnrounded(gross: Agorot, rateBp: number): number {
  assertRate(rateBp);
  return (gross * rateBp) / (10000 + rateBp);
}

/** VAT contained in a gross amount, rounded half-up to the agora using integer arithmetic only. */
export function vatContained(gross: Agorot, rateBp: number): Agorot {
  assertRate(rateBp);
  if (gross < 0) return agorot(-vatContained(agorot(-gross), rateBp));
  const denom = 10000 + rateBp;
  const num = gross * rateBp;
  if (!Number.isSafeInteger(num * 2)) throw new MoneyError("amount too large for VAT computation");
  return agorot(Math.floor((2 * num + denom) / (2 * denom)));
}

/**
 * Split `discount` across `lineTotals` proportionally; the parts sum exactly to `discount` and no part exceeds
 * its line. Remainder agorot go to the lines with the largest fractional share (ties → earlier line).
 */
export function allocateDiscount(lineTotals: readonly Agorot[], discount: Agorot): Agorot[] {
  if (discount < 0) throw new VatError("discount must not be negative");
  for (const t of lineTotals) if (t < 0) throw new VatError("line totals must not be negative");
  const subtotal = lineTotals.reduce((x, y) => x + y, 0);
  if (discount > subtotal) throw new VatError(`discount ${discount} exceeds subtotal ${subtotal}`);
  if (discount === 0 || subtotal === 0) return lineTotals.map(() => agorot(0));

  const parts = lineTotals.map((t, index) => {
    const exact = t * discount; // share = exact / subtotal
    if (!Number.isSafeInteger(exact)) throw new MoneyError("amount too large for discount allocation");
    return { index, share: Math.floor(exact / subtotal), remainder: exact % subtotal };
  });
  let left = discount - parts.reduce((x, p) => x + p.share, 0);
  const byRemainder = [...parts].sort((x, y) => y.remainder - x.remainder || x.index - y.index);
  for (const p of byRemainder) {
    if (left === 0) break;
    p.share += 1;
    left -= 1;
  }
  return parts.map((p) => agorot(p.share));
}

export interface OrderLineInput {
  unitPrice: Agorot;
  quantity: number;
}

export interface OrderTotalsInput {
  lines: readonly OrderLineInput[];
  discount: Agorot;
  delivery: Agorot;
  rateBp: number;
}

export interface OrderLineTotals {
  /** unitPrice × quantity (gross, before discount) */
  lineTotal: Agorot;
  /** this line's share of the order discount */
  discount: Agorot;
  /** lineTotal − discount */
  netTotal: Agorot;
  /** VAT contained in netTotal, unrounded (display/audit only) */
  lineVatUnrounded: number;
}

export interface OrderTotals {
  subtotal: Agorot;
  discount: Agorot;
  delivery: Agorot;
  /** subtotal − discount + delivery (FR-CRT-007) */
  total: Agorot;
  /** "of which VAT" — contained in total, never added to it (FR-CRT-007/009) */
  vat: Agorot;
  deliveryVatUnrounded: number;
  rateBp: number;
  lines: OrderLineTotals[];
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const { rateBp } = input;
  assertRate(rateBp);
  if (input.delivery < 0) throw new VatError("delivery must not be negative");
  const lineTotals = input.lines.map((l) => {
    if (!Number.isSafeInteger(l.quantity) || l.quantity <= 0) throw new VatError(`invalid quantity: ${l.quantity}`);
    if (l.unitPrice < 0) throw new VatError("unit price must not be negative");
    return agorot(l.unitPrice * l.quantity);
  });
  const subtotal = agorot(lineTotals.reduce((x, y) => x + y, 0));
  const shares = allocateDiscount(lineTotals, input.discount);
  const lines = lineTotals.map((lineTotal, i) => {
    const discount = shares[i] ?? agorot(0);
    const netTotal = agorot(lineTotal - discount);
    return { lineTotal, discount, netTotal, lineVatUnrounded: vatContainedUnrounded(netTotal, rateBp) };
  });
  const total = agorot(subtotal - input.discount + input.delivery);
  // Σ(net line VAT) + delivery VAT with one rounding step. At a single rate that sum is exactly the VAT contained in
  // the total, so it is computed with integer arithmetic instead of adding floats.
  const vat = vatContained(total, rateBp);
  return {
    subtotal,
    discount: input.discount,
    delivery: input.delivery,
    total,
    vat,
    deliveryVatUnrounded: vatContainedUnrounded(input.delivery, rateBp),
    rateBp,
    lines,
  };
}
