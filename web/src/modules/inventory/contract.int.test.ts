import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "../../db/test-utils";
import { isAppError } from "../../lib/errors";
import { getVariantBySku } from "../catalog";
import { resetAndSeed } from "../core/test-seed";
import { getAvailability, listLocations, release, requestBackInStock, reserve } from "./index";
import { reservations } from "./schema";

const { db, close } = createTestDb();
const ctx = { db };
let variantId = "";
let seededOnHand = 0;

beforeAll(async () => {
  await resetAndSeed(db);
  variantId = (await getVariantBySku("DC-FRN-001", ctx))!.id;
  const [row] = await db.execute<{ total: number }>(
    sql`select coalesce(sum(on_hand), 0)::int as total from stock_levels where variant_id = ${variantId}`,
  );
  seededOnHand = row!.total;
});
afterAll(close);

describe("inventory contract (seeded test DB)", () => {
  it("availability of a seeded SKU equals the seeded on-hand, split by origin", async () => {
    expect(seededOnHand).toBeGreaterThan(2);
    const [a] = await getAvailability([variantId], ctx);
    expect(a).toMatchObject({ variantId, available: seededOnHand, onHand: seededOnHand, reserved: 0 });
    expect(a!.byLocation.map((l) => l.locationCode).sort()).toEqual(["HOME", "STORE"]);
    const [none] = await getAvailability([randomUUID()], ctx);
    expect(none).toMatchObject({ available: 0, onHand: 0, byLocation: [] });
  });

  it("reserve 2 → available −2; release → restored", async () => {
    const cartId = randomUUID();
    const ref = await reserve({ ownerType: "cart", ownerId: cartId, lines: [{ variantId, qty: 2 }] }, ctx);
    expect(ref.lines.reduce((s, l) => s + l.qty, 0)).toBe(2);
    expect(ref.expiresAt).toBeInstanceOf(Date); // cart TTL from settings
    expect((await getAvailability([variantId], ctx))[0]!.available).toBe(seededOnHand - 2);
    // re-reserving replaces the owner's hold instead of stacking
    await reserve({ ownerType: "cart", ownerId: cartId, lines: [{ variantId, qty: 1 }] }, ctx);
    expect((await getAvailability([variantId], ctx))[0]!.available).toBe(seededOnHand - 1);
    expect(await release("cart", cartId, ctx)).toBe(1);
    expect((await getAvailability([variantId], ctx))[0]!.available).toBe(seededOnHand);
  });

  it("reserving more than available → insufficient_stock with details, nothing held", async () => {
    const ownerId = randomUUID();
    const error = await reserve({ ownerType: "order", ownerId, lines: [{ variantId, qty: seededOnHand + 1 }] }, ctx).catch(
      (e: unknown) => e,
    );
    expect(isAppError(error, "insufficient_stock")).toBe(true);
    expect((error as { details: unknown }).details).toMatchObject({ variantId, available: seededOnHand });
    const held = await db.select().from(reservations).where(eq(reservations.orderId, ownerId));
    expect(held).toHaveLength(0);
  });

  it("can take the whole stock across both origins", async () => {
    const ownerId = randomUUID();
    const ref = await reserve({ ownerType: "order", ownerId, lines: [{ variantId, qty: seededOnHand }] }, ctx);
    expect(ref.expiresAt).toBeNull();
    expect(new Set(ref.lines.map((l) => l.locationCode)).size).toBeGreaterThanOrEqual(1);
    expect((await getAvailability([variantId], ctx))[0]!.available).toBe(0);
    await release("order", ownerId, ctx);
  });

  it("expired reservations are ignored", async () => {
    const ownerId = randomUUID();
    await reserve({ ownerType: "cart", ownerId, lines: [{ variantId, qty: 2 }], ttlMinutes: 1 }, ctx);
    const later = { db, now: new Date(Date.now() + 2 * 60_000) };
    expect((await getAvailability([variantId], later))[0]!.available).toBe(seededOnHand);
    expect((await getAvailability([variantId], ctx))[0]!.available).toBe(seededOnHand - 2);
    await release("cart", ownerId, ctx);
  });

  it("lists the two origins and records a back-in-stock request", async () => {
    const locs = await listLocations(ctx);
    expect(locs.filter((l) => l.isOrigin).map((l) => l.code).sort()).toEqual(["HOME", "STORE"]);
    const { requestId } = await requestBackInStock({ variantId, contact: { phone: "+970599000333" }, locale: "ar" }, ctx);
    expect(requestId).toBeTruthy();
  });
});
