// Loads web/.env.local then web/.env (first wins) for CLI scripts. Next.js loads these itself at runtime.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

export const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

config({ path: path.join(WEB_ROOT, ".env.local"), quiet: true });
config({ path: path.join(WEB_ROOT, ".env"), quiet: true });

export const PG_PORT = Number(process.env.PG_PORT ?? 54320);
export const DEV_DB = "dardachat";
export const TEST_DB = "dardachat_test";

export function databaseUrl(opts: { test?: boolean } = {}): string {
  const fromEnv = opts.test ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  return fromEnv ?? `postgres://postgres:postgres@localhost:${PG_PORT}/${opts.test ? TEST_DB : DEV_DB}`;
}

export const isTestFlag = (argv = process.argv) => argv.includes("--test");
