import { expect, test } from "@playwright/test";

/** SHL-11 localized 404 and error pages. */

const COPY = {
  ar: { notFound: "لم نجد هذه الصفحة", home: "العودة إلى الرئيسية", error: "حدث خطأ غير متوقع", retry: "حاول مرة أخرى" },
  en: { notFound: "We couldn't find this page", home: "Back to home", error: "Something went wrong", retry: "Try again" },
} as const;

for (const locale of ["ar", "en"] as const) {
  test(`/${locale}/nope → 404 with ${locale} copy inside the store chrome and a link home`, async ({ page }) => {
    const response = await page.goto(`/${locale}/nope`);
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(COPY[locale].notFound);
    await expect(page.getByRole("banner")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: COPY[locale].home }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
  });

  test(`/${locale}/dev/ui/boom shows the localized error page and "try again" recovers`, async ({ page, context }) => {
    await context.clearCookies({ name: "dc_boom" });
    await page.goto(`/${locale}/dev/ui/boom`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(COPY[locale].error);
    const retry = page.getByRole("main").getByRole("button", { name: COPY[locale].retry });
    await expect(retry).toBeVisible();

    // the fault clears; "try again" re-fetches the segment and the page renders
    await context.addCookies([{ name: "dc_boom", value: "off", url: page.url() }]);
    await retry.click();
    await expect(page.getByTestId("boom-recovered")).toBeVisible();
  });
}

test("/xx/nope (unknown locale) → 404 in the default locale", async ({ page }) => {
  const response = await page.goto("/xx/nope");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(COPY.ar.notFound);
});

test("a URL no route matches gets the bilingual global 404", async ({ page }) => {
  const response = await page.goto("/nope.txt");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText([COPY.ar.notFound, COPY.en.notFound]);
  await expect(page.getByRole("link", { name: COPY.en.home })).toHaveAttribute("href", "/en");
});
