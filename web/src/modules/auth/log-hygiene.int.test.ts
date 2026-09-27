import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, desc, eq } from "drizzle-orm";
import { generate } from "otplib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runSeed } from "../../db/seed";
import { createTestDb, testDatabaseUrl, truncateAll } from "../../db/test-utils";
import { messages } from "../engagement/schema";
import { registerCustomer, requestPhoneSignIn, signInCustomer, verifyPhoneSignIn } from "./customer-auth";
import { outboxOtpDelivery, outboxResetLinkDelivery } from "./otp-delivery";
import { requestPasswordReset, resetPassword } from "./password-reset";
import { validateSession } from "./session";
import { beginTotpEnrolment, challengeTotp, confirmTotpEnrolment, signInStaff } from "./staff-auth";

/**
 * NFR-SEC-007 / FR-ACC-005: no password, one-time code, reset token, session token, TOTP secret or recovery code
 * ever reaches the console or stdout/stderr; auth code has no console calls; real secrets stay out of git.
 */

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { db, close } = createTestDb();
const meta = { ip: "192.0.2.44", userAgent: "vitest" };
const OWNER = { email: "owner@hyg.test", password: "owner-pw-hygiene-test" };
const STAFF = { email: "staff@hyg.test", password: "staff-pw-hygiene-test" };
const CUSTOMER_PW = "quiet-meadow-copper-71";
const NEW_PW = "brass-orchard-window-58";
const PHONE = "+970599876543";
let clock = Date.UTC(2026, 8, 27, 14, 0, 5);
const tick = (ms = 1000) => new Date((clock += ms));

const captured: string[] = [];
const secrets = new Set<string>();
const keep = (...values: (string | null | undefined)[]) => {
  for (const v of values) if (v && v.length >= 6) secrets.add(v);
};

async function lastPayload<T>(to: string, eventKey: string): Promise<T> {
  const [m] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.to, to), eq(messages.eventKey, eventKey)))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return m!.payload as T;
}

beforeAll(async () => {
  await truncateAll(db);
  await runSeed(testDatabaseUrl(), { staff: { owner: OWNER, staff: STAFF }, log: () => {} });
  const record =
    (orig: (...a: never[]) => unknown) =>
    (...args: unknown[]) => {
      captured.push(args.map((a) => (typeof a === "string" ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })())).join(" "));
      return (orig as (...a: unknown[]) => unknown)(...args);
    };
  // take the originals BEFORE spying, or the recorder would call itself
  for (const m of ["log", "info", "warn", "error", "debug", "trace"] as const) {
    const orig = console[m].bind(console);
    vi.spyOn(console, m).mockImplementation(record(orig) as never);
  }
  for (const stream of [process.stdout, process.stderr]) {
    const orig = stream.write.bind(stream);
    vi.spyOn(stream, "write").mockImplementation(record(orig as never) as never);
  }
}, 120_000);

afterAll(async () => {
  vi.restoreAllMocks();
  await close();
});

describe("secrets never reach logs", () => {
  it("customer register / sign-in / phone OTP / password reset", async () => {
    keep(CUSTOMER_PW, NEW_PW);
    const reg = await registerCustomer(db, { email: "hyg@c.test", password: CUSTOMER_PW, locale: "en" }, meta, tick());
    expect(reg.ok).toBe(true);
    if (reg.ok) keep(reg.token);
    await signInCustomer(db, { email: "hyg@c.test", password: "wrong-" + CUSTOMER_PW }, meta, tick());
    const si = await signInCustomer(db, { email: "hyg@c.test", password: CUSTOMER_PW }, meta, tick());
    if (si.ok) keep(si.token);

    const otpMeta = { ...meta, locale: "ar" as const };
    expect((await requestPhoneSignIn(db, PHONE, otpMeta, { delivery: outboxOtpDelivery(db) }, tick())).ok).toBe(true);
    const { code } = await lastPayload<{ code: string }>(PHONE, "auth.otp");
    keep(code);
    await verifyPhoneSignIn(db, PHONE, code === "000000" ? "111111" : "000000", otpMeta, tick());
    const ph = await verifyPhoneSignIn(db, PHONE, code, otpMeta, tick());
    expect(ph.ok).toBe(true);
    if (ph.ok) keep(ph.token);

    await requestPasswordReset(db, "hyg@c.test", "customer", meta, { delivery: outboxResetLinkDelivery(db) }, tick());
    const { url } = await lastPayload<{ url: string }>("hyg@c.test", "auth.password_reset");
    const token = new URL(url).searchParams.get("token")!;
    keep(url, token);
    await resetPassword(db, token, "password", meta, tick()); // breached → refused
    expect((await resetPassword(db, token, NEW_PW, meta, tick())).ok).toBe(true);
  });

  it("staff sign-in, TOTP enrolment, challenge and recovery code", async () => {
    keep(OWNER.password);
    const first = await signInStaff(db, OWNER, meta, tick());
    if (!first.ok) throw new Error(first.error);
    keep(first.token);
    const s1 = (await validateSession(db, first.token, "staff", new Date(clock)))!;
    const en = await beginTotpEnrolment(db, s1, tick());
    if (!en.ok) throw new Error(en.error);
    keep(en.secret, en.groupedSecret, en.otpauthUri);
    const code = await generate({ secret: en.secret, epoch: Math.floor(clock / 1000) });
    keep(code);
    const conf = await confirmTotpEnrolment(db, s1, code, meta, new Date(clock));
    if (!conf.ok) throw new Error(conf.error);
    keep(conf.token, ...(conf.recoveryCodes ?? []));

    const second = await signInStaff(db, OWNER, meta, tick(60_000));
    if (!second.ok) throw new Error(second.error);
    keep(second.token);
    const s2 = (await validateSession(db, second.token, "staff", new Date(clock)))!;
    await challengeTotp(db, s2, "123456", meta, tick());
    const next = await generate({ secret: en.secret, epoch: Math.floor(clock / 1000) });
    keep(next);
    const ch = await challengeTotp(db, s2, next, meta, new Date(clock));
    expect(ch.ok).toBe(true);
    if (ch.ok) keep(ch.token);

    const third = await signInStaff(db, OWNER, meta, tick(60_000));
    if (!third.ok) throw new Error(third.error);
    const s3 = (await validateSession(db, third.token, "staff", new Date(clock)))!;
    const rc = await challengeTotp(db, s3, conf.recoveryCodes![0]!, meta, tick());
    expect(rc.ok).toBe(true);
  });

  it("none of the collected secrets appears in console or stdout/stderr output", () => {
    console.warn("hygiene-canary"); // proves the capture is live
    process.stderr.write("hygiene-canary-stream\n");
    vi.restoreAllMocks(); // stop capturing before asserting (and before the static checks spawn git)
    expect(captured.join("\n")).toContain("hygiene-canary");
    expect(captured.join("\n")).toContain("hygiene-canary-stream");
    expect(secrets.size).toBeGreaterThanOrEqual(15);
    const out = captured.join("\n");
    const leaked = [...secrets].filter((s) => out.includes(s));
    expect(leaked.map((s) => `${s.slice(0, 3)}… (${s.length} chars)`)).toEqual([]);
  });
});

describe("static hygiene", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  }

  it("no console.* call in auth code (src/modules/auth, src/app/api/auth, src/app/api/admin) outside tests", () => {
    const dirs = ["src/modules/auth", "src/app/api/auth", "src/app/api/admin"].map((d) => path.join(WEB, d));
    const offenders = dirs
      .flatMap(walk)
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
      .filter((f) => /\bconsole\s*\.\s*\w+\s*\(/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(WEB, f));
    expect(offenders).toEqual([]);
  });

  it(".env.local is gitignored and no configured secret value is tracked by git", () => {
    expect(() => execFileSync("git", ["check-ignore", "-q", ".env.local"], { cwd: WEB })).not.toThrow();
    const example = readFileSync(path.join(WEB, ".env.example"), "utf8");
    const keys = ["SESSION_SECRET", "GEMINI_API_KEY", "PAYMENT_WEBHOOK_SECRET", "SEED_OWNER_PASSWORD", "SEED_STAFF_PASSWORD"];
    const tracked: string[] = [];
    for (const key of keys) {
      const value = process.env[key];
      if (!value || value.length < 8 || example.includes(`${key}=${value}`)) continue;
      try {
        const hits = execFileSync("git", ["grep", "-l", "-F", "-e", value], { cwd: WEB, encoding: "utf8" });
        if (hits.trim()) tracked.push(`${key} in ${hits.trim().split("\n").join(", ")}`);
      } catch {
        // exit 1 = no match
      }
    }
    expect(tracked).toEqual([]);
  });
});
