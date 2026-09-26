import { describe, expect, it } from "vitest";
import { isLocale, localeDir } from "@/i18n-locales";

describe("smoke", () => {
  it("resolves the @/ alias and basic locale helpers", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(localeDir("ar")).toBe("rtl");
    expect(localeDir("en")).toBe("ltr");
  });
});
