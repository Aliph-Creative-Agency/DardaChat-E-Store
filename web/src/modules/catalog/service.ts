/**
 * Catalog contract implementation (Phase 0, PLATFORM): real read queries on the seeded DB. The catalog team owns
 * admin writes (publish rules FR-CAT-003/010, media upload, slug changes) and may rewrite these bodies freely as
 * long as the signatures in index.ts hold.
 */
import { and, asc, count, desc, eq, inArray, lte, sql, type SQL } from "drizzle-orm";
import { dbOf, nowOf, type ServiceContext } from "../../lib/context";
import { mediaUrl } from "../../lib/storage";
import { businessDate } from "../../lib/time";
import {
  collectionProducts,
  collections,
  faqEntries,
  mediaAssets,
  policies,
  productComponents,
  products,
  seasonalWindows,
  slugRedirects,
  staticPages,
  variants,
} from "./schema";
import type {
  ComponentView,
  FaqEntryView,
  GetProductOptions,
  ListProductsQuery,
  Locale,
  MediaView,
  PolicyKind,
  PolicyView,
  ProductDetail,
  ProductPage,
  ProductSummary,
  SearchOptions,
  SeasonalWindowView,
  SlugRedirect,
  StaticPageView,
  VariantInfo,
} from "./types";

type ProductRow = typeof products.$inferSelect;
/** Variant row without `cost` (owner-only, FR-CAT-008). */
type VariantRow = Omit<typeof variants.$inferSelect, "cost">;
type WindowRow = typeof seasonalWindows.$inferSelect;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pick(locale: Locale, ar: string | null | undefined, en: string | null | undefined): string | null {
  return (locale === "ar" ? (ar ?? en) : (en ?? ar)) ?? null;
}

function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

function inWindow(windows: Pick<WindowRow, "startsOn" | "endsOn">[], day: string): boolean {
  if (windows.length === 0) return true;
  return windows.some((w) => w.startsOn <= day && day <= w.endsOn);
}

function toVariantInfo(v: VariantRow, p: Pick<ProductRow, "slug" | "nameAr" | "nameEn" | "status">): VariantInfo {
  return {
    id: v.id,
    productId: v.productId,
    productSlug: p.slug,
    sku: v.sku,
    nameAr: v.nameAr ?? p.nameAr ?? p.nameEn ?? v.sku,
    nameEn: v.nameEn ?? p.nameEn ?? p.nameAr ?? v.sku,
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? null,
    vatRateBp: null,
    status: v.status,
    productStatus: p.status,
    weightG: v.weightG,
    position: v.position,
  };
}

// Explicit column list: never select `cost` (FR-CAT-008).
const variantColumns = {
  id: variants.id,
  productId: variants.productId,
  sku: variants.sku,
  nameAr: variants.nameAr,
  nameEn: variants.nameEn,
  price: variants.price,
  compareAtPrice: variants.compareAtPrice,
  weightG: variants.weightG,
  status: variants.status,
  position: variants.position,
  createdAt: variants.createdAt,
  updatedAt: variants.updatedAt,
};

/** Batch-build summaries for product rows, keeping their order. */
async function summarize(rows: ProductRow[], locale: Locale, ctx?: ServiceContext): Promise<ProductSummary[]> {
  if (rows.length === 0) return [];
  const db = dbOf(ctx);
  const ids = rows.map((r) => r.id);
  const [vRows, mRows, wRows] = await Promise.all([
    db.select(variantColumns).from(variants).where(inArray(variants.productId, ids)).orderBy(asc(variants.position)),
    db
      .select()
      .from(mediaAssets)
      .where(and(inArray(mediaAssets.productId, ids), eq(mediaAssets.kind, "image")))
      .orderBy(asc(mediaAssets.position)),
    db.select().from(seasonalWindows).where(inArray(seasonalWindows.productId, ids)),
  ]);
  const vBy = groupBy(vRows, (v) => v.productId);
  const mBy = groupBy(mRows, (m) => m.productId);
  const wBy = groupBy(wRows, (w) => w.productId);
  const today = businessDate(nowOf(ctx));
  return rows.map((p) => {
    const active = (vBy.get(p.id) ?? []).filter((v) => v.status === "active");
    const image = mBy.get(p.id)?.[0];
    const windows = wBy.get(p.id) ?? [];
    const compare = active.map((v) => v.compareAtPrice).filter((c): c is number => c != null);
    return {
      id: p.id,
      slug: p.slug,
      name: pick(locale, p.nameAr, p.nameEn) ?? p.slug,
      tagline: pick(locale, p.seoDescriptionAr, p.seoDescriptionEn),
      group: p.group,
      occasion: p.occasion,
      status: p.status,
      priceFrom: active.length ? Math.min(...active.map((v) => v.price)) : 0,
      compareAtPriceFrom: compare.length ? Math.max(...compare) : null,
      imageUrl: image ? mediaUrl(image.storageKey) : null,
      imageAlt: image ? pick(locale, image.altAr, image.altEn) : null,
      inSeason: inWindow(windows, today),
      seasonal: windows.length > 0,
      defaultVariantId: active[0]?.id ?? null,
    };
  });
}

export async function getProduct(idOrSlug: string, opts: GetProductOptions, ctx?: ServiceContext): Promise<ProductDetail | null> {
  const db = dbOf(ctx);
  const where: SQL[] = [UUID.test(idOrSlug) ? eq(products.id, idOrSlug) : eq(products.slug, idOrSlug)];
  if (!opts.includeUnpublished) where.push(eq(products.status, "published"));
  const [p] = await db.select().from(products).where(and(...where)).limit(1);
  if (!p) return null;
  const locale = opts.locale;
  const [summary] = await summarize([p], locale, ctx);
  const [vRows, mRows, components, wRows] = await Promise.all([
    db.select(variantColumns).from(variants).where(eq(variants.productId, p.id)).orderBy(asc(variants.position)),
    db.select().from(mediaAssets).where(eq(mediaAssets.productId, p.id)).orderBy(asc(mediaAssets.position)),
    getProductComponents(p.id, { locale }, ctx),
    db.select().from(seasonalWindows).where(eq(seasonalWindows.productId, p.id)).orderBy(asc(seasonalWindows.startsOn)),
  ]);
  const today = businessDate(nowOf(ctx));
  const media: MediaView[] = mRows.map((m) => ({
    id: m.id,
    kind: m.kind,
    url: mediaUrl(m.storageKey),
    alt: pick(locale, m.altAr, m.altEn),
    width: m.width,
    height: m.height,
    mimeType: m.mimeType,
  }));
  const windows: SeasonalWindowView[] = wRows.map((w) => ({
    startsOn: w.startsOn,
    endsOn: w.endsOn,
    returnsNote: pick(locale, w.returnsNoteAr, w.returnsNoteEn),
  }));
  const inSeason = inWindow(wRows, today);
  return {
    ...summary!,
    description: pick(locale, p.descriptionAr, p.descriptionEn),
    playInstructions: pick(locale, p.playInstructionsAr, p.playInstructionsEn),
    seoTitle: pick(locale, p.seoTitleAr, p.seoTitleEn),
    seoDescription: pick(locale, p.seoDescriptionAr, p.seoDescriptionEn),
    tags: p.tags,
    playerMin: p.playerMin,
    playerMax: p.playerMax,
    minAge: p.minAge,
    durationMin: p.durationMin,
    publishedAt: p.publishedAt,
    variants: (vRows).map((v) => toVariantInfo(v, p)),
    media,
    components,
    seasonalWindows: windows,
    nextSeasonStart: inSeason ? null : (wRows.find((w) => w.startsOn > today)?.startsOn ?? null),
  };
}

export async function listProducts(query: ListProductsQuery, ctx?: ServiceContext): Promise<ProductPage> {
  const db = dbOf(ctx);
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize ?? 24)));
  const where: SQL[] = [];
  if (!query.includeUnpublished) where.push(eq(products.status, "published"));
  if (query.group) where.push(eq(products.group, query.group));
  if (query.seasonalOnly) {
    where.push(sql`exists (select 1 from ${seasonalWindows} where ${seasonalWindows.productId} = ${products.id})`);
  }
  let collectionId: string | undefined;
  if (query.collection) {
    const [c] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.slug, query.collection), eq(collections.isActive, true)))
      .limit(1);
    if (!c) return { items: [], total: 0, page, pageSize };
    collectionId = c.id;
    where.push(
      sql`exists (select 1 from ${collectionProducts} where ${collectionProducts.collectionId} = ${c.id} and ${collectionProducts.productId} = ${products.id})`,
    );
  }
  const cond = where.length ? and(...where) : undefined;
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(products).where(cond);
  const order = collectionId
    ? [
        sql`(select ${collectionProducts.position} from ${collectionProducts} where ${collectionProducts.collectionId} = ${collectionId} and ${collectionProducts.productId} = ${products.id})`,
        asc(products.slug),
      ]
    : [desc(products.publishedAt), asc(products.slug)];
  const rows = await db
    .select()
    .from(products)
    .where(cond)
    .orderBy(...order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { items: await summarize(rows, query.locale, ctx), total, page, pageSize };
}

/** Full-text search over names, tags and descriptions (Arabic-normalised, DECISIONS "Catalogue FTS"). Published only. */
export async function search(query: string, opts: SearchOptions, ctx?: ServiceContext): Promise<ProductSummary[]> {
  const q = query.trim();
  if (!q) return [];
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const tsq = sql`plainto_tsquery('simple', catalog_search_normalize(${q}))`;
  const rows = await dbOf(ctx)
    .select()
    .from(products)
    .where(and(eq(products.status, "published"), sql`${products.search} @@ ${tsq}`))
    .orderBy(sql`ts_rank(${products.search}, ${tsq}) desc`, asc(products.slug))
    .limit(limit);
  return summarize(rows, opts.locale, ctx);
}

/** Variants by id (any status; callers check `status`/`productStatus`). Order follows `ids`; unknown ids are skipped. */
export async function getVariants(ids: readonly string[], ctx?: ServiceContext): Promise<VariantInfo[]> {
  const valid = [...new Set(ids)].filter((i) => UUID.test(i));
  if (valid.length === 0) return [];
  const rows = await dbOf(ctx)
    .select({ v: variantColumns, p: { slug: products.slug, nameAr: products.nameAr, nameEn: products.nameEn, status: products.status } })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(inArray(variants.id, valid));
  const byId = new Map(rows.map((r) => [r.v.id, toVariantInfo(r.v, r.p)]));
  return ids.map((i) => byId.get(i)).filter((v): v is VariantInfo => Boolean(v));
}

export async function getVariantBySku(sku: string, ctx?: ServiceContext): Promise<VariantInfo | null> {
  const [row] = await dbOf(ctx)
    .select({ v: variantColumns, p: { slug: products.slug, nameAr: products.nameAr, nameEn: products.nameEn, status: products.status } })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(eq(variants.sku, sku.trim().toUpperCase()))
    .limit(1);
  return row ? toVariantInfo(row.v, row.p) : null;
}

/** What is in the box (FR-CAT-010), ordered. `name` is resolved for `opts.locale` (default "ar"). */
export async function getProductComponents(
  productId: string,
  opts: { locale?: Locale } = {},
  ctx?: ServiceContext,
): Promise<ComponentView[]> {
  if (!UUID.test(productId)) return [];
  const locale = opts.locale ?? "ar";
  const rows = await dbOf(ctx)
    .select()
    .from(productComponents)
    .where(eq(productComponents.productId, productId))
    .orderBy(asc(productComponents.position));
  return rows.map((c) => ({
    id: c.id,
    kind: c.kind,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    name: locale === "ar" ? c.nameAr : c.nameEn,
    count: c.count,
  }));
}

/** Old slug → current product slug (serve a 301), or null (FR-CAT-007). */
export async function resolveSlugRedirect(slug: string, ctx?: ServiceContext): Promise<SlugRedirect | null> {
  const [row] = await dbOf(ctx)
    .select({ productId: products.id, slug: products.slug })
    .from(slugRedirects)
    .innerJoin(products, eq(products.id, slugRedirects.productId))
    .where(eq(slugRedirects.fromSlug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * FR-CAT-009: true when the product has no seasonal windows or the business date (Asia/Jerusalem) of `at`
 * (default now) is inside one (ends inclusive). Unknown product → false.
 */
export async function isInSeason(productId: string, at?: Date, ctx?: ServiceContext): Promise<boolean> {
  if (!UUID.test(productId)) return false;
  const db = dbOf(ctx);
  const [p] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!p) return false;
  const windows = await db
    .select({ startsOn: seasonalWindows.startsOn, endsOn: seasonalWindows.endsOn })
    .from(seasonalWindows)
    .where(eq(seasonalWindows.productId, productId));
  return inWindow(windows, businessDate(at ?? nowOf(ctx)));
}

/** The policy version in force now (greatest effective_at <= now), FR-CMS-002. */
export async function getPolicy(kind: PolicyKind, locale: Locale, ctx?: ServiceContext): Promise<PolicyView | null> {
  const [row] = await dbOf(ctx)
    .select()
    .from(policies)
    .where(and(eq(policies.kind, kind), lte(policies.effectiveAt, nowOf(ctx))))
    .orderBy(desc(policies.effectiveAt))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    version: row.version,
    title: locale === "ar" ? row.titleAr : row.titleEn,
    body: locale === "ar" ? row.bodyAr : row.bodyEn,
    effectiveAt: row.effectiveAt,
  };
}

export async function listFaq(locale: Locale, ctx?: ServiceContext): Promise<FaqEntryView[]> {
  const rows = await dbOf(ctx)
    .select()
    .from(faqEntries)
    .where(eq(faqEntries.isPublished, true))
    .orderBy(asc(faqEntries.position), asc(faqEntries.createdAt));
  return rows.map((f) => ({
    id: f.id,
    topic: f.topic,
    question: locale === "ar" ? f.questionAr : f.questionEn,
    answer: locale === "ar" ? f.answerAr : f.answerEn,
  }));
}

export async function getStaticPage(slug: string, locale: Locale, ctx?: ServiceContext): Promise<StaticPageView | null> {
  const [row] = await dbOf(ctx)
    .select()
    .from(staticPages)
    .where(and(eq(staticPages.slug, slug), eq(staticPages.status, "published")))
    .limit(1);
  if (!row) return null;
  return {
    slug: row.slug,
    title: locale === "ar" ? row.titleAr : row.titleEn,
    body: locale === "ar" ? row.bodyAr : row.bodyEn,
    seoDescription: locale === "ar" ? row.seoDescriptionAr : row.seoDescriptionEn,
    publishedAt: row.publishedAt,
  };
}
