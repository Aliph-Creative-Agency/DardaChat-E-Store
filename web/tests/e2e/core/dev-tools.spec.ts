import { expect, test, type Page } from "@playwright/test";

test("dev pages render in both locales without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/ar/dev/outbox", "/en/dev/outbox", "/ar/dev/services", "/en/dev/services"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function setFaultInUi(page: Page, service: string, mode: string) {
  await page.goto("/ar/dev/services");
  const row = page.locator(`tr[data-service="${service}"]`);
  await row.locator("select[name=mode]").selectOption(mode);
  await row.getByRole("button", { name: "Apply" }).click();
  await expect(row.locator("select[name=mode]")).toHaveValue(mode);
}

test("a test message posted to /api/dev/outbox shows on /ar/dev/outbox", async ({ page, request }) => {
  const text = `e2e outbox check ${unique()}`;
  const res = await request.post("/api/dev/outbox", { data: { channel: "whatsapp", to: "+970599000111", text } });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as { status: string; channel: string };
  expect(body).toMatchObject({ status: "sent", channel: "whatsapp" });

  const list = await request.get("/api/dev/outbox?to=%2B970599000111");
  const json = (await list.json()) as { messages: { text: string }[] };
  expect(json.messages.some((m) => m.text === text)).toBe(true);

  await page.goto("/ar/dev/outbox");
  await expect(page.getByText(text)).toBeVisible();
  await page.goto("/en/dev/outbox?channel=whatsapp&status=sent");
  await expect(page.getByText(text)).toBeVisible();
});

test("toggling sms down on /ar/dev/services degrades it after a failed send, and back up", async ({ page, request }) => {
  test.setTimeout(120_000);
  try {
    await setFaultInUi(page, "sms", "down");
    const failed = await request.post("/api/dev/outbox", {
      data: { channel: "sms", to: "+970599000222", text: `e2e sms down ${unique()}` },
    });
    expect(failed.status()).toBe(502);
    await page.goto("/ar/dev/services");
    await expect(page.locator('tr[data-service="sms"] [data-status]').first()).toHaveAttribute("data-status", "degraded");
  } finally {
    await setFaultInUi(page, "sms", "");
  }
  const ok = await request.post("/api/dev/outbox", {
    data: { channel: "sms", to: "+970599000222", text: `e2e sms up ${unique()}` },
  });
  expect(ok.status()).toBe(201);
  await page.goto("/en/dev/services");
  await expect(page.locator('tr[data-service="sms"] [data-status]').first()).toHaveAttribute("data-status", "up");
});
