import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createTestDb } from "../db/test-utils";
import { deleteSetting, getSetting, setSetting } from "./settings";

const { db, close } = createTestDb();
const ctx = { db };

describe("settings", () => {
  beforeAll(async () => {
    await deleteSetting("test.ttl", ctx);
    await deleteSetting("test.bad", ctx);
  });
  afterAll(close);

  it("round-trips a value and upserts", async () => {
    await setSetting("test.ttl", 30, ctx);
    expect(await getSetting("test.ttl", z.number(), 15, ctx)).toBe(30);
    await setSetting("test.ttl", 45, ctx);
    expect(await getSetting("test.ttl", z.number(), 15, ctx)).toBe(45);
  });

  it("returns the fallback when missing", async () => {
    expect(await getSetting("test.missing", z.number(), 15, ctx)).toBe(15);
  });

  it("returns the fallback and warns when the stored value is invalid", async () => {
    await setSetting("test.bad", "not a number", ctx);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await getSetting("test.bad", z.number(), 15, ctx)).toBe(15);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
