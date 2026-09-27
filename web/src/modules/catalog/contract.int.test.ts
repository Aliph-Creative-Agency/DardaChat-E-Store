import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "../../db/test-utils";
import { resetAndSeed } from "../core/test-seed";
import {
  getPolicy,
  getProduct,
  getProductComponents,
  getStaticPage,
  getVariantBySku,
  getVariants,
  isInSeason,
  listFaq,
  listProducts,
  resolveSlugRedirect,
  search,
} from "./index";
import { slugRedirects } from "./schema";

const { db, close } = createTestDb();
const ctx = { db };

beforeAll(() => resetAndSeed(db));
afterAll(close);

describe("catalog contract (seeded test DB)", () => {
  it("lists the 5 published seed titles with prices and images", async () => {
    const page = await listProducts({ locale: "ar" }, ctx);
    expect(page.total).toBe(5);
    expect(page.items).toHaveLength(5);
    for (const p of page.items) {
      expect(p.status).toBe("published");
      expect(Number.isInteger(p.priceFrom)).toBe(true);
      expect(p.priceFrom).toBeGreaterThan(0);
      expect(p.defaultVariantId).toBeTruthy();
    }
    expect(page.items.map((p) => p.name)).toContain("سهرة رمضان");
    const en = await listProducts({ locale: "en", pageSize: 2, page: 2 }, ctx);
    expect(en).toMatchObject({ total: 5, page: 2, pageSize: 2 });
    expect(en.items).toHaveLength(2);
  });

  it("filters by collection and seasonal titles", async () => {
    const ramadan = await listProducts({ locale: "ar", collection: "ramadan" }, ctx);
    expect(ramadan.total).toBeGreaterThanOrEqual(2);
    expect(ramadan.items.map((p) => p.slug)).toEqual(expect.arrayContaining(["sahret-ramadan", "fawazeer-el-eileh"]));
    const seasonal = await listProducts({ locale: "en", seasonalOnly: true }, ctx);
    expect(seasonal.items.every((p) => p.seasonal)).toBe(true);
    expect(seasonal.total).toBe(2);
    expect((await listProducts({ locale: "ar", collection: "nope" }, ctx)).total).toBe(0);
  });

  it("an Arabic query finds a seeded title", async () => {
    const hits = await search("رمضان", { locale: "ar" }, ctx);
    expect(hits.map((h) => h.slug)).toContain("sahret-ramadan");
    expect(await search("   ", { locale: "ar" }, ctx)).toEqual([]);
  });

  it("resolves SKU DC-RMD-001 and loads variants by id without cost", async () => {
    const v = await getVariantBySku("DC-RMD-001", ctx);
    expect(v).toMatchObject({ sku: "DC-RMD-001", price: 8900, productSlug: "sahret-ramadan", status: "active" });
    expect(v).not.toHaveProperty("cost");
    const [again] = await getVariants([v!.id, "00000000-0000-0000-0000-000000000000"], ctx);
    expect(again?.id).toBe(v!.id);
    expect(await getVariantBySku("NOPE", ctx)).toBeNull();
  });

  it("product detail by slug and id with components, media and windows", async () => {
    const bySlug = await getProduct("sahret-ramadan", { locale: "en" }, ctx);
    expect(bySlug?.name).toBeTruthy();
    expect(bySlug?.variants).toHaveLength(1);
    expect(bySlug?.components.length).toBeGreaterThan(0);
    expect(bySlug?.seasonalWindows[0]).toMatchObject({ startsOn: "2027-01-15", endsOn: "2027-03-12" });
    const byId = await getProduct(bySlug!.id, { locale: "ar" }, ctx);
    expect(byId?.slug).toBe("sahret-ramadan");
    const components = await getProductComponents(bySlug!.id, { locale: "ar" }, ctx);
    expect(components[0]?.name).toBe(components[0]?.nameAr);
    expect(await getProduct("does-not-exist", { locale: "ar" }, ctx)).toBeNull();
  });

  it("a Ramadan title is in season on 2027-02-01 and not on 2027-06-01; all-year titles always", async () => {
    const p = await getProduct("sahret-ramadan", { locale: "ar" }, ctx);
    expect(await isInSeason(p!.id, new Date("2027-02-01T10:00:00Z"), ctx)).toBe(true);
    expect(await isInSeason(p!.id, new Date("2027-06-01T10:00:00Z"), ctx)).toBe(false);
    // ends inclusive in Asia/Jerusalem: 2027-03-12 23:30 local = 21:30Z is still in season
    expect(await isInSeason(p!.id, new Date("2027-03-12T21:30:00Z"), ctx)).toBe(true);
    const allYear = await getProduct("baynatna", { locale: "ar" }, ctx);
    expect(await isInSeason(allYear!.id, new Date("2027-06-01T10:00:00Z"), ctx)).toBe(true);
    const out = await getProduct("sahret-ramadan", { locale: "ar" }, { db, now: new Date("2027-06-01T10:00:00Z") });
    expect(out?.inSeason).toBe(false);
  });

  it("slug redirects resolve to the current slug", async () => {
    const p = await getProduct("baynatna", { locale: "ar" }, ctx);
    await db.insert(slugRedirects).values({ fromSlug: "old-baynatna", productId: p!.id });
    expect(await resolveSlugRedirect("old-baynatna", ctx)).toEqual({ productId: p!.id, slug: "baynatna" });
    expect(await resolveSlugRedirect("never", ctx)).toBeNull();
  });

  it("policy `returns` v1 in both locales, FAQ and the about page", async () => {
    const ar = await getPolicy("returns", "ar", ctx);
    const en = await getPolicy("returns", "en", ctx);
    expect(ar?.version).toBe("v1");
    expect(en?.version).toBe("v1");
    expect(ar?.title).not.toBe(en?.title);
    expect(ar?.body).toMatch(/[؀-ۿ]/);
    const faq = await listFaq("ar", ctx);
    expect(faq.length).toBeGreaterThan(0);
    expect(faq[0]?.question).toMatch(/[؀-ۿ]/);
    const about = await getStaticPage("about", "en", ctx);
    expect(about?.title).toBeTruthy();
  });
});
