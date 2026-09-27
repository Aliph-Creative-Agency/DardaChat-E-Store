import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "../support/owner-session";

/**
 * SHL-13 accessibility + responsive regression guard for the shell.
 * - axe-core (already in node_modules, injected as a script: no new dependency) with the WCAG 2.0/2.1/2.2 A + AA tags,
 *   at desktop and phone widths, must report zero violations.
 * - No page scrolls sideways at 320..1440.
 * - Keyboard-only: every element reached with Tab shows the global focus ring (NFR-USA-003).
 */

const AXE_PATH = path.resolve(__dirname, "../../../node_modules/axe-core/axe.min.js");
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PAGES = ["/ar", "/en", "/ar/admin", "/en/admin", "/ar/dev/ui", "/en/dev/ui", "/ar/nope", "/en/nope", "/ar/admin/orders"];
const AXE_WIDTHS = [1440, 375];
const SWEEP_WIDTHS = [320, 375, 768, 1024, 1440];

type AxeViolation = { id: string; impact: string | null; help: string; nodes: { target: unknown[] }[] };

async function runAxe(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async (tags) => {
    // The Next dev-tools badge (dev only, never shipped) lives in <nextjs-portal>; it is not our UI.
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: AxeViolation[] }> } }).axe;
    const result = await axe.run(
      { exclude: [["nextjs-portal"]] },
      { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] },
    );
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target })),
    }));
  }, AXE_TAGS);
}

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  // Fonts change line boxes; measure only once they are in.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

test.describe("axe (WCAG 2.2 A/AA)", () => {
  for (const url of PAGES) {
    for (const width of AXE_WIDTHS) {
      test(`${url} at ${width}px has no violations`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await open(page, url);
        const violations = await runAxe(page);
        expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      });
    }
  }

  test("the error boundary page has no violations", async ({ page }) => {
    // Fresh context: no `dc_boom=off` cookie, so the dev route throws into [locale]/error.tsx.
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/ar/dev/ui/boom");
    await expect(page.getByRole("button")).not.toHaveCount(0);
    const violations = await runAxe(page);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});

test.describe("viewport sweep", () => {
  for (const url of PAGES) {
    test(`${url} never scrolls sideways at 320..1440`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page, url);
      for (const width of SWEEP_WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${url} at ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe("keyboard focus ring", () => {
  const SAMPLES = ["/ar", "/en/admin", "/ar/dev/ui"];
  const MAX_TABS = 45;

  for (const url of SAMPLES) {
    test(`${url}: every Tab stop shows a visible focus ring`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page, url);

      const seen: string[] = [];
      for (let i = 0; i < MAX_TABS; i++) {
        await page.keyboard.press("Tab");
        const stop = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          // Past our last stop focus goes to body or to the dev-only Next tools badge (<nextjs-portal>).
          if (!el || el === document.body || el.tagName.toLowerCase() === "nextjs-portal") return null;
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return {
            key: `${el.tagName.toLowerCase()}|${el.getAttribute("href") ?? ""}|${el.id}|${(el.textContent ?? "").trim().slice(0, 30)}|${Math.round(r.x)},${Math.round(r.y)}`,
            outlineStyle: s.outlineStyle,
            outlineWidth: parseFloat(s.outlineWidth),
            visible: r.width > 0 && r.height > 0,
          };
        });
        if (!stop) break;
        if (seen.includes(stop.key)) break; // wrapped around
        seen.push(stop.key);
        expect(stop.visible, `${stop.key} is focused while invisible`).toBe(true);
        expect(stop.outlineStyle, `${stop.key} focus outline`).not.toBe("none");
        expect(stop.outlineWidth, `${stop.key} focus outline width`).toBeGreaterThanOrEqual(2);
        if (i === 0 || i === 3) {
          await testInfo.attach(`focus-${i}`, { body: await page.screenshot(), contentType: "image/png" });
        }
      }
      expect(seen.length, "Tab reached at least a handful of stops").toBeGreaterThanOrEqual(5);
    });
  }
});
