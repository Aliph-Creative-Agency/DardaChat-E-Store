import { describe, expect, it } from "vitest";
import { grantsFor, isKnownPermission, PERMISSION_KEYS, PERMISSIONS } from "./permissions";

const OWNER_ONLY = [
  "inventory.cost.read",
  "orders.close_lost",
  "payments.cod_writeoff",
  "einvoice.manage",
  "privacy.manage",
  "campaigns.send",
  "reports.financial",
  "settings.write",
  "users.manage",
  "audit.read",
];

describe("permission registry", () => {
  it("covers every module", () => {
    for (const prefix of ["dashboard", "catalog", "inventory", "purchasing", "orders", "returns", "payments", "invoices",
      "einvoice", "customers", "privacy", "messaging", "campaigns", "reports", "assistant", "journey", "content",
      "settings", "users", "audit"]) {
      expect(PERMISSION_KEYS.some((k) => k.startsWith(`${prefix}.`)), prefix).toBe(true);
    }
  });

  it("every entry has Arabic and English descriptions", () => {
    for (const k of PERMISSION_KEYS) {
      expect(PERMISSIONS[k].descAr).toMatch(/[\u0600-\u06ff]/);
      expect(PERMISSIONS[k].descEn.length).toBeGreaterThan(3);
    }
  });

  it("owner is granted every key explicitly (no wildcard)", () => {
    const owner = grantsFor("owner");
    expect(owner).toEqual(PERMISSION_KEYS);
    expect(owner).not.toContain("*");
  });

  it("staff lacks every owner-only key", () => {
    const staff = grantsFor("staff");
    for (const k of OWNER_ONLY) expect(staff).not.toContain(k);
    expect(staff).toContain("orders.write");
    expect(staff.length).toBe(PERMISSION_KEYS.length - OWNER_ONLY.length);
  });

  it("unknown keys and roles are denied", () => {
    expect(isKnownPermission("catalog.delete_everything")).toBe(false);
    expect(isKnownPermission("*")).toBe(false);
    expect(isKnownPermission("toString")).toBe(false);
    expect(grantsFor("owner")).not.toContain("catalog.delete_everything");
    expect(grantsFor("auditor")).toEqual([]);
  });
});
