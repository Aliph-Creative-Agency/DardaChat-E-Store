import type { FullConfig } from "@playwright/test";

/**
 * Warm the dev server before parallel workers start (CHANGE-REQUESTS 2026-09-27 03:40): on a cold Turbopack `.next`,
 * several workers compiling routes at once made Next dev throw "Unexpected end of JSON input" on a first hit.
 * Playwright starts `webServer` before `globalSetup`, so the server is up here; hit each route family once, serially.
 */
const ID = "00000000-0000-4000-8000-000000000000";
// Every page route once (one locale is enough to compile it) and every API route by GET: GET on a POST-only handler
// answers 405 after compiling it; the three GET handlers are read-only.
const WARM_PATHS = [
  "/ar",
  "/en",
  "/ar/sign-in",
  "/ar/sign-up",
  "/ar/account",
  "/ar/forgot-password",
  "/ar/reset-password",
  "/ar/nope",
  "/ar/staff/sign-in",
  "/ar/staff/two-factor",
  "/ar/staff/two-factor/setup",
  "/ar/staff/change-password",
  "/ar/staff/forbidden",
  "/ar/staff/forgot-password",
  "/ar/staff/reset-password",
  "/ar/admin",
  "/ar/admin/orders",
  "/en/admin/users",
  `/ar/admin/users/${ID}`,
  "/ar/dev/ui",
  "/ar/dev/ui/boom",
  "/ar/dev/outbox",
  "/ar/dev/services",
  ...[
    "customer/otp/request",
    "customer/otp/verify",
    "customer/password/forgot",
    "customer/password/reset",
    "customer/register",
    "customer/sign-in",
    "customer/sign-out",
    "staff/password/change",
    "staff/password/forgot",
    "staff/password/reset",
    "staff/sign-in",
    "staff/sign-out",
    "staff/two-factor/challenge",
    "staff/two-factor/confirm",
    "staff/two-factor/enrol",
  ].map((r) => `/api/auth/${r}`),
  "/api/admin/users",
  ...["reinstate", "reset-2fa", "revoke", "role", "suspend"].map((a) => `/api/admin/users/${ID}/${a}`),
  "/api/dev/outbox?limit=1",
  "/api/storage/warm-up.txt",
];

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? `http://localhost:${process.env.WEB_PORT ?? "3000"}`;
  for (const path of WARM_PATHS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${baseURL}${path}`, { redirect: "manual", signal: AbortSignal.timeout(120_000) });
        await res.arrayBuffer();
        if (res.status < 500) break;
      } catch {
        // compile hiccup on a cold server: try again
      }
    }
  }
}
