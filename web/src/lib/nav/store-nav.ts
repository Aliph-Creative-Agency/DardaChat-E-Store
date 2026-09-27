/**
 * Storefront navigation registry (PLATFORM-owned, read-only for teams: request changes via CHANGE-REQUESTS).
 * Hrefs are locale-less paths for the `Link` in `@/lib/i18n/navigation`; labels are keys under `common.nav.store` /
 * `common.nav.footer` so every module's route has its label in both locales before the page exists.
 */

export type StoreNavItem = {
  id: string;
  href: string;
  /** Key relative to `common.nav.store`. */
  labelKey: string;
};

/** Main navigation (header on desktop, mobile menu on small screens), in reading order. */
export const STORE_PRIMARY_NAV = [
  { id: "home", href: "/", labelKey: "home" },
  { id: "shop", href: "/products", labelKey: "shop" },
  { id: "ramadan", href: "/collections/ramadan", labelKey: "ramadan" },
  { id: "journey", href: "/journey", labelKey: "journey" },
  { id: "about", href: "/pages/about", labelKey: "about" },
  { id: "faq", href: "/faq", labelKey: "faq" },
] as const satisfies readonly StoreNavItem[];

/** Header utilities at the logical end (account; the cart is the header's `cartSlot`). */
export const STORE_UTILITY_NAV = [
  { id: "account", href: "/account", labelKey: "account" },
  { id: "cart", href: "/cart", labelKey: "cart" },
] as const satisfies readonly StoreNavItem[];

/** Footer policy links; one per `policies.kind` seeded by catalog (terms, privacy, returns, delivery). */
export const STORE_POLICY_NAV = [
  { id: "terms", href: "/policies/terms", labelKey: "terms" },
  { id: "privacy", href: "/policies/privacy", labelKey: "privacy" },
  { id: "returns", href: "/policies/returns", labelKey: "returns" },
  { id: "delivery", href: "/policies/delivery", labelKey: "delivery" },
] as const satisfies readonly StoreNavItem[];

/** True when `pathname` (locale-less) is the item's page or below it; home matches only itself. */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(`${href}/`);
}
