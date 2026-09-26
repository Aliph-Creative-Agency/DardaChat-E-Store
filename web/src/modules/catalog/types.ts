/**
 * Catalog contract DTOs (FR-CAT-001..010, FR-SRC-001, FR-CMS-001..002). Money = integer agorot, VAT-inclusive.
 * Functions taking `{ locale }` resolve bilingual fields into `name`/`description`/…; functions without a locale
 * return both (`nameAr`/`nameEn`). `cost` (FR-CAT-008, owner-only) is never part of these DTOs.
 */
import type { BusinessDate } from "../../lib/time";

export type Locale = "ar" | "en";
export type ProductStatus = "draft" | "published" | "archived";
export type ProductGroup = "family" | "friends" | "couples";
export type VariantStatus = "active" | "inactive";
export type ComponentKind = "question_cards" | "challenge_cards" | "prop" | "board" | "other";
export type PolicyKind = "terms" | "privacy" | "returns" | "delivery";

export interface ProductSummary {
  id: string;
  slug: string;
  /** Resolved for the requested locale (falls back to the other locale when missing). */
  name: string;
  /** Short line under the name; Phase 0 maps it to the SEO description of the locale (no tagline column yet). */
  tagline: string | null;
  group: ProductGroup | null;
  occasion: string | null;
  status: ProductStatus;
  /** Lowest price of the active variants, agorot. 0 when the product has no active variant. */
  priceFrom: number;
  /** Highest "was" price among active variants, agorot, or null. */
  compareAtPriceFrom: number | null;
  /** Primary image URL (via `mediaUrl`), null when there is none. */
  imageUrl: string | null;
  imageAlt: string | null;
  /** True when the product has no seasonal windows or today (Asia/Jerusalem) falls inside one (FR-CAT-009). */
  inSeason: boolean;
  /** True for seasonal titles (at least one window). */
  seasonal: boolean;
  /** Stock is not part of the catalog: ask `@/modules/inventory` `getAvailability(variantIds)`. */
  defaultVariantId: string | null;
}

export interface VariantInfo {
  id: string;
  productId: string;
  productSlug: string;
  sku: string;
  /** Variant label, falling back to the product name. */
  nameAr: string;
  nameEn: string;
  /** Agorot, VAT-inclusive. */
  price: number;
  compareAtPrice: number | null;
  /** Per-variant VAT override in basis points; null = the active standard rate (no override column in Phase 0). */
  vatRateBp: number | null;
  status: VariantStatus;
  productStatus: ProductStatus;
  weightG: number;
  position: number;
}

export interface MediaView {
  id: string;
  kind: "image" | "video";
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
}

export interface ComponentView {
  id: string;
  kind: ComponentKind;
  nameAr: string;
  nameEn: string;
  /** Resolved for the requested locale when a locale was given, else Arabic. */
  name: string;
  count: number | null;
}

export interface SeasonalWindowView {
  startsOn: BusinessDate;
  /** Inclusive. */
  endsOn: BusinessDate;
  returnsNote: string | null;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  playInstructions: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[];
  playerMin: number | null;
  playerMax: number | null;
  minAge: number | null;
  durationMin: number | null;
  publishedAt: Date | null;
  variants: VariantInfo[];
  media: MediaView[];
  components: ComponentView[];
  seasonalWindows: SeasonalWindowView[];
  /** Start of the next window after today when out of season (FR-CAT-009 "returns on"), else null. */
  nextSeasonStart: BusinessDate | null;
}

export interface GetProductOptions {
  locale: Locale;
  /** Admin/preview: also return draft and archived products. */
  includeUnpublished?: boolean;
}

export interface ListProductsQuery {
  locale: Locale;
  /** Collection slug, e.g. "ramadan"; ordered by the collection's position. */
  collection?: string;
  group?: ProductGroup;
  /** Only titles with seasonal windows. */
  seasonalOnly?: boolean;
  /** 1-based. Default 1. */
  page?: number;
  /** Default 24, max 100. */
  pageSize?: number;
  includeUnpublished?: boolean;
}

export interface ProductPage {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchOptions {
  locale: Locale;
  /** Default 20, max 50. */
  limit?: number;
}

export interface SlugRedirect {
  productId: string;
  /** The product's current slug (redirect target, 301). */
  slug: string;
}

export interface PolicyView {
  id: string;
  kind: PolicyKind;
  version: string;
  title: string;
  body: string;
  effectiveAt: Date;
}

export interface FaqEntryView {
  id: string;
  topic: string | null;
  question: string;
  answer: string;
}

export interface StaticPageView {
  slug: string;
  title: string;
  body: string;
  seoDescription: string | null;
  publishedAt: Date | null;
}
