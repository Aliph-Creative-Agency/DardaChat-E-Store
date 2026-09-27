import { expect, test } from "@playwright/test";
import { generate } from "otplib";
import { closeDb, randomIp, resetStaffTwoFactor } from "./db";

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@dardachat.local";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "";
const ip = randomIp();
/** first hits compile pages in `next dev`; allow for it */
const NAV = { timeout: 30_000 };
test.use({ extraHTTPHeaders: { "x-forwarded-for": ip } });
test.beforeAll(async () => {
  expect(OWNER_PASSWORD, "SEED_OWNER_PASSWORD must be set in web/.env.local").not.toBe("");
  await resetStaffTwoFactor(OWNER_EMAIL);
});
test.afterAll(() => closeDb());

test("/ar/staff/sign-in renders rtl Arabic", async ({ page }) => {
  await page.goto("/ar/staff/sign-in");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تسجيل دخول الإدارة");
});

test("an admin page without a session goes to staff sign-in", async ({ page }) => {
  await page.goto("/en/admin/users");
  await expect(page).toHaveURL(/\/en\/staff\/sign-in\?next=%2Fen%2Fadmin%2Fusers$/, NAV);
});

test("owner: sign in → forced enrolment → recovery codes → admin; sign out; sign in → challenge", async ({ page }) => {
  await page.goto("/en/staff/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/staff\/two-factor\/setup\?next=/, NAV);

  // the password-only session is not enough for the back office
  await page.goto("/en/admin/users");
  await expect(page).toHaveURL(/\/en\/staff\/two-factor(\/setup)?\?next=/, NAV);
  await page.goto("/en/staff/two-factor/setup");

  await expect(page.getByTestId("totp-key")).toBeVisible(NAV);
  const key = (await page.getByTestId("totp-key").textContent())!.replace(/\s+/g, "");
  expect(key).toMatch(/^[A-Z2-7]{32}$/);
  await page.getByLabel("6-digit code from the app", { exact: true }).fill(await generate({ secret: key }));
  await page.getByRole("button", { name: "Confirm" }).click();
  const codes = page.getByTestId("recovery-codes").getByRole("listitem");
  await expect(codes).toHaveCount(10, NAV);
  await page.getByRole("button", { name: "I have saved them — continue" }).click();
  // no ?next= on the setup page → default landing = the dashboard (every role has dashboard.view)
  await expect(page).toHaveURL(/\/en\/admin$/, NAV);
  await page.goto("/en/admin/users");
  await expect(page.getByTestId("staff-identity")).toBeVisible(NAV);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/staff\/sign-in$/, NAV);

  await page.getByLabel("Email", { exact: true }).fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/staff\/two-factor\?next=/, NAV);
  const field = page.getByLabel("Authentication or recovery code", { exact: true });
  await field.fill("000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("That code is not correct.");
  // next time step (inside the ±1 window, after the step used at enrolment → no replay)
  await field.fill(await generate({ secret: key, epoch: Math.floor(Date.now() / 1000) + 30 }));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/en\/admin$/, NAV);
});

test("a password-only session cookie gets 401 from an admin API", async ({ request }) => {
  expect((await request.get("/api/admin/users")).status()).toBe(401);
  const r = await request.post("/api/auth/staff/sign-in", { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  expect(r.status()).toBe(200);
  expect(await r.json()).toMatchObject({ ok: true, next: "challenge" });
  const api = await request.get("/api/admin/users");
  expect(api.status()).toBe(401);
  expect(await api.json()).toEqual({ error: "two_factor_required" });
});
