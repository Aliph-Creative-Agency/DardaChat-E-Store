import { expect, test } from "@playwright/test";
import { closeDb, randomIp, waitForOutbox } from "./db";

const RUN = Date.now().toString(36);
test.use({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });
test.afterAll(() => closeDb());

test("/ar sign-in renders rtl Arabic; /en renders ltr English", async ({ page }) => {
  await page.goto("/ar/sign-in");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تسجيل الدخول");
  await page.goto("/en/sign-in");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
});

test("account requires a session", async ({ page }) => {
  await page.goto("/en/account");
  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fen%2Faccount$/);
});

test("register → account → sign out → sign in", async ({ page }) => {
  const email = `e2e-${RUN}@example.test`;
  const password = "juniper-courtyard-lamp-83";

  await page.goto("/en/sign-up");
  await page.getByLabel("Name (optional)", { exact: true }).fill("E2E Tester");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByTestId("account-identity")).toContainText(email);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/sign-in$/);
  await page.goto("/en/account");
  await expect(page).toHaveURL(/\/en\/sign-in/);

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("definitely-not-it-000");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("The email or password is incorrect.");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByTestId("account-identity")).toContainText(email);
});

test("phone + OTP sign-in (code read from the outbox)", async ({ page }) => {
  const local = `059${String(Date.now()).slice(-7)}`;
  const e164 = `+970${local.slice(1)}`;
  const before = new Date(Date.now() - 1000);

  await page.goto("/ar/sign-in");
  await page.getByRole("tab", { name: "رقم الجوال" }).click();
  await page.getByRole("textbox", { name: "رقم الجوال" }).fill(local);
  await page.getByRole("button", { name: "أرسل الرمز" }).click();
  const payload = await waitForOutbox(e164, "auth.otp", before);
  await page.getByLabel("الرمز المكوّن من 6 أرقام", { exact: true }).fill(String(payload.code));
  await page.getByRole("button", { name: "تحقّق وادخل" }).click();
  await expect(page).toHaveURL(/\/ar\/account$/);
  await expect(page.getByTestId("account-identity")).toContainText(local.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3"));
});

test("forgot → reset via the emailed link → sign in with the new password", async ({ page, request }) => {
  const email = `reset-${RUN}@example.test`;
  const reg = await request.post("/api/auth/customer/register", {
    data: { email, password: "first-garden-kettle-11", locale: "en" },
  });
  expect(reg.status()).toBe(201);
  const before = new Date(Date.now() - 1000);

  await page.goto("/en/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("If an account exists");
  const { url } = (await waitForOutbox(email, "auth.password_reset", before)) as { url: string };
  const link = new URL(url);
  await page.goto(link.pathname + link.search);
  await page.getByLabel("New password", { exact: true }).fill("second-harbour-violin-22");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Your password was changed");

  const signIn = await request.post("/api/auth/customer/sign-in", {
    data: { email, password: "second-harbour-violin-22" },
  });
  expect(signIn.status()).toBe(200);
});

test("API: 429 with Retry-After once the identity limit is hit", async ({ request }) => {
  const email = `rl-${RUN}@example.test`;
  let last = 0;
  let retryAfter: string | undefined;
  for (let i = 0; i < 11; i++) {
    const r = await request.post("/api/auth/customer/sign-in", { data: { email, password: "wrong-wrong-wrong" } });
    last = r.status();
    retryAfter = r.headers()["retry-after"];
  }
  expect(last).toBe(429);
  expect(Number(retryAfter)).toBeGreaterThan(0);
});
