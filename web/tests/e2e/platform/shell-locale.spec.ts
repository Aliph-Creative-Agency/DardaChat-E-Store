import { expect, test } from "@playwright/test";

test.describe("locale routing (UI-001, UI-003)", () => {
  test("/ goes to /ar even when the browser prefers English", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      locale: "en-US",
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
    await context.close();
  });

  test("/ follows the NEXT_LOCALE cookie", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL! }]);
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await context.close();
  });

  test("/ar is Arabic right-to-left, /en English left-to-right", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("unknown locales and paths are 404", async ({ page }) => {
    for (const path of ["/fr", "/xx/abc", "/ar/definitely-not-a-page"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
  });

  test("/api/* is not locale-redirected", async ({ request }) => {
    const response = await request.get("/api/does-not-exist", { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers()["location"]).toBeUndefined();
  });
});

test("switching to English with the locale switcher makes / land on /en afterwards (UI-003)", async ({ page, context }) => {
  await context.clearCookies();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ar");
  await page.getByTestId("main-nav").waitFor();
  await page.getByRole("banner").locator("[data-testid=\"locale-switch-en\"]:visible").click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  const cookie = (await context.cookies()).find((c) => c.name === "NEXT_LOCALE");
  expect(cookie?.value).toBe("en");
});
