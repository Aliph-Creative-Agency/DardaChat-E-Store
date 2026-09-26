import { describe, expect, it } from "vitest";
import { agorot } from "./money";
import { allocateDiscount, computeOrderTotals, vatContained, VatError } from "./vat";

const a = (n: number) => agorot(n);

describe("vatContained", () => {
  it("SRS example: 110.00 at 16% contains 15.17 VAT", () => {
    expect(vatContained(a(11000), 1600)).toBe(1517);
  });

  it("rounds half-up at the agora", () => {
    expect(vatContained(a(116), 1600)).toBe(16); // exact
    expect(vatContained(a(1), 1600)).toBe(0); // 0.138
    expect(vatContained(a(29), 1600)).toBe(4); // 4.0
    expect(vatContained(a(25), 1600)).toBe(3); // 3.448
    expect(vatContained(a(26), 1600)).toBe(4); // 3.586
    expect(vatContained(a(-11000), 1600)).toBe(-1517); // credit notes mirror sales
  });

  it("zero rate gives zero VAT", () => {
    expect(vatContained(a(99999), 0)).toBe(0);
  });

  it("rejects invalid rates", () => {
    expect(() => vatContained(a(100), -1)).toThrow(VatError);
    expect(() => vatContained(a(100), 16.5)).toThrow(VatError);
  });
});

describe("allocateDiscount", () => {
  it("splits proportionally and sums exactly", () => {
    expect(allocateDiscount([a(1000), a(2000), a(3000)], a(600))).toEqual([100, 200, 300]);
  });

  it("uses largest remainder so the parts sum to the discount", () => {
    const parts = allocateDiscount([a(1), a(1), a(1)], a(2));
    expect(parts.reduce((x, y) => x + y, 0)).toBe(2);
    expect(parts).toEqual([1, 1, 0]);
    expect(allocateDiscount([a(333), a(667)], a(100))).toEqual([33, 67]);
  });

  it("refuses a discount larger than the subtotal or negative", () => {
    expect(() => allocateDiscount([a(100)], a(101))).toThrow(VatError);
    expect(() => allocateDiscount([a(100)], a(-1))).toThrow(VatError);
  });

  it("handles zero discount and empty lines", () => {
    expect(allocateDiscount([a(100), a(200)], a(0))).toEqual([0, 0]);
    expect(allocateDiscount([], a(0))).toEqual([]);
  });
});

describe("computeOrderTotals", () => {
  it("SRS example: a 110.00 order shows 'of which VAT' 15.17; the total is never 123.79", () => {
    const t = computeOrderTotals({
      lines: [{ unitPrice: a(4500), quantity: 2 }],
      discount: a(0),
      delivery: a(2000),
      rateBp: 1600,
    });
    expect(t.subtotal).toBe(9000);
    expect(t.total).toBe(11000);
    expect(t.vat).toBe(1517);
    expect(t.subtotal - t.discount + t.delivery).toBe(t.total);
    expect(t.total).not.toBe(12379);
    // Adding the VAT line as a fifth addend is exactly the overstatement FR-CRT-007 forbids.
    expect(t.subtotal - t.discount + t.delivery + t.vat).toBeGreaterThan(t.total);
  });

  it("VAT equals Σ post-discount line VAT + delivery VAT, rounded once", () => {
    const t = computeOrderTotals({
      lines: [
        { unitPrice: a(3333), quantity: 1 },
        { unitPrice: a(1999), quantity: 3 },
        { unitPrice: a(7), quantity: 5 },
      ],
      discount: a(1234),
      delivery: a(1500),
      rateBp: 1600,
    });
    const unrounded = t.lines.reduce((s, l) => s + l.lineVatUnrounded, 0) + t.deliveryVatUnrounded;
    expect(t.vat).toBe(Math.round(unrounded));
    expect(t.lines.reduce((s, l) => s + l.discount, 0)).toBe(1234);
    expect(t.lines.every((l) => l.netTotal === l.lineTotal - l.discount)).toBe(true);
    // rounding each line separately would differ from the single order-level rounding in general
    expect(t.lines.map((l) => l.lineVatUnrounded).some((v) => !Number.isInteger(v))).toBe(true);
  });

  it("refuses a discount above the subtotal and bad quantities", () => {
    expect(() =>
      computeOrderTotals({ lines: [{ unitPrice: a(100), quantity: 1 }], discount: a(200), delivery: a(0), rateBp: 1600 }),
    ).toThrow(VatError);
    expect(() =>
      computeOrderTotals({ lines: [{ unitPrice: a(100), quantity: 0 }], discount: a(0), delivery: a(0), rateBp: 1600 }),
    ).toThrow(VatError);
  });

  it("zero-rate orders carry no VAT", () => {
    const t = computeOrderTotals({
      lines: [{ unitPrice: a(5000), quantity: 2 }],
      discount: a(100),
      delivery: a(1000),
      rateBp: 0,
    });
    expect(t.vat).toBe(0);
    expect(t.total).toBe(10900);
  });

  it("property: identity, exact discount split and one-step rounding hold for 500 random orders", () => {
    let seed = 42;
    const rnd = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };
    for (let i = 0; i < 500; i++) {
      const lines = Array.from({ length: 1 + rnd(6) }, () => ({ unitPrice: a(rnd(50000)), quantity: 1 + rnd(5) }));
      const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
      const discount = a(subtotal === 0 ? 0 : rnd(subtotal + 1));
      const delivery = a(rnd(3000));
      const rateBp = [0, 1600, 1700][rnd(3)] ?? 1600;
      const t = computeOrderTotals({ lines, discount, delivery, rateBp });
      expect(t.subtotal - t.discount + t.delivery).toBe(t.total);
      expect(t.lines.reduce((s, l) => s + l.discount, 0)).toBe(discount);
      const unrounded = t.lines.reduce((s, l) => s + l.lineVatUnrounded, 0) + t.deliveryVatUnrounded;
      expect(Math.abs(t.vat - unrounded)).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(t.vat).toBeLessThanOrEqual(t.total);
      for (const l of t.lines) expect(l.discount).toBeLessThanOrEqual(l.lineTotal);
    }
  });
});
