/**
 * Back-office seed accounts for the CLI seed. Emails come from SEED_OWNER_EMAIL / SEED_STAFF_EMAIL; passwords from
 * SEED_OWNER_PASSWORD / SEED_STAFF_PASSWORD in web/.env.local. A missing/empty password is generated and written to
 * .env.local — plaintext lives ONLY there and is never printed.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SeedContext } from "../src/db/seed-types";
import { WEB_ROOT } from "./env";

const ENV_LOCAL = path.join(WEB_ROOT, ".env.local");

function ensurePassword(key: string): string {
  const current = process.env[key]?.trim();
  if (current) return current;
  const generated = randomBytes(18).toString("base64url"); // 24 chars
  let text = existsSync(ENV_LOCAL) ? readFileSync(ENV_LOCAL, "utf8") : "";
  const line = new RegExp(`^${key}=.*$`, "m");
  if (line.test(text)) {
    text = text.replace(line, `${key}=${generated}`);
  } else {
    text = `${text}${text === "" || text.endsWith("\n") ? "" : "\n"}${key}=${generated}\n`;
  }
  writeFileSync(ENV_LOCAL, text);
  process.env[key] = generated;
  return generated;
}

export function resolveSeedStaff(): SeedContext["staff"] {
  return {
    owner: {
      email: process.env.SEED_OWNER_EMAIL?.trim() || "owner@dardachat.local",
      password: ensurePassword("SEED_OWNER_PASSWORD"),
    },
    staff: {
      email: process.env.SEED_STAFF_EMAIL?.trim() || "staff@dardachat.local",
      password: ensurePassword("SEED_STAFF_PASSWORD"),
    },
  };
}
