import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { DbOrTx } from "../../db/connection";
import { settings } from "../core/schema";

/**
 * Password policy (FR-ACC-015 for back-office users; same checks for customers with a lower minimum).
 * Breached check = bundled list of well-known leaked/common passwords (offline; HIBP k-anonymity is BACKLOG).
 */

export type PasswordKind = "staff" | "customer";
export type PasswordProblem = "too_short" | "too_long" | "breached" | "contains_identity";

export const PASSWORD_MAX_LENGTH = 256;
export const PASSWORD_SETTING_KEYS = {
  staff: "auth.staff_password_min_length",
  customer: "auth.customer_password_min_length",
} as const;
export const DEFAULT_PASSWORD_MIN_LENGTH: Record<PasswordKind, number> = { staff: 12, customer: 8 };

let breached: Set<string> | undefined;
function breachedSet(): Set<string> {
  if (!breached) {
    const file = path.join(process.cwd(), "src", "modules", "auth", "data", "common-passwords.txt");
    breached = new Set(
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    );
  }
  return breached;
}

export function isBreachedPassword(password: string): boolean {
  const set = breachedSet();
  const lower = password.normalize("NFKC").toLowerCase();
  if (set.has(lower)) return true;
  // "Password123!" → "password": strip trailing digits/symbols, then leading ones
  const trimmed = lower.replace(/[\d\W_]+$/u, "");
  if (trimmed.length >= 4 && set.has(trimmed)) return true;
  const both = trimmed.replace(/^[\d\W_]+/u, "");
  return both.length >= 4 && set.has(both);
}

export interface CheckPasswordOptions {
  kind: PasswordKind;
  minLength?: number;
  /** Email, name… — the password may not contain these (or the email's local part). */
  identity?: Array<string | null | undefined>;
}

export function checkPassword(password: string, opts: CheckPasswordOptions): PasswordProblem[] {
  const problems: PasswordProblem[] = [];
  const min = opts.minLength ?? DEFAULT_PASSWORD_MIN_LENGTH[opts.kind];
  const length = [...password].length;
  if (length < min) problems.push("too_short");
  if (length > PASSWORD_MAX_LENGTH) problems.push("too_long");
  if (isBreachedPassword(password)) problems.push("breached");
  const lower = password.toLowerCase();
  const parts = new Set<string>();
  for (const id of opts.identity ?? []) {
    if (!id) continue;
    const v = id.trim().toLowerCase();
    parts.add(v);
    if (v.includes("@")) parts.add(v.split("@")[0]!);
    for (const word of v.split(/[\s._@-]+/)) parts.add(word);
  }
  for (const p of parts) {
    if (p.length >= 4 && lower.includes(p)) {
      problems.push("contains_identity");
      break;
    }
  }
  return problems;
}

/** Owner-configurable minimum (settings table); falls back to the defaults. */
export async function getPasswordMinLength(db: DbOrTx, kind: PasswordKind): Promise<number> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, PASSWORD_SETTING_KEYS[kind]));
  const n = Number(row?.value);
  return Number.isInteger(n) && n >= 6 && n <= 128 ? n : DEFAULT_PASSWORD_MIN_LENGTH[kind];
}

/** Convenience: policy check with the configured minimum. */
export async function checkPasswordWithSettings(
  db: DbOrTx,
  password: string,
  opts: Omit<CheckPasswordOptions, "minLength">,
): Promise<PasswordProblem[]> {
  return checkPassword(password, { ...opts, minLength: await getPasswordMinLength(db, opts.kind) });
}
