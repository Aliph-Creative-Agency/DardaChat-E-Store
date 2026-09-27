import { type APIRequestContext, type BrowserContext, expect, type Page, test } from "@playwright/test";
import { generate } from "otplib";
import { closeDb, createOwner, randomIp } from "./db";

/**
 * FR-ACC-009/013/014: the Owner manages back-office users; a Staff session is refused the admin API (403);
 * suspend and revoke take effect on that user's very next request; the audit history outlives the revoke.
 */
const NAV = { timeout: 30_000 };
const run = Math.random().toString(36).slice(2, 8);
// own Owner (not the seeded one): staff.spec re-enrols the seeded owner in a parallel worker
const OWNER_EMAIL = `e2e-owner-${run}@dardachat.test`;
const OWNER_PASSWORD = `violet-harbour-lantern-${run}`;
const STAFF_EMAIL = `e2e-staff-${run}@dardachat.test`;
const STAFF_NAME = `E2E Staff ${run}`;

test.describe.configure({ mode: "serial" });

let owner: Page;
let staffCtx: BrowserContext;
let staffPage: Page;

/** Password sign-in + TOTP enrolment through the real API; the context keeps the 2FA-complete session cookie. */
async function signInAndEnrol(request: APIRequestContext, email: string, password: string) {
  const r = await request.post("/api/auth/staff/sign-in", { data: { email, password } });
  expect(r.status(), await r.text()).toBe(200);
  expect(await r.json()).toMatchObject({ next: "enrol" });
  const e = await request.post("/api/auth/staff/two-factor/enrol");
  expect(e.status()).toBe(200);
  const secret = String((await e.json()).groupedSecret).replace(/\s+/g, "");
  const c = await request.post("/api/auth/staff/two-factor/confirm", { data: { code: await generate({ secret }) } });
  expect(c.status(), await c.text()).toBe(200);
}

const row = () => owner.locator(`[data-testid="staff-user-row"][data-email="${STAFF_EMAIL}"]`);
const act = async (label: string) => {
  await row().getByRole("button", { name: `${label} — ${STAFF_NAME}` }).click();
};

test.beforeAll(async ({ browser }) => {
  await createOwner(OWNER_EMAIL, `E2E Owner ${run}`, OWNER_PASSWORD);
  owner = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });
  owner.on("dialog", (d) => void d.accept().catch(() => undefined)); // confirm() on suspend/revoke/reset
  staffCtx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });
  staffPage = await staffCtx.newPage();
});
test.afterAll(async () => {
  await owner?.context().close();
  await staffCtx?.close();
  await closeDb();
});

test("owner creates a staff user; that staff session gets 403 from the admin API and page", async () => {
  await signInAndEnrol(owner.request, OWNER_EMAIL, OWNER_PASSWORD);
  await owner.goto("/en/admin/users");
  await expect(owner.getByRole("heading", { level: 1 })).toHaveText("Users", NAV);

  await owner.getByLabel("Full name", { exact: true }).fill(STAFF_NAME);
  await owner.getByLabel("Email", { exact: true }).fill(STAFF_EMAIL);
  await expect(owner.getByLabel("Role", { exact: true })).toHaveValue("staff");
  await owner.getByRole("button", { name: "Create user" }).click();
  const temp = owner.getByTestId("temp-password");
  await expect(temp).toBeVisible(NAV);
  const tempPassword = (await temp.textContent())!.trim();
  expect(tempPassword.length).toBeGreaterThanOrEqual(16);
  await expect(row().getByTestId("staff-user-status")).toHaveText("Active");

  await signInAndEnrol(staffCtx.request, STAFF_EMAIL, tempPassword);
  const api = await staffCtx.request.get("/api/admin/users");
  expect(api.status()).toBe(403);
  expect(await api.json()).toEqual({ error: "forbidden" });
  expect((await staffCtx.request.post("/api/admin/users", { data: { email: "x@y.z", name: "x", role: "owner" } })).status()).toBe(403);
  await staffPage.goto("/en/admin/users");
  await expect(staffPage).toHaveURL(/\/en\/staff\/forbidden$/, NAV);
});

test("suspend → the staff user's next request is rejected; reinstate; revoke → rejected, history kept", async () => {
  await owner.reload();
  await act("Suspend");
  await expect(row().getByTestId("staff-user-status")).toHaveText("Suspended", NAV);

  const afterSuspend = await staffCtx.request.get("/api/admin/users");
  expect(afterSuspend.status()).toBe(401);
  await staffPage.goto("/en/admin/users");
  await expect(staffPage).toHaveURL(/\/en\/staff\/sign-in\?next=/, NAV);

  await act("Reinstate");
  await expect(row().getByTestId("staff-user-status")).toHaveText("Active", NAV);

  await act("Revoke");
  await expect(row().getByTestId("staff-user-status")).toHaveText("Revoked", NAV);
  await expect(row().getByRole("button")).toHaveCount(0);
  expect((await staffCtx.request.get("/api/admin/users")).status()).toBe(401);
  const again = await staffCtx.request.post("/api/auth/staff/sign-in", { data: { email: STAFF_EMAIL, password: "whatever-it-was" } });
  expect(again.status()).not.toBe(200);

  // the owner cannot act on themselves, and the history outlives the revoke
  const self = await owner.request.post(`/api/admin/users/${await ownerId()}/suspend`);
  expect(self.status()).toBe(409);
  expect(await self.json()).toMatchObject({ error: "self_action" });

  await row().getByRole("link", { name: STAFF_NAME }).click();
  await expect(owner.getByRole("heading", { level: 1 })).toHaveText(STAFF_NAME, NAV);
  const history = owner.getByTestId("audit-history");
  for (const action of ["staff.create", "auth.staff_sign_in", "auth.2fa_enrolled", "staff.suspend", "staff.reinstate", "staff.revoke"]) {
    await expect(history.locator(`tr[data-action="${action}"]`).first()).toBeVisible();
  }
  await expect(history.locator('tr[data-action="staff.revoke"]')).toContainText("Revoked");

  await owner.goto("/ar/admin/users");
  await expect(owner.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(owner.getByRole("heading", { level: 1 })).toHaveText("المستخدمون", NAV);
  await expect(row().getByTestId("staff-user-status")).toHaveText("ملغى");
});

async function ownerId(): Promise<string> {
  const r = await owner.request.get("/api/admin/users");
  const { users } = (await r.json()) as { users: { id: string; email: string }[] };
  return users.find((u) => u.email === OWNER_EMAIL)!.id;
}
