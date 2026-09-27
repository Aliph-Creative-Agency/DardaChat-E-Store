import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "../../db/seed";
import { createTestDb, testDatabaseUrl, truncateAll } from "../../db/test-utils";
import { COOKIE_NAMES } from "./config";
import { can, getRouteMeta, makeStaffRoute } from "./guards";
import { isKnownPermission, type Permission } from "./permissions";
import { staffUsers } from "./schema";
import { createSession, markSecondFactor } from "./session";

/**
 * Deny-by-default proof (FR-ACC-009/010, NFR-SEC-003). Walks every back-office entry point on disk:
 *  1. each `src/app/api/admin/**\/route.ts` HTTP export is a `staffRoute` with a registered permission, answers 401
 *     without a session, 403 to a Staff session lacking the permission, and lets an Owner through;
 *  2. each `src/app/[locale]/admin/**\/page.tsx` calls `requireStaff(`, and every `"use server"` module under an
 *     `admin` folder exports only `staffAction(...)` wrappers;
 *  3. a handler guarded by an unregistered permission is refused for everyone.
 * A new admin file that skips the guards turns this test red and the message names the file.
 */

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(SRC, "app");
const API_ADMIN = path.join(APP, "api", "admin");
const PAGE_ADMIN = path.join(APP, "[locale]", "admin");
const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

function walk(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const rel = (p: string) => path.relative(SRC, p).split(path.sep).join("/");

/** `[id]`, `[...slug]`, `[[...slug]]` segments of a route file → fake params (a UUID so id checks pass shape). */
function paramsFor(file: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  for (const m of rel(file).matchAll(/\[\[?(\.\.\.)?([^\]]+)\]\]?/g)) {
    params[m[2]!] = m[1] ? ["00000000-0000-4000-8000-000000000000"] : "00000000-0000-4000-8000-000000000000";
  }
  return params;
}

const { db, close } = createTestDb();
let ownerToken: string;
let staffToken: string;
let staffId: string;

async function fullSession(email: string): Promise<{ id: string; token: string }> {
  const [u] = await db.select().from(staffUsers).where(eq(staffUsers.email, email));
  const s = await createSession(db, { type: "staff", id: u!.id });
  return { id: u!.id, token: (await markSecondFactor(db, s.session)).token };
}

function request(file: string, method: string, token?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" };
  if (token) headers.cookie = `${COOKIE_NAMES.staff}=${token}`;
  const hasBody = method !== "GET" && method !== "HEAD";
  return new Request(`http://localhost/${rel(file)}`, { method, headers, body: hasBody ? "{}" : undefined });
}

beforeAll(async () => {
  await truncateAll(db);
  await runSeed(testDatabaseUrl(), {
    staff: {
      owner: { email: "owner@walk.test", password: "owner-pw-walker-test" },
      staff: { email: "staff@walk.test", password: "staff-pw-walker-test" },
    },
    log: () => {},
  });
  ownerToken = (await fullSession("owner@walk.test")).token;
  const s = await fullSession("staff@walk.test");
  staffToken = s.token;
  staffId = s.id;
}, 120_000);

afterAll(async () => {
  await close();
  // the app pool (`@/db/client`) the imported routes opened
  const g = globalThis as { __dardachatDb?: { $client?: { end: () => Promise<void> } } };
  await g.__dardachatDb?.$client?.end();
});

describe("admin API routes (src/app/api/admin/**/route.ts)", () => {
  const routeFiles = walk(API_ADMIN).filter((f) => path.basename(f) === "route.ts");

  it("there is at least one admin route to walk", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it("every exported HTTP method is a staffRoute: 401 without a session, 403 without the permission, Owner passes", async () => {
    const failures: string[] = [];
    let checked = 0;
    for (const file of routeFiles) {
      const mod = (await import(/* @vite-ignore */ file)) as Record<string, unknown>;
      const exported = METHODS.filter((m) => m in mod);
      if (exported.length === 0) failures.push(`${rel(file)}: exports no HTTP method`);
      for (const method of exported) {
        const where = `${rel(file)} ${method}`;
        const handler = mod[method] as (req: Request, ctx: { params: Promise<unknown> }) => Promise<Response>;
        const meta = getRouteMeta(handler);
        if (!meta) {
          failures.push(`${where}: not wrapped in staffRoute(permission, …)`);
          continue;
        }
        if (!isKnownPermission(meta.permission)) {
          failures.push(`${where}: permission "${meta.permission}" is not in the registry`);
          continue;
        }
        const call = (token?: string) => handler(request(file, method, token), { params: Promise.resolve(paramsFor(file)) });

        const anon = await call();
        if (anon.status !== 401) failures.push(`${where}: no session → ${anon.status}, expected 401`);

        const staffAllowed = await can(db, staffId, meta.permission);
        const asStaff = await call(staffToken);
        if (!staffAllowed && asStaff.status !== 403) {
          failures.push(`${where}: Staff lacks "${meta.permission}" → ${asStaff.status}, expected 403`);
        }
        if (staffAllowed && (asStaff.status === 401 || asStaff.status === 403)) {
          failures.push(`${where}: Staff holds "${meta.permission}" but got ${asStaff.status}`);
        }

        const asOwner = await call(ownerToken);
        if (asOwner.status === 401 || asOwner.status === 403) {
          failures.push(`${where}: Owner with "${meta.permission}" → ${asOwner.status}`);
        }
        checked++;
      }
    }
    expect(failures, `Unguarded or mis-guarded admin routes:\n${failures.join("\n")}`).toEqual([]);
    expect(checked).toBeGreaterThan(0);
  }, 60_000);
});

describe("admin pages and server actions (static scan)", () => {
  const adminFiles = walk(PAGE_ADMIN);

  it("every src/app/[locale]/admin/**/page.tsx calls requireStaff(", () => {
    const pages = adminFiles.filter((f) => path.basename(f) === "page.tsx");
    expect(pages.length).toBeGreaterThan(0);
    const missing = pages.filter((f) => !/\brequireStaff\(/.test(readFileSync(f, "utf8"))).map(rel);
    expect(missing, `Admin pages without requireStaff(permission):\n${missing.join("\n")}`).toEqual([]);
  });

  it('every export of a "use server" module under an admin folder is a staffAction(', () => {
    const candidates = walk(APP)
      .concat(walk(path.join(SRC, "modules")))
      .filter((f) => /[\\/]admin[\\/]|admin[^\\/]*\.tsx?$/.test(path.relative(SRC, f)) && /\.tsx?$/.test(f))
      .filter((f) => !/\.test\.tsx?$/.test(f));
    const failures: string[] = [];
    for (const f of candidates) {
      const src = readFileSync(f, "utf8");
      if (!/^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(src)) continue;
      for (const m of src.matchAll(/^export\s+(?:default\s+)?(?:async\s+)?(function|const|let|var|class)\s*(\w*)[^\n]*/gm)) {
        const line = m[0];
        const ok = m[1] === "const" && /=\s*staffAction\(/.test(line);
        if (!ok) failures.push(`${rel(f)}: \`${line.trim().slice(0, 80)}\` is not a staffAction(permission, …)`);
      }
      if (/^export\s*\{/m.test(src)) failures.push(`${rel(f)}: re-exports in a "use server" module cannot be checked`);
    }
    expect(failures, `Unguarded admin server actions:\n${failures.join("\n")}`).toEqual([]);
  });
});

describe("unregistered permission (fixture)", () => {
  it("a handler guarded by an unknown permission key is 403 for Owner and Staff", async () => {
    const staffRoute = makeStaffRoute(() => db);
    const handler = staffRoute("reports.everything" as Permission, () => Response.json({ leaked: true }));
    for (const token of [ownerToken, staffToken]) {
      const res = await handler(
        new Request("http://localhost/api/admin/fixture", { headers: { cookie: `${COOKIE_NAMES.staff}=${token}` } }),
      );
      expect(res.status).toBe(403);
    }
    expect(isKnownPermission("reports.everything")).toBe(false);
  });
});
