/**
 * PUBLIC contract of `catalog` (team CATALOG): products, variants, media, components, seasonal windows, search,
 * policies, FAQ and static pages (read side). All functions are real reads on the DB; the catalog team adds the
 * admin write side (publish rules, media upload, slug changes) behind its own admin pages.
 * Stock is NOT here: use `@/modules/inventory` `getAvailability`.
 */
export {
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
} from "./service";
export type {
  ComponentKind,
  ComponentView,
  FaqEntryView,
  GetProductOptions,
  ListProductsQuery,
  Locale,
  MediaView,
  PolicyKind,
  PolicyView,
  ProductDetail,
  ProductGroup,
  ProductPage,
  ProductStatus,
  ProductSummary,
  SearchOptions,
  SeasonalWindowView,
  SlugRedirect,
  StaticPageView,
  VariantInfo,
  VariantStatus,
} from "./types";
