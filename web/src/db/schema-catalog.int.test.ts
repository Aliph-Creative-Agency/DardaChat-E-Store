import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { policies, productComponents, products, seasonalWindows, slugRedirects, variants } from "./schema";
import { createTestDb, truncateAll } from "./test-utils";

const { db, close } = createTestDb();

beforeAll(() => truncateAll(db));
afterAll(() => close());

async function searchIds(term: string): Promise<string[]> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(sql`${products.search} @@ plainto_tsquery('simple', catalog_search_normalize(${term}))`);
  return rows.map((r) => r.id);
}

describe("catalog + CMS schema", () => {
  let productId = "";

  it("creates a product with three variants and components", async () => {
    const [p] = await db
      .insert(products)
      .values({
        slug: "sahra-ramadaniya",
        status: "published",
        nameAr: "سهرة رمضانية",
        nameEn: "Ramadan Evening",
        descriptionAr: "لعبة أسئلة وتحديات للعائلة بعد الإفطار",
        descriptionEn: "A family game of questions and challenges for after iftar",
        group: "family",
        occasion: "ramadan",
        tags: ["family", "ramadan", "عائلة"],
        playerMin: 3,
        playerMax: 10,
      })
      .returning();
    productId = p!.id;
    await db.insert(variants).values([
      { productId, sku: "DC-SR-STD", price: 12000, cost: 4500, weightG: 650 },
      { productId, sku: "DC-SR-DLX", price: 18000, cost: 7000, weightG: 900 },
      { productId, sku: "DC-SR-MINI", price: 7500, cost: 2500, weightG: 300 },
    ]);
    await db.insert(productComponents).values([
      { productId, kind: "question_cards", nameAr: "بطاقات أسئلة", nameEn: "Question cards", count: 100 },
      { productId, kind: "prop", nameAr: "ساعة رملية", nameEn: "Sand timer", count: 1 },
    ]);
    const vs = await db.select().from(variants).where(eq(variants.productId, productId));
    expect(new Set(vs.map((v) => v.sku)).size).toBe(3);
    expect(vs.every((v) => v.status === "active")).toBe(true);

    // duplicate SKU refused
    await expect(db.insert(variants).values({ productId, sku: "DC-SR-STD", price: 1 })).rejects.toThrow();
  });

  it("finds the product by an Arabic word and an English word via FTS", async () => {
    await db.insert(products).values({ slug: "other", nameAr: "لعبة أخرى", nameEn: "Another game" });
    expect(await searchIds("الإفطار")).toEqual([productId]); // Arabic, description only
    expect(await searchIds("الافطار")).toEqual([productId]); // hamza-less spelling matches (normalised)
    expect(await searchIds("iftar")).toEqual([productId]); // English, description only
    expect(await searchIds("RAMADAN")).toEqual([productId]); // case-insensitive
    expect(await searchIds("عائله")).toEqual([productId]); // tag, taa marbuta normalised
    expect(await searchIds("nonexistentword")).toEqual([]);

    // search vector follows edits
    await db.update(products).set({ descriptionEn: "Now about suhoor" }).where(eq(products.id, productId));
    expect(await searchIds("iftar")).toEqual([]);
    expect(await searchIds("suhoor")).toEqual([productId]);
  });

  it("enforces seasonal window range, slug redirects and policy versions", async () => {
    await db.insert(seasonalWindows).values({ productId, startsOn: "2027-01-25", endsOn: "2027-03-15" });
    await expect(
      db.insert(seasonalWindows).values({ productId, startsOn: "2027-03-15", endsOn: "2027-01-01" }),
    ).rejects.toThrow();

    await db.insert(slugRedirects).values({ fromSlug: "old-slug", productId });
    await expect(db.insert(slugRedirects).values({ fromSlug: "old-slug", productId })).rejects.toThrow();

    const base = { kind: "privacy" as const, titleAr: "الخصوصية", titleEn: "Privacy", bodyAr: "…", bodyEn: "…" };
    await db.insert(policies).values({ ...base, version: "v1", effectiveAt: new Date("2026-01-01T00:00:00Z") });
    await db.insert(policies).values({ ...base, version: "v2", effectiveAt: new Date("2026-06-01T00:00:00Z") });
    await expect(
      db.insert(policies).values({ ...base, version: "v1", effectiveAt: new Date() }),
    ).rejects.toThrow();
    const all = await db.select().from(policies).where(eq(policies.kind, "privacy"));
    expect(all).toHaveLength(2); // superseded version retained (FR-CMS-002)
  });
});
