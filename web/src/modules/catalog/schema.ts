import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, money, tstz, tsvector, updatedAt } from "../../db/columns";

// ---------------------------------------------------------------------------------------------------------------
// Products and variants (FR-CAT-001..010, FR-SRC-001)
// ---------------------------------------------------------------------------------------------------------------

export const productStatusEnum = pgEnum("catalog_product_status", ["draft", "published", "archived"]);
/** FR-CAT-004 intended group. */
export const productGroupEnum = pgEnum("catalog_product_group", ["family", "friends", "couples"]);
export const variantStatusEnum = pgEnum("catalog_variant_status", ["active", "inactive"]);
export const mediaKindEnum = pgEnum("catalog_media_kind", ["image", "video"]);
export const componentKindEnum = pgEnum("catalog_component_kind", [
  "question_cards",
  "challenge_cards",
  "prop",
  "board",
  "other",
]);

/**
 * A title (a boxed game). Publishing requires both locales complete (FR-CAT-003) and ≥1 component (FR-CAT-010) —
 * enforced by the catalog module, not the DB, so drafts can be half-filled.
 * `search` is maintained by the trigger in `src/db/sql/020-catalog-fts.sql` (Arabic-normalised, `simple` config);
 * query it with `search @@ plainto_tsquery('simple', catalog_search_normalize($term))`.
 */
export const products = pgTable(
  "products",
  {
    id: id(),
    slug: text().notNull().unique(), // FR-CAT-007; old values live in slug_redirects
    status: productStatusEnum().notNull().default("draft"),
    nameAr: text(),
    nameEn: text(),
    descriptionAr: text(),
    descriptionEn: text(),
    playInstructionsAr: text(),
    playInstructionsEn: text(),
    seoTitleAr: text(),
    seoTitleEn: text(),
    seoDescriptionAr: text(),
    seoDescriptionEn: text(),
    group: productGroupEnum(),
    occasion: text(), // e.g. "ramadan", "eid", "all_year" — label resolved via messages
    tags: text().array().notNull().$defaultFn(() => []), // app-side default: a DB-side '{}' default makes drizzle-kit push churn
    playerMin: integer(),
    playerMax: integer(),
    minAge: integer(),
    durationMin: integer(), // minutes
    publishedAt: tstz(),
    archivedAt: tstz(),
    search: tsvector(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_search_gin").using("gin", t.search),
    check("products_players_ck", sql`${t.playerMin} is null or ${t.playerMax} is null or ${t.playerMin} <= ${t.playerMax}`),
  ],
);

/**
 * Sellable unit (FR-CAT-002). `cost` is Owner-only (FR-CAT-008): never select it in storefront queries or public
 * payloads. Journaled by 015-journal.sql.
 */
export const variants = pgTable(
  "variants",
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text().notNull().unique(),
    nameAr: text(), // e.g. edition label; null → product name
    nameEn: text(),
    price: money().notNull(), // agorot, VAT-inclusive (FR-CRT-007)
    compareAtPrice: money(), // agorot, optional "was" price
    cost: money(), // agorot, OWNER-ONLY (FR-CAT-008)
    weightG: integer().notNull().default(0),
    status: variantStatusEnum().notNull().default("active"),
    position: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("variants_product_idx").on(t.productId),
    check("variants_price_ck", sql`${t.price} >= 0`),
    check("variants_cost_ck", sql`${t.cost} is null or ${t.cost} >= 0`),
    check("variants_weight_ck", sql`${t.weightG} >= 0`),
  ],
);

/** Ordered gallery (FR-CAT-005). storage_key is relative to STORAGE_DIR (or a `/seed/...` public path). */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    kind: mediaKindEnum().notNull().default("image"),
    storageKey: text().notNull(),
    mimeType: text(),
    width: integer(),
    height: integer(),
    altAr: text(), // required for images before publish (FR-CAT-005) — enforced by catalog module
    altEn: text(),
    position: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("media_assets_product_idx").on(t.productId, t.position)],
);

/** Curated, ordered groupings (FR-CAT-006). */
export const collections = pgTable("collections", {
  id: id(),
  slug: text().notNull().unique(),
  nameAr: text().notNull(),
  nameEn: text().notNull(),
  descriptionAr: text(),
  descriptionEn: text(),
  isActive: boolean().notNull().default(true),
  position: integer().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const collectionProducts = pgTable(
  "collection_products",
  {
    id: id(),
    collectionId: uuid()
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
  },
  // surrogate id + unique pair: a composite PK here made drizzle-kit push drop/re-add it on every run
  (t) => [uniqueIndex("collection_products_uq").on(t.collectionId, t.productId)],
);

/** Permanent (301) redirects from previous slugs (FR-CAT-007). */
export const slugRedirects = pgTable(
  "slug_redirects",
  {
    id: id(),
    fromSlug: text().notNull().unique(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [index("slug_redirects_product_idx").on(t.productId)],
);

/** What is in the box (FR-CAT-010). */
export const productComponents = pgTable(
  "product_components",
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    kind: componentKindEnum().notNull(),
    nameAr: text().notNull(),
    nameEn: text().notNull(),
    count: integer(), // null where a count is meaningless
    position: integer().notNull().default(0),
  },
  (t) => [
    index("product_components_product_idx").on(t.productId, t.position),
    check("product_components_count_ck", sql`${t.count} is null or ${t.count} > 0`),
  ],
);

/**
 * Seasonal availability (FR-CAT-009). Dates are business dates (Asia/Jerusalem), ends_on inclusive.
 * Outside every window of a product that has windows, the product is visible but not purchasable.
 */
export const seasonalWindows = pgTable(
  "seasonal_windows",
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    startsOn: date().notNull(),
    endsOn: date().notNull(),
    returnsNoteAr: text(),
    returnsNoteEn: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("seasonal_windows_product_idx").on(t.productId, t.startsOn),
    check("seasonal_windows_range_ck", sql`${t.startsOn} <= ${t.endsOn}`),
  ],
);

// ---------------------------------------------------------------------------------------------------------------
// Content (FR-CMS-001..002)
// ---------------------------------------------------------------------------------------------------------------

export const contentStatusEnum = pgEnum("catalog_content_status", ["draft", "published"]);
export const policyKindEnum = pgEnum("catalog_policy_kind", ["terms", "privacy", "returns", "delivery"]);

export const staticPages = pgTable("static_pages", {
  id: id(),
  slug: text().notNull().unique(),
  status: contentStatusEnum().notNull().default("draft"),
  titleAr: text().notNull(),
  titleEn: text().notNull(),
  bodyAr: text().notNull().default(""),
  bodyEn: text().notNull().default(""),
  seoDescriptionAr: text(),
  seoDescriptionEn: text(),
  publishedAt: tstz(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const faqEntries = pgTable("faq_entries", {
  id: id(),
  topic: text(), // grouping key, e.g. "delivery", "payment"
  questionAr: text().notNull(),
  questionEn: text().notNull(),
  answerAr: text().notNull(),
  answerEn: text().notNull(),
  position: integer().notNull().default(0),
  isPublished: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * Versioned policies (FR-CMS-002). A new version is a new row; superseded rows are kept. The version in force at a
 * time T is the row of that kind with the greatest effective_at <= T.
 */
export const policies = pgTable(
  "policies",
  {
    id: id(),
    kind: policyKindEnum().notNull(),
    version: text().notNull(), // e.g. "v1", "2026-10"
    titleAr: text().notNull(),
    titleEn: text().notNull(),
    bodyAr: text().notNull(),
    bodyEn: text().notNull(),
    effectiveAt: tstz().notNull(),
    meta: jsonb(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("policies_kind_version_uq").on(t.kind, t.version),
    index("policies_kind_effective_idx").on(t.kind, t.effectiveAt),
  ],
);
