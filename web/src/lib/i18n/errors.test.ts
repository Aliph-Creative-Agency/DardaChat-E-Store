import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES, errorCodeFromStatus, errorMessageKey, toErrorCode } from "./errors";

function common(locale: string) {
  return JSON.parse(readFileSync(join(process.cwd(), "messages", locale, "common.json"), "utf8")) as {
    errors: { codes: Record<string, string>; notFound: Record<string, string>; error: Record<string, string> };
  };
}

describe("error codes → messages", () => {
  it("every code has copy in ar and en with two parts (what happened + what to do)", () => {
    for (const locale of ["ar", "en"]) {
      const { codes } = common(locale).errors;
      expect(Object.keys(codes).sort()).toEqual([...ERROR_CODES].sort());
      for (const code of ERROR_CODES) {
        const sentences = (codes[code] ?? "").split(/[.!؟?]\s|،\s|, /).filter(Boolean);
        expect(sentences.length, `${locale} ${code}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("maps known, aliased and unknown codes", () => {
    expect(errorMessageKey("forbidden")).toBe("errors.codes.forbidden");
    expect(errorMessageKey("rate_limited")).toBe("errors.codes.rateLimited");
    expect(errorMessageKey("nope")).toBe("errors.codes.server");
    expect(errorMessageKey(undefined)).toBe("errors.codes.server");
    expect(toErrorCode(42)).toBe("server");
  });

  it("maps HTTP statuses", () => {
    expect(errorCodeFromStatus(0)).toBe("network");
    expect(errorCodeFromStatus(400)).toBe("validation");
    expect(errorCodeFromStatus(401)).toBe("unauthorized");
    expect(errorCodeFromStatus(403)).toBe("forbidden");
    expect(errorCodeFromStatus(404)).toBe("notFound");
    expect(errorCodeFromStatus(409)).toBe("conflict");
    expect(errorCodeFromStatus(429)).toBe("rateLimited");
    expect(errorCodeFromStatus(503)).toBe("unavailable");
    expect(errorCodeFromStatus(500)).toBe("server");
  });

  it("page copy exists for not-found and error pages", () => {
    for (const locale of ["ar", "en"]) {
      const { notFound, error } = common(locale).errors;
      expect(Object.keys(notFound).sort()).toEqual(["body", "home", "shop", "title"]);
      expect(Object.keys(error).sort()).toEqual(["body", "home", "reference", "retry", "title"]);
    }
  });
});
