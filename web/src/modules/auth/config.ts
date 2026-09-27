/**
 * Auth configuration (FR-ACC-005, NFR-SEC-007, NFR-SEC-010). Read lazily so tests can set env before first use.
 */

type Env = Record<string, string | undefined>;

export const SESSION_SECRET_PLACEHOLDER = "change-me-to-a-long-random-string";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const TTL = {
  staffIdleMs: 12 * HOUR, // NFR-SEC-010
  staffAbsoluteMs: 7 * DAY,
  customerIdleMs: 30 * DAY,
  customerAbsoluteMs: 90 * DAY,
  otpMs: 5 * MINUTE, // FR-ACC-003
  resetTokenMs: 60 * MINUTE, // FR-ACC-006
  /** `last_seen_at` is written at most this often per session. */
  touchIntervalMs: MINUTE,
} as const;

export const OTP_MAX_ATTEMPTS = 5;

export const COOKIE_NAMES = { customer: "dc_session", staff: "dc_staff_session" } as const;

export function getSessionSecret(env: Env = process.env): string {
  const secret = env.SESSION_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters (see web/.env.example)");
  }
  if (env.NODE_ENV === "production" && secret === SESSION_SECRET_PLACEHOLDER) {
    throw new Error("SESSION_SECRET still has the .env.example placeholder; refusing to run in production");
  }
  return secret;
}

export function getAppUrl(env: Env = process.env): string {
  return (env.APP_URL ?? `http://localhost:${env.WEB_PORT ?? 3000}`).replace(/\/+$/, "");
}

/** Cookies are `Secure` whenever the app is served over https. */
export function cookieSecure(env: Env = process.env): boolean {
  return getAppUrl(env).startsWith("https://");
}
