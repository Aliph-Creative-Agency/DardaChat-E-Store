import { describe, expect, it } from "vitest";

// PLM-08: next-intl is inlined in vitest.config.mts, so the locale-aware navigation module loads in plain Node tests.
describe("@/lib/i18n/navigation under vitest", () => {
  it("loads and exposes the locale-aware Link and redirect", async () => {
    const nav = await import("@/lib/i18n/navigation");
    expect(nav.Link).toBeDefined();
    expect(typeof nav.redirect).toBe("function");
  });
});
