import { afterEach, describe, expect, it, vi } from "vitest";
import { stubWarn, stubWarnings } from "./stub";

describe("stubWarn", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("warns once per name per process", () => {
    vi.stubEnv("STUB_WARN", "1");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubWarn("test.once");
    stubWarn("test.once");
    stubWarn("test.other");
    expect(warn).toHaveBeenCalledTimes(2);
    expect(stubWarnings()).toEqual(expect.arrayContaining(["test.once", "test.other"]));
  });
});
