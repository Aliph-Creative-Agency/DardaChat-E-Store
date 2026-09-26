import { expect, test, type Page } from "@playwright/test";

/** SHL-09 storefront shell: landmarks, skip link, mobile menu, no sideways scroll, nav on the start side. */

const LOCALES = ["ar", "en"] as const;
const WIDTHS = [320, 375, 768, 1024, 1440];

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

for (const locale of LOCALES) {
  test.describe(`${locale} storefront shell`, () => {
    test("has header, nav, main and footer landmarks; first Tab is the skip link", async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      await expect(page.getByTestId("main-nav")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      await page.keyboard.press("Tab");
      const skip = page.locator(":focus");
      await expect(skip).toHaveAttribute("href", "#main");
      await expect(skip).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${locale}#main$`));
      await expect(page.locator("main")).toBeFocused();
    });

    test("home link is marked as the current page", async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.getByTestId("main-nav").locator('[aria-current="page"]')).toHaveAttribute("href", `/${locale}`);
    });

    test("nav sits on the start side", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}`);
      const nav = (await page.getByTestId("main-nav").boundingBox())!;
      const center = nav.x + nav.width / 2;
      if (locale === "ar") expect(center).toBeGreaterThan(720);
      else expect(center).toBeLessThan(720);
    });

    test("at 375px the menu button opens and closes the mobile menu", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(`/${locale}`);
      await expect(page.getByTestId("main-nav")).toBeHidden();
      const button = page.getByTestId("menu-button");
      await expect(button).toHaveAttribute("aria-expanded", "false");
      await button.focus();
      await page.keyboard.press("Enter");

      const menu = page.getByRole("dialog");
      await expect(menu).toBeVisible();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(menu.getByTestId("mobile-nav").getByRole("link")).toHaveCount(7);
      // sheet enters from the start edge
      const box = (await menu.boundingBox())!;
      if (locale === "ar") expect(Math.round(box.x + box.width)).toBe(375);
      else expect(Math.round(box.x)).toBe(0);

      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(button).toBeFocused();
      await expect(button).toHaveAttribute("aria-expanded", "false");

      // close button + scroll lock released
      await button.click();
      await menu.getByRole("button").click();
      await expect(menu).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
    });

    test("no horizontal scroll from 320 to 1440", async ({ page }) => {
      await page.goto(`/${locale}`);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        expect(await noHorizontalScroll(page), `${locale} @ ${width}`).toBe(true);
      }
    });
  });
}
