/**
 * Back-office navigation registry (PLATFORM-owned, read-only for teams: request changes via CHANGE-REQUESTS).
 *
 * Pre-populated with a section for EVERY module so Phase 1 teams build pages at these hrefs without touching the
 * sidebar. Hrefs are locale-less paths for the `Link` in `@/lib/i18n/navigation`; labels are keys under
 * `common.nav.admin` (items) and `common.nav.adminGroup` (groups). Each item names the permission key from auth's
 * registry (`@/modules/auth` PERMISSIONS) that lets a staff member SEE the section; the page itself still calls
 * `requireStaff(permission)` — hiding a link is not authorisation.
 */

/** Admin modules that own at least one back-office section (storefront has none). */
export const ADMIN_MODULES = [
  "insights",
  "orders",
  "payments",
  "catalog",
  "inventory",
  "engagement",
  "assistant",
  "journey",
  "auth",
  "core",
] as const;
export type AdminModule = (typeof ADMIN_MODULES)[number];

/** Sidebar groups in display order. */
export const ADMIN_NAV_GROUPS = [
  "overview",
  "sales",
  "catalog",
  "inventory",
  "finance",
  "customers",
  "assistant",
  "journey",
  "settings",
  "system",
] as const;
export type AdminNavGroup = (typeof ADMIN_NAV_GROUPS)[number];

/** Icon names resolved to inline SVGs by `AdminSidebar` (keeps this registry pure data). */
export type AdminNavIcon =
  | "dashboard"
  | "chart"
  | "orders"
  | "truck"
  | "return"
  | "coins"
  | "tag"
  | "stack"
  | "document"
  | "question"
  | "box"
  | "clipboard"
  | "users"
  | "card"
  | "receipt"
  | "message"
  | "megaphone"
  | "sparkle"
  | "compass"
  | "settings"
  | "shield"
  | "pulse";

export type AdminNavItem = {
  id: string;
  href: string;
  /** Key relative to `common.nav.admin`. */
  labelKey: string;
  icon: AdminNavIcon;
  /** Permission key (auth registry) required to see the item. */
  permission: string;
  group: AdminNavGroup;
  /** Module team that builds the page. */
  module: AdminModule;
  /** Match only the exact path (the dashboard at `/admin`), not its children. */
  exact?: boolean;
};

export const ADMIN_NAV = [
  // Overview
  { id: "dashboard", href: "/admin", labelKey: "dashboard", icon: "dashboard", permission: "dashboard.view", group: "overview", module: "insights", exact: true },
  { id: "reports", href: "/admin/reports", labelKey: "reports", icon: "chart", permission: "reports.operational", group: "overview", module: "insights" },
  // Orders and delivery
  { id: "orders", href: "/admin/orders", labelKey: "orders", icon: "orders", permission: "orders.read", group: "sales", module: "orders" },
  { id: "picking", href: "/admin/picking", labelKey: "picking", icon: "box", permission: "orders.write", group: "sales", module: "orders" },
  { id: "returns", href: "/admin/returns", labelKey: "returns", icon: "return", permission: "orders.read", group: "sales", module: "orders" },
  { id: "deliveries", href: "/admin/deliveries", labelKey: "deliveries", icon: "truck", permission: "orders.read", group: "sales", module: "orders" },
  { id: "remittances", href: "/admin/remittances", labelKey: "remittances", icon: "coins", permission: "payments.read", group: "sales", module: "payments" },
  // Catalogue and content
  { id: "products", href: "/admin/products", labelKey: "products", icon: "tag", permission: "catalog.read", group: "catalog", module: "catalog" },
  { id: "collections", href: "/admin/collections", labelKey: "collections", icon: "stack", permission: "catalog.read", group: "catalog", module: "catalog" },
  { id: "pages", href: "/admin/pages", labelKey: "pages", icon: "document", permission: "content.write", group: "catalog", module: "catalog" },
  { id: "faq", href: "/admin/faq", labelKey: "faq", icon: "question", permission: "content.write", group: "catalog", module: "catalog" },
  { id: "policies", href: "/admin/policies", labelKey: "policies", icon: "shield", permission: "content.write", group: "catalog", module: "catalog" },
  // Stock and purchasing
  { id: "stock", href: "/admin/stock", labelKey: "stock", icon: "box", permission: "inventory.read", group: "inventory", module: "inventory" },
  { id: "purchaseOrders", href: "/admin/purchase-orders", labelKey: "purchaseOrders", icon: "clipboard", permission: "purchasing.read", group: "inventory", module: "inventory" },
  { id: "suppliers", href: "/admin/suppliers", labelKey: "suppliers", icon: "users", permission: "purchasing.read", group: "inventory", module: "inventory" },
  // Payments and invoices
  { id: "payments", href: "/admin/payments", labelKey: "payments", icon: "card", permission: "payments.read", group: "finance", module: "payments" },
  { id: "invoices", href: "/admin/invoices", labelKey: "invoices", icon: "receipt", permission: "invoices.read", group: "finance", module: "payments" },
  { id: "refunds", href: "/admin/refunds", labelKey: "refunds", icon: "return", permission: "payments.read", group: "finance", module: "payments" },
  { id: "eInvoicing", href: "/admin/e-invoicing", labelKey: "eInvoicing", icon: "document", permission: "einvoice.manage", group: "finance", module: "payments" },
  // Customers and messaging
  { id: "customers", href: "/admin/customers", labelKey: "customers", icon: "users", permission: "customers.read", group: "customers", module: "engagement" },
  { id: "templates", href: "/admin/templates", labelKey: "templates", icon: "message", permission: "messaging.templates.write", group: "customers", module: "engagement" },
  { id: "campaigns", href: "/admin/campaigns", labelKey: "campaigns", icon: "megaphone", permission: "campaigns.write", group: "customers", module: "engagement" },
  // Assistant
  { id: "conversations", href: "/admin/assistant/conversations", labelKey: "conversations", icon: "message", permission: "assistant.manage", group: "assistant", module: "assistant" },
  { id: "escalations", href: "/admin/assistant/escalations", labelKey: "escalations", icon: "sparkle", permission: "assistant.manage", group: "assistant", module: "assistant" },
  { id: "knowledge", href: "/admin/assistant/knowledge", labelKey: "knowledge", icon: "document", permission: "assistant.manage", group: "assistant", module: "assistant" },
  // Journey
  { id: "journey", href: "/admin/journey", labelKey: "journey", icon: "compass", permission: "journey.manage", group: "journey", module: "journey" },
  // Settings
  { id: "users", href: "/admin/settings/users", labelKey: "users", icon: "users", permission: "users.manage", group: "settings", module: "auth" },
  { id: "zones", href: "/admin/settings/zones", labelKey: "zones", icon: "truck", permission: "settings.read", group: "settings", module: "orders" },
  { id: "vat", href: "/admin/settings/vat", labelKey: "vat", icon: "receipt", permission: "settings.read", group: "settings", module: "payments" },
  { id: "store", href: "/admin/settings/store", labelKey: "store", icon: "settings", permission: "settings.read", group: "settings", module: "core" },
  { id: "privacy", href: "/admin/settings/privacy", labelKey: "privacy", icon: "shield", permission: "privacy.manage", group: "settings", module: "engagement" },
  // System
  { id: "audit", href: "/admin/audit", labelKey: "audit", icon: "clipboard", permission: "audit.read", group: "system", module: "auth" },
  { id: "health", href: "/admin/health", labelKey: "health", icon: "pulse", permission: "settings.read", group: "system", module: "core" },
] as const satisfies readonly AdminNavItem[];

/** Every permission key the registry references (the dev viewer stub is granted exactly these). */
export const ADMIN_NAV_PERMISSIONS: readonly string[] = [...new Set(ADMIN_NAV.map((i) => i.permission))];

/** Items the viewer may see. Deny by default: no permissions → nothing; unknown/missing permission → hidden. */
export function filterNav<T extends Pick<AdminNavItem, "permission">>(
  items: readonly T[],
  permissions: readonly string[] | null | undefined,
): T[] {
  if (!permissions || permissions.length === 0) return [];
  const granted = new Set(permissions);
  return items.filter((item) => typeof item.permission === "string" && item.permission !== "" && granted.has(item.permission));
}

/** Groups (in display order) with their visible items; empty groups are dropped. */
export function groupNav<T extends Pick<AdminNavItem, "group">>(items: readonly T[]): { group: AdminNavGroup; items: T[] }[] {
  return ADMIN_NAV_GROUPS.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter(
    (g) => g.items.length > 0,
  );
}

/** Active-state rule for admin links: `exact` items match only themselves, others match their subtree. */
export function isActiveAdminHref(pathname: string, item: Pick<AdminNavItem, "href" | "exact">): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (item.exact) return path === item.href;
  return path === item.href || path.startsWith(`${item.href}/`);
}
