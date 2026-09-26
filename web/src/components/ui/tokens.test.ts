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
  ["ink", "saffron", TEXT],
  ["ink", "brand-soft", TEXT],
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
];

describe("design tokens contrast (WCAG 2.2 AA)", () => {
  const t = tokens();

  it("contrast() matches known values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

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
