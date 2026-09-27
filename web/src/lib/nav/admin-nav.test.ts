import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_MODULES,
  ADMIN_NAV,
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_PERMISSIONS,
  filterNav,
  groupNav,
  isActiveAdminHref,
} from "./admin-nav";

function messages(locale: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), "messages", locale, "common.json"), "utf8"));
}

function lookup(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

describe("admin nav registry", () => {
  it("has unique ids and hrefs, all under /admin", () => {
    const ids = ADMIN_NAV.map((i) => i.id);
    const hrefs = ADMIN_NAV.map((i) => i.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) expect(href === "/admin" || href.startsWith("/admin/")).toBe(true);
  });

  it("has a label in ar and en for every item and group", () => {
    for (const locale of ["ar", "en"]) {
      const m = messages(locale);
      for (const item of ADMIN_NAV) {
        const label = lookup(m, `nav.admin.${item.labelKey}`);
        expect(typeof label === "string" && label.length > 0, `${locale} nav.admin.${item.labelKey}`).toBe(true);
      }
      for (const group of ADMIN_NAV_GROUPS) {
        const label = lookup(m, `nav.adminGroup.${group}`);
        expect(typeof label === "string" && label.length > 0, `${locale} nav.adminGroup.${group}`).toBe(true);
      }
    }
  });

  it("covers every admin module and every group", () => {
    const modules = new Set(ADMIN_NAV.map((i) => i.module));
    for (const m of ADMIN_MODULES) expect(modules.has(m), m).toBe(true);
    const groups = new Set(ADMIN_NAV.map((i) => i.group));
    for (const g of ADMIN_NAV_GROUPS) expect(groups.has(g), g).toBe(true);
  });

  it("covers the sections the brief names", () => {
    const ids = new Set<string>(ADMIN_NAV.map((i) => i.id));
    for (const id of [
      "dashboard", "orders", "picking", "returns", "deliveries", "remittances", "products", "collections", "pages",
      "faq", "policies", "stock", "purchaseOrders", "suppliers", "payments", "invoices", "refunds", "eInvoicing",
      "customers", "templates", "campaigns", "reports", "conversations", "escalations", "knowledge", "journey",
      "users", "zones", "vat", "store", "audit", "health",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("gives every item a dotted permission key", () => {
    for (const item of ADMIN_NAV) expect(item.permission).toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
    expect(ADMIN_NAV_PERMISSIONS.length).toBe(new Set(ADMIN_NAV.map((i) => i.permission)).size);
  });
});

describe("filterNav (deny by default)", () => {
  it("returns nothing without permissions", () => {
    expect(filterNav(ADMIN_NAV, [])).toEqual([]);
    expect(filterNav(ADMIN_NAV, null)).toEqual([]);
    expect(filterNav(ADMIN_NAV, undefined)).toEqual([]);
  });

  it("shows only items whose permission is granted", () => {
    const visible = filterNav(ADMIN_NAV, ["orders.read"]);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((i) => i.permission === "orders.read")).toBe(true);
    expect(visible.map((i) => i.id)).not.toContain("picking");
  });

  it("hides items with a missing or empty permission even when the viewer has many", () => {
    const items = [
      { id: "a", permission: "" },
      { id: "b", permission: "x.read" },
    ];
    expect(filterNav(items, ["", "x.read"]).map((i) => i.id)).toEqual(["b"]);
  });

  it("shows everything to a viewer holding every referenced key", () => {
    expect(filterNav(ADMIN_NAV, ADMIN_NAV_PERMISSIONS)).toHaveLength(ADMIN_NAV.length);
  });

  it("groups visible items in display order and drops empty groups", () => {
    const grouped = groupNav(filterNav(ADMIN_NAV, ["orders.read", "dashboard.view"]));
    expect(grouped.map((g) => g.group)).toEqual(["overview", "sales"]);
  });
});

describe("isActiveAdminHref", () => {
  it("matches the dashboard exactly and sections by subtree", () => {
    const dashboard = { href: "/admin", exact: true };
    const orders = { href: "/admin/orders" };
    expect(isActiveAdminHref("/admin", dashboard)).toBe(true);
    expect(isActiveAdminHref("/admin/", dashboard)).toBe(true);
    expect(isActiveAdminHref("/admin/orders", dashboard)).toBe(false);
    expect(isActiveAdminHref("/admin/orders/DC-1", orders)).toBe(true);
    expect(isActiveAdminHref("/admin/orders-archive", orders)).toBe(false);
  });
});
