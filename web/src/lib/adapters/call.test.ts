import { beforeEach, describe, expect, it, vi } from "vitest";

const faultState = vi.hoisted(() => ({ mode: null as null | "down" | "slow" | "flaky" }));
vi.mock("../faults", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../faults")>();
  return { ...actual, getFault: vi.fn(async () => faultState.mode) };
});
vi.mock("../health", () => ({
  reportDegradation: vi.fn(async () => true),
  reportRecovery: vi.fn(async () => false),
}));

import { isAppError } from "../errors";
import { reportDegradation, reportRecovery } from "../health";
import { backoffDelay, callExternal } from "./call";
import { PermanentError, TransientError } from "./errors";

describe("callExternal", () => {
  beforeEach(() => {
    faultState.mode = null;
    vi.mocked(reportDegradation).mockClear();
    vi.mocked(reportRecovery).mockClear();
  });

  it("returns the result and reports recovery", async () => {
    await expect(callExternal({ service: "sms", operation: "send", fn: async () => 42 })).resolves.toBe(42);
    expect(reportRecovery).toHaveBeenCalledWith("sms", undefined);
  });

  it("backs off 200/400/800 ms for 3 retries, then throws unavailable", async () => {
    const delays: number[] = [];
    const fn = vi.fn(async () => {
      throw new TransientError("503");
    });
    const error = await callExternal({
      service: "sms",
      operation: "send",
      fn,
      sleep: async (ms) => void delays.push(ms),
      random: () => 0,
    }).catch((e: unknown) => e);
    expect(delays).toEqual([200, 400, 800]);
    expect(fn).toHaveBeenCalledTimes(4);
    expect(isAppError(error, "unavailable")).toBe(true);
    expect((error as { details: { attempts: number } }).details.attempts).toBe(4);
    expect(reportDegradation).toHaveBeenCalledOnce();
  });

  it("caps the delay and adds at most 10% jitter", () => {
    expect(backoffDelay(10, 200, 5000, () => 0)).toBe(5000);
    expect(backoffDelay(0, 200, 5000, () => 0.999)).toBe(219);
  });

  it("stops at once on a permanent error and does not degrade the service", async () => {
    const fn = vi.fn(async () => {
      throw new PermanentError("invalid number");
    });
    const sleep = vi.fn(async () => {});
    const error = await callExternal({ service: "sms", operation: "send", fn, sleep }).catch((e: unknown) => e);
    expect(fn).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
    expect((error as { details: { permanent: boolean } }).details.permanent).toBe(true);
    expect(reportDegradation).not.toHaveBeenCalled();
  });

  it("slow fault rejects within timeoutMs + 50 ms", async () => {
    faultState.mode = "slow";
    const started = Date.now();
    await expect(
      callExternal({ service: "llm", operation: "generate", fn: async () => "never", timeoutMs: 100, retries: 0 }),
    ).rejects.toThrow(/timed out|injected/);
    expect(Date.now() - started).toBeLessThan(150);
  });

  it("flaky fault fails the first attempt only", async () => {
    faultState.mode = "flaky";
    const fn = vi.fn(async () => "ok");
    await expect(callExternal({ service: "email", operation: "send", fn, sleep: async () => {} })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("times out a hanging call", async () => {
    const fn = () => new Promise<string>(() => {});
    await expect(callExternal({ service: "email", operation: "send", fn, timeoutMs: 30, retries: 0 })).rejects.toThrow(
      /timed out after 30 ms/,
    );
  });
});
