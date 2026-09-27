import { describe, expect, it } from "vitest";
import { APP_ERROR_CODES, AppError, NotImplementedError, httpStatus, isAppError } from "./errors";

describe("AppError", () => {
  it("carries code, details and http status", () => {
    const e = new AppError("insufficient_stock", "only 1 left", { variantId: "v1", available: 1 });
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("insufficient_stock");
    expect(e.details).toEqual({ variantId: "v1", available: 1 });
    expect(e.httpStatus).toBe(409);
  });

  it("maps every code to an http status", () => {
    for (const code of APP_ERROR_CODES) expect(httpStatus[code]).toBeGreaterThanOrEqual(400);
  });

  it("NotImplementedError is an AppError(not_implemented)", () => {
    const e = new NotImplementedError("payments.refund");
    expect(isAppError(e)).toBe(true);
    expect(isAppError(e, "not_implemented")).toBe(true);
    expect(isAppError(e, "conflict")).toBe(false);
    expect(e.httpStatus).toBe(501);
  });

  it("isAppError rejects plain errors", () => {
    expect(isAppError(new Error("x"))).toBe(false);
    expect(isAppError("x")).toBe(false);
  });
});
