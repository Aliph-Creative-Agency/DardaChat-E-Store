import { expect, test, type Page } from "@playwright/test";

/** Interactive primitives on the dev gallery (SHL-07): Dialog, Tabs, Toast. */

async function openGallery(page: Page, locale: "ar" | "en") {
  await page.goto(`/${locale}/dev/ui`);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}

test.describe("Dialog", () => {
  for (const locale of ["ar", "en"] as const) {
    test(`${locale}: opens as a labelled modal, Esc closes it, focus returns to the trigger`, async ({ page }) => {
      await openGallery(page, locale);
      const trigger = page.getByTestId("dialog-trigger");
      await trigger.focus();
      await page.keyboard.press("Enter");

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const title = await dialog.getByRole("heading").textContent();
      await expect(dialog).toHaveAccessibleName(title!.trim());
      // scroll lock while open
      await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
      // focus moved inside the dialog
      expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
    });
  }

  test("close button closes and returns focus", async ({ page }) => {
    await openGallery(page, "en");
    const trigger = page.getByTestId("dialog-trigger");
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test.describe("Tabs follow the visual direction", () => {
  async function selectedTab(page: Page) {
    return page.getByRole("tablist").getByRole("tab", { selected: true }).getAttribute("id");
  }

  for (const { locale, forward, backward } of [
    { locale: "ar" as const, forward: "ArrowLeft", backward: "ArrowRight" },
    { locale: "en" as const, forward: "ArrowRight", backward: "ArrowLeft" },
  ]) {
    test(`${locale}: ${forward} moves to the next tab, ${backward} to the previous, Home/End jump`, async ({ page }) => {
      await openGallery(page, locale);
      const tabs = page.getByRole("tablist").getByRole("tab");
      await expect(tabs).toHaveCount(3);
      const ids = await tabs.evaluateAll((els) => els.map((el) => el.id));

      await tabs.first().focus();
      await page.keyboard.press(forward);
      expect(await selectedTab(page)).toBe(ids[1]);
      await expect(tabs.nth(1)).toBeFocused();
      await expect(tabs.nth(1)).toHaveAttribute("tabindex", "0");
      await expect(tabs.first()).toHaveAttribute("tabindex", "-1");
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

      await page.keyboard.press(backward);
      expect(await selectedTab(page)).toBe(ids[0]);
      await page.keyboard.press(backward); // wraps to the last
      expect(await selectedTab(page)).toBe(ids[2]);
      await page.keyboard.press("Home");
      expect(await selectedTab(page)).toBe(ids[0]);
      await page.keyboard.press("End");
      expect(await selectedTab(page)).toBe(ids[2]);

      // only the selected panel is shown
      await expect(page.getByRole("tabpanel")).toHaveCount(1);
    });
  }

  test("ar: the next tab sits to the LEFT of the first (tabs run right-to-left)", async ({ page }) => {
    await openGallery(page, "ar");
    const tabs = page.getByRole("tablist").getByRole("tab");
    const first = (await tabs.nth(0).boundingBox())!;
    const second = (await tabs.nth(1).boundingBox())!;
    expect(second.x).toBeLessThan(first.x);
  });
});

test.describe("Toast", () => {
  test("polite toasts appear in a status live region, errors in an alert region", async ({ page }) => {
    await openGallery(page, "en");
    const status = page.getByRole("status");
    const alert = page.getByRole("alert");
    // regions exist before any toast (needed for announcements)
    await expect(status).toHaveCount(1);
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(alert).toHaveCount(1);

    await page.getByTestId("toast-success").click();
    await expect(status.locator("[data-toast=success]")).toContainText("Saved");

    await page.getByTestId("toast-error").click();
    await expect(alert.locator("[data-toast=error]")).toContainText("Payment did not go through");

    await status.getByRole("button", { name: "Dismiss notification" }).click();
    await expect(status.locator("[data-toast]")).toHaveCount(0);
  });

  test("ar: toasts sit at the logical end (left side) and auto-dismiss", async ({ page }) => {
    await page.clock.install();
    await openGallery(page, "ar");
    await page.getByTestId("toast-info").click();
    const toast = page.getByRole("status").locator("[data-toast=info]");
    await expect(toast).toBeVisible();
    const box = (await toast.boundingBox())!;
    const width = page.viewportSize()!.width;
    expect(box.x + box.width / 2).toBeLessThan(width / 2);

    await page.mouse.move(0, 0);
    await page.clock.runFor(6000);
    await expect(toast).toHaveCount(0);
  });

  test("hover pauses auto-dismiss", async ({ page }) => {
    await page.clock.install();
    await openGallery(page, "en");
    await page.getByTestId("toast-info").click();
    const toast = page.getByRole("status").locator("[data-toast=info]");
    await toast.hover();
    await page.clock.runFor(10000);
    await expect(toast).toBeVisible();
    await page.mouse.move(0, 0);
    await page.clock.runFor(6000);
    await expect(toast).toHaveCount(0);
  });
});
