// NFR-USA-003/004, UI-006: WCAG 2.2 contrast of the design-token pairs the components actually use.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

function tokens(): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) out.set(m[1]!, m[2]!.toLowerCase());
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const TEXT = 4.5; // body text
const UI = 3; // large text, control borders, focus ring, icons

// [foreground, background, minimum]
const PAIRS: Array<[string, string, number]> = [
  ["ink", "paper", TEXT],
  ["ink", "paper-deep", TEXT],
  ["ink", "surface", TEXT],
  ["ink-soft", "paper", TEXT],
  ["ink-soft", "paper-deep", TEXT],
  ["ink-soft", "surface", TEXT],
  ["brand", "paper", TEXT],
  ["brand", "surface", TEXT],
  ["brand-strong", "brand-soft", TEXT],
  ["on-brand", "brand", TEXT],
  ["on-brand", "brand-strong", TEXT],
  ["ink", "pink", TEXT],
  ["ink", "sky", TEXT],
  ["ink", "brand-soft", TEXT],
  ["ink-soft", "sky", TEXT],
  ["brand", "sky", TEXT],
  ["brand-strong", "sky", TEXT],
  ["brand", "paper-deep", TEXT],
  ["on-accent", "accent", TEXT], // cta Button: white on red
  ["on-accent", "accent-strong", TEXT],
  ["ink", "info-soft", TEXT],
  ["accent", "paper", 3.5], // large-text / decoration only (>= 24px): see DESIGN.md contrast rule
  ["success", "success-soft", TEXT],
  ["success", "surface", TEXT],
  ["warning", "warning-soft", TEXT],
  ["warning", "surface", TEXT],
  ["danger", "danger-soft", TEXT],
  ["danger", "surface", TEXT],
  ["danger", "paper", TEXT], // Field error line on the page background
  ["white", "danger", TEXT], // danger Button
  ["info", "info-soft", TEXT],
  ["info", "surface", TEXT],
  ["line-strong", "surface", UI],
  ["line-strong", "paper", UI],
  ["focus", "paper", UI],
  ["focus", "surface", UI],
  ["focus", "paper-deep", UI],
  ["focus", "brand-soft", UI],
  ["focus", "pink", UI],
];

// DESIGN.md §2 pairs, asserted with the client's exact hex values (the brand is the spec, not the token names).
const BRAND_PAIRS: Array<[string, string, string, string, number]> = [
  ["blue", "#1a4999", "cream", "#eeeae1", 7],
  ["white", "#ffffff", "red", "#e32328", 4.5],
  ["white", "#ffffff", "blue", "#1a4999", 7],
  ["navy body text", "#13284f", "cream", "#eeeae1", 7],
  ["navy body text", "#13284f", "pink", "#ecc8ca", 7],
  ["navy body text", "#13284f", "light blue", "#bbd3eb", 7],
];

describe("design tokens contrast (WCAG 2.2 AA)", () => {
  const t = tokens();

  it("contrast() matches known values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("holds the client palette (DESIGN.md §2)", () => {
    expect(t.get("paper")).toBe("#eeeae1");
    expect(t.get("brand")).toBe("#1a4999");
    expect(t.get("accent")).toBe("#e32328");
    expect(t.get("pink")).toBe("#ecc8ca");
    expect(t.get("sky")).toBe("#bbd3eb");
  });

  for (const [fgName, fg, bgName, bg, min] of BRAND_PAIRS) {
    it(`brand: ${fgName} ${fg} on ${bgName} ${bg} >= ${min}:1`, () => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
    });
  }

  for (const [fg, bg, min] of PAIRS) {
    it(`${fg} on ${bg} >= ${min}:1`, () => {
      const f = t.get(fg);
      const b = t.get(bg);
      expect(f, `token --color-${fg}`).toBeDefined();
      expect(b, `token --color-${bg}`).toBeDefined();
      expect(contrast(f!, b!)).toBeGreaterThanOrEqual(min);
    });
  }
});
