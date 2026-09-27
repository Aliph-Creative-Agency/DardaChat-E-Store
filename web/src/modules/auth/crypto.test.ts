import { hash } from "@node-rs/argon2";
import { beforeAll, describe, expect, it } from "vitest";
import { getSessionSecret, SESSION_SECRET_PLACEHOLDER } from "./config";
import {
  decryptSecret,
  encryptSecret,
  generateOtpCode,
  hashOtp,
  hashPassword,
  hashToken,
  needsRehash,
  randomToken,
  safeEqual,
  verifyPassword,
} from "./crypto";

beforeAll(() => {
  process.env.SESSION_SECRET ??= "unit-test-secret-unit-test-secret-0123456789";
});

describe("config", () => {
  it("rejects short secrets", () => {
    expect(() => getSessionSecret({ SESSION_SECRET: "short" })).toThrow(/32/);
  });
  it("refuses the placeholder in production only", () => {
    const env = { SESSION_SECRET: SESSION_SECRET_PLACEHOLDER };
    expect(getSessionSecret(env)).toBe(SESSION_SECRET_PLACEHOLDER);
    expect(() => getSessionSecret({ ...env, NODE_ENV: "production" })).toThrow(/placeholder/);
  });
});

describe("tokens", () => {
  it("are 43-char base64url and unique", () => {
    const set = new Set(Array.from({ length: 200 }, randomToken));
    expect(set.size).toBe(200);
    for (const t of set) expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it("hash is sha-256 hex and deterministic", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("safeEqual", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("otp codes", () => {
  it("are 6 digits", () => {
    for (let i = 0; i < 100; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });
  it("hash is bound to the target", () => {
    expect(hashOtp("123456", "phone:+970591234567:login")).toBe(hashOtp("123456", "phone:+970591234567:login"));
    expect(hashOtp("123456", "phone:+970591234567:login")).not.toBe(hashOtp("123456", "phone:+970591234568:login"));
    expect(hashOtp("123456", "x")).not.toContain("123456");
  });
});

describe("secret sealing (AES-256-GCM)", () => {
  it("round trips", () => {
    const sealed = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(sealed).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(sealed)).toBe("JBSWY3DPEHPK3PXP");
  });
  it("uses a fresh IV each time", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });
  it("detects tampering", () => {
    const [v, iv, tag, ct] = encryptSecret("JBSWY3DPEHPK3PXP").split(".");
    const flipped = Buffer.from(ct!, "base64url");
    flipped[0] = flipped[0]! ^ 1;
    expect(() => decryptSecret([v, iv, tag, flipped.toString("base64url")].join("."))).toThrow();
    expect(() => decryptSecret("garbage")).toThrow();
  });
});

describe("passwords (argon2id)", () => {
  it("hash is argon2id with OWASP params and verifies", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verifyPassword(h, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
    expect(needsRehash(h)).toBe(false);
  });
  it("garbage hash verifies false instead of throwing", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
  it("weaker hashes need a rehash", async () => {
    const weak = await hash("pw", { memoryCost: 8192, timeCost: 1, parallelism: 1 });
    expect(needsRehash(weak)).toBe(true);
    expect(needsRehash("$2b$10$abcdefghijklmnopqrstuv")).toBe(true);
  });
});
