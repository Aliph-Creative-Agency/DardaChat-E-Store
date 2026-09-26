import { describe, expect, it } from "vitest";
import ar from "../../../../messages/ar/auth.json";
import en from "../../../../messages/en/auth.json";
import { authT } from "./t";

function keys(tree: object, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("auth messages shim", () => {
  it("ar and en have exactly the same keys", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
  it("Arabic is real Arabic, not copied English", () => {
    for (const k of keys(ar)) {
      const v = authT("ar")(k);
      expect(v, k).toMatch(/[\u0600-\u06FF]/);
    }
  });
  it("interpolates and falls back to the key", () => {
    expect(authT("en")("errors.rate_limited", { minutes: 3 })).toBe("Too many attempts. Try again in 3 min.");
    expect(authT("ar")("nope.missing")).toBe("nope.missing");
  });
});
