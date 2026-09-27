import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkPassword, isBreachedPassword } from "./password-policy";

describe("bundled breached list", () => {
  it("has at least 1,000 lower-case entries", () => {
    const lines = readFileSync(path.join(process.cwd(), "src/modules/auth/data/common-passwords.txt"), "utf8")
      .split(/\r?\n/)
      .filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(1000);
    expect(lines.every((l) => l === l.toLowerCase())).toBe(true);
  });
});

describe("checkPassword", () => {
  it.each(["password", "123456", "Qwerty123", "Password123!", "iloveyou", "P@ssw0rd", "letmein2024"])(
    "refuses breached %s",
    (pw) => {
      expect(isBreachedPassword(pw)).toBe(true);
      expect(checkPassword(pw, { kind: "customer", minLength: 4 })).toContain("breached");
    },
  );

  it("refuses below the minimum", () => {
    expect(checkPassword("Xk9!mzq", { kind: "customer" })).toContain("too_short"); // 7 < 8
    expect(checkPassword("Xk9!mzqT4vb", { kind: "staff" })).toContain("too_short"); // 11 < 12
  });

  it("honours a configured minimum", () => {
    expect(checkPassword("olive-harbor-kite", { kind: "staff", minLength: 20 })).toEqual(["too_short"]);
    expect(checkPassword("olive-harbor-kite", { kind: "staff", minLength: 12 })).toEqual([]);
  });

  it("refuses over 256 chars", () => {
    expect(checkPassword("a-long-unusual-phrase-".repeat(20), { kind: "customer" })).toContain("too_long");
  });

  it("refuses passwords containing the identity", () => {
    expect(
      checkPassword("samira.haddad-2026-x", { kind: "staff", identity: ["samira.haddad@example.ps", "Samira Haddad"] }),
    ).toContain("contains_identity");
  });

  it("accepts a good passphrase", () => {
    expect(
      checkPassword("olive harbor kite seventeen", { kind: "staff", identity: ["owner@dardachat.local", "Owner"] }),
    ).toEqual([]);
    expect(checkPassword("zeitoun-balcony-7", { kind: "customer" })).toEqual([]);
  });
});
