import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "../db/test-utils";
import { listBusinessEvents, recordBusinessEvent } from "./events";
import { clearFaultCache, getFault, getFaults, setFault } from "./faults";
import { getServiceHealth, isServiceAvailable, reportDegradation, reportRecovery } from "./health";

const { db, close } = createTestDb();
const ctx = { db };

afterAll(close);

describe("business events", () => {
  it("round-trips, newest first, with filters", async () => {
    await recordBusinessEvent({ type: "test.first", aggregateType: "test", aggregateId: "agg-1", payload: { n: 1 } }, ctx);
    await recordBusinessEvent({ type: "test.second", aggregateType: "test", aggregateId: "agg-1" }, ctx);
    const rows = await listBusinessEvents({ aggregateType: "test", aggregateId: "agg-1" }, ctx);
    expect(rows.map((r) => r.type)).toEqual(["test.second", "test.first"]);
    expect(rows[1]?.payload).toEqual({ n: 1 });
    expect(await listBusinessEvents({ aggregateId: "agg-1", type: "test.first" }, ctx)).toHaveLength(1);
  });

  it("joins the caller's transaction (rolled back → gone)", async () => {
    await expect(
      db.transaction(async (tx) => {
        await recordBusinessEvent({ type: "test.rolled_back", aggregateType: "test", aggregateId: "agg-rb" }, { db: tx });
        expect(await listBusinessEvents({ aggregateId: "agg-rb" }, { db: tx })).toHaveLength(1);
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(await listBusinessEvents({ aggregateId: "agg-rb" }, ctx)).toHaveLength(0);
  });

  it("rejects malformed event types", async () => {
    await expect(recordBusinessEvent({ type: "Bad", aggregateType: "t", aggregateId: "x" }, ctx)).rejects.toThrow();
  });
});

describe("service health", () => {
  it("degradation → recovery records exactly 2 events and health reflects each step", async () => {
    const events = () => listBusinessEvents({ aggregateType: "service", aggregateId: "analytics" }, ctx);
    const status = async () => (await getServiceHealth(ctx)).find((s) => s.service === "analytics")?.status;
    const before = (await events()).length;

    expect(await status()).toBe("up");
    expect(await reportDegradation("analytics", new Error("timeout"), "degraded", ctx)).toBe(true);
    expect(await reportDegradation("analytics", new Error("timeout again"), "degraded", ctx)).toBe(false);
    expect(await status()).toBe("degraded");
    expect(await isServiceAvailable("analytics", ctx)).toBe(true);
    expect(await reportRecovery("analytics", ctx)).toBe(true);
    expect(await reportRecovery("analytics", ctx)).toBe(false);
    expect(await status()).toBe("up");

    const after = await events();
    expect(after.length - before).toBe(2);
    expect(after.slice(0, 2).map((e) => e.type)).toEqual(["service.recovered", "service.degraded"]);
  });

  it("lists every service and reports down as unavailable", async () => {
    const all = await getServiceHealth(ctx);
    expect(all.map((s) => s.service)).toContain("payments");
    expect(all).toHaveLength(8);
    await reportDegradation("einvoice", "boom", "down", ctx);
    expect(await isServiceAvailable("einvoice", ctx)).toBe(false);
    await reportRecovery("einvoice", ctx);
  });
});

describe("fault injection", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    await setFault("sms", null, ctx);
    await setFault("llm", null, ctx);
  });

  it("reads faults from settings and clears them", async () => {
    await setFault("sms", "down", ctx);
    expect(await getFault("sms", ctx)).toBe("down");
    expect(await getFault("email", ctx)).toBeNull();
    await setFault("sms", null, ctx);
    expect(await getFault("sms", ctx)).toBeNull();
  });

  it("env FAULTS beats settings", async () => {
    await setFault("llm", "flaky", ctx);
    vi.stubEnv("FAULTS", "llm:slow, whatsapp:down, bogus:down, sms:nonsense");
    clearFaultCache();
    expect(await getFault("llm", ctx)).toBe("slow");
    expect(await getFault("whatsapp", ctx)).toBe("down");
    expect(await getFaults(ctx)).toEqual({ llm: "slow", whatsapp: "down" });
  });
});
