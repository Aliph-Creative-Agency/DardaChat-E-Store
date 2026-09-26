/**
 * Apply the schema to the dev DB (or the test DB with --test):
 *   1. `drizzle-kit push --force` (non-interactive; prototype uses push, no migration files)
 *   2. every src/db/sql/*.sql in name order (files must be idempotent)
 * With --reset: drop & recreate the `public` schema first, then seed (dev only unless --test is also given).
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { WEB_ROOT, databaseUrl, isTestFlag } from "./env";

const test = isTestFlag();
const reset = process.argv.includes("--reset");
const seed = process.argv.includes("--seed");
const url = databaseUrl({ test });
const label = test ? "dardachat_test" : "dardachat";

async function main() {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    if (reset) {
      await sql.unsafe("drop schema if exists public cascade; create schema public;");
      console.log(`[${label}] public schema reset`);
    }

    const drizzleKit = path.join(WEB_ROOT, "node_modules", "drizzle-kit", "bin.cjs");
    const push = spawnSync(process.execPath, [drizzleKit, "push", "--force"], {
      cwd: WEB_ROOT,
      env: { ...process.env, DRIZZLE_DATABASE_URL: url },
      encoding: "utf8",
    });
    if (push.status !== 0) {
      process.stderr.write(push.stdout ?? "");
      process.stderr.write(push.stderr ?? "");
      throw new Error(`drizzle-kit push failed for ${label}`);
    }
    console.log(`[${label}] drizzle-kit push ok`);

    const dir = path.join(WEB_ROOT, "src", "db", "sql");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      await sql.unsafe(readFileSync(path.join(dir, file), "utf8"));
      console.log(`[${label}] applied ${file}`);
    }
  } finally {
    await sql.end();
  }

  if (seed) {
    const { runSeed } = await import("../src/db/seed");
    const { resolveSeedStaff } = await import("./seed-credentials");
    await runSeed(url, { staff: resolveSeedStaff() });
    console.log(`[${label}] seeded`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
