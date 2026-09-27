import { expect, test, type Page } from "@playwright/test";

/** SHL-10 admin shell: sidebar on the start side, active item, drawer on small screens, no sideways scroll. */

const LOCALES = ["ar", "en"] as const;
const WIDTHS = [320, 375, 768, 1024, 1440];

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

for (const locale of LOCALES) {
  test.describe(`${locale} admin shell`, () => {
    test("sidebar sits on the start side with every section and the dashboard marked current", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}/admin`);
      const sidebar = page.getByTestId("admin-sidebar");
      await expect(sidebar).toBeVisible();
      const box = (await sidebar.boundingBox())!;
      if (locale === "ar") expect(Math.round(box.x + box.width)).toBe(1440);
      else expect(box.x).toBe(0);

      const nav = sidebar.getByRole("navigation");
      await expect(nav.getByRole("link")).toHaveCount(33);
      const current = nav.locator('[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute("href", `/${locale}/admin`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByTestId("admin-viewer")).toBeVisible();
    });

    test("an unbuilt section shows the admin not-found inside the shell with its item current", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const response = await page.goto(`/${locale}/admin/orders`);
      expect(response?.status()).toBe(404);
      await expect(page.getByTestId("admin-not-found")).toBeVisible();
      const current = page.getByTestId("admin-sidebar").locator('[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute("href", `/${locale}/admin/orders`);
      await page.getByRole("main").getByRole("link", { name: locale === "ar" ? "العودة إلى لوحة المتابعة" : "Back to the dashboard" }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/admin$`));
    });

    test("first Tab is the skip link to main", async ({ page }) => {
      await page.goto(`/${locale}/admin`);
      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toHaveAttribute("href", "#main");
    });

    test("at 375px the sidebar is a drawer that opens and closes", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(`/${locale}/admin`);
      await expect(page.getByTestId("admin-sidebar")).toBeHidden();
      const button = page.getByTestId("menu-button");
      await expect(button).toBeVisible();
      const buttonBox = (await button.boundingBox())!;
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      await button.click();

      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      const links = drawer.getByTestId("admin-drawer-nav").getByRole("link");
      await expect(links).toHaveCount(33);
      expect((await links.first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
      // poll: the drawer slides in, and a cold dev server can catch it mid-animation
      await expect
        .poll(async () => {
          const box = (await drawer.boundingBox())!;
          return locale === "ar" ? Math.round(box.x + box.width) : Math.round(box.x);
        })
        .toBe(locale === "ar" ? 375 : 0);

      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(button).toBeFocused();

      // following a link closes the drawer and lands on the section
      await button.click();
      await drawer.getByTestId("admin-drawer-nav").locator('[data-nav-id="stock"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/admin/stock$`));
      await expect(page.getByRole("dialog")).toBeHidden();
    });

    test("no horizontal scroll from 320 to 1440", async ({ page }) => {
      for (const path of [`/${locale}/admin`, `/${locale}/admin/orders`]) {
        await page.goto(path);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          expect(await noHorizontalScroll(page), `${path} @ ${width}`).toBe(true);
        }
      }
    });
  });
}
