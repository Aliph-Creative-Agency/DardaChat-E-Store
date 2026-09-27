import { describe, expect, it, vi } from "vitest";

// the real safeNext lives in the Next adapter (cookies/db); keep its contract: same-origin paths only
vi.mock("../next", () => ({
  safeNext: (next: string | undefined) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null),
}));

import { grantsFor } from "../permissions";
import { staffNext } from "./staff-pages";

describe("staffNext (default landing after staff sign-in / 2FA)", () => {
  it("defaults to the admin dashboard, which every role may open", () => {
    expect(staffNext("ar", {})).toBe("/ar/admin");
    expect(staffNext("en", { next: ["/en/x", "/en/y"] })).toBe("/en/admin");
    expect(grantsFor("staff")).toContain("dashboard.view");
    expect(grantsFor("staff")).not.toContain("users.manage");
  });

  it("keeps a safe next", () => {
    expect(staffNext("ar", { next: "/ar/admin/users" })).toBe("/ar/admin/users");
    expect(staffNext("ar", { next: "//evil.example" })).toBe("/ar/admin");
  });
});
