import { createHmac, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "../../db/test-utils";
import { isAppError } from "../../lib/errors";
import { resetAndSeed } from "../core/test-seed";
import {
  computeTotals,
  getActiveVatRate,
  getPaymentSummary,
  handleProviderWebhook,
  initiatePayment,
  issueInvoiceIfDue,
  refund,
  verifyWebhookSignature,
} from "./index";

const { db, close } = createTestDb();
const ctx = { db };
const SECRET = "test-webhook-secret-0123456789abcdef";

beforeAll(async () => {
  process.env.PAYMENT_WEBHOOK_SECRET = SECRET;
  await resetAndSeed(db);
});
afterAll(close);

const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");

describe("payments contract (seeded test DB)", () => {
  it("active VAT rate is the seeded 16 %", async () => {
    expect(await getActiveVatRate(new Date("2026-09-26T12:00:00Z"), ctx)).toBe(1600);
    await expect(getActiveVatRate(new Date("2019-06-01T12:00:00Z"), ctx)).rejects.toMatchObject({ code: "not_found" });
  });

  it("SRS example: 110.00 at 16 % contains VAT and never becomes 123.79", async () => {
    const t = await computeTotals({ lines: [{ unitPrice: 11000, qty: 1 }], deliveryFee: 0 }, ctx);
    expect(t.total).toBe(11000);
    expect(t.total).not.toBe(12379);
    expect(t.vat).toBe(1517); // 11000 × 16/116 = 1517.24 → 15.17 of which VAT
    expect(t.rateBp).toBe(1600);
  });

  it("totals include delivery and a proportionally allocated discount", async () => {
    const t = await computeTotals(
      { lines: [{ unitPrice: 8900, qty: 1 }, { unitPrice: 6900, qty: 2 }], discount: 1000, deliveryFee: 2000 },
      ctx,
    );
    expect(t.subtotal).toBe(8900 + 13800);
    expect(t.total).toBe(8900 + 13800 - 1000 + 2000);
    expect(t.lines.reduce((s, l) => s + l.discount, 0)).toBe(1000);
    await expect(
      computeTotals({ lines: [{ unitPrice: 100, qty: 1, vatRateBp: 0 }, { unitPrice: 100, qty: 1 }], deliveryFee: 0 }, ctx),
    ).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("webhook: bad signature rejected, good signature accepted", async () => {
    const body = JSON.stringify({ type: "payment.succeeded", id: "evt_1" });
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
    expect(verifyWebhookSignature(body, `sha256=${sign(body)}`)).toBe(true);
    expect(verifyWebhookSignature(body, sign(body + "x"))).toBe(false);
    expect(verifyWebhookSignature(body, "nothex")).toBe(false);
    expect(verifyWebhookSignature(body, null)).toBe(false);
    expect(await handleProviderWebhook(body, "0".repeat(64), ctx)).toEqual({ accepted: false, duplicate: false });
    expect(await handleProviderWebhook(body, sign(body), ctx)).toEqual({ accepted: true, duplicate: false });
  });

  it("stubs return typed values / NotImplemented", async () => {
    const orderId = randomUUID();
    const card = await initiatePayment({ orderId, method: "card", returnUrl: "/ar/orders/x", locale: "ar" }, ctx);
    expect(card.redirectUrl).toMatch(/^\/ar\/checkout\/mock-pay\?/);
    expect((await initiatePayment({ orderId, method: "cod", returnUrl: "/", locale: "en" }, ctx)).redirectUrl).toBeNull();
    const err = await refund({ orderId, amount: 100, method: "card", reason: "test" }, ctx).catch((e: unknown) => e);
    expect(isAppError(err, "not_implemented")).toBe(true);
    expect(await issueInvoiceIfDue(orderId, ctx)).toBeNull();
    expect(await getPaymentSummary(orderId, ctx)).toEqual({ orderId, paidAmount: 0, lastStatus: null, events: [] });
  });
});
