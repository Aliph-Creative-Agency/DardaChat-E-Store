import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { jobLocks } from "../../db/schema";
import { createTestDb } from "../../db/test-utils";
import { allJobs } from "./registry";
import { createScheduler } from "./scheduler";
import type { JobDefinition } from "./types";

const a = createTestDb(3);
const b = createTestDb(3);
const quiet = () => {};
const unique = (label: string) => `test.${label}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;

afterAll(async () => {
  await a.close();
  await b.close();
});

async function lockRow(name: string) {
  const rows = await a.db.select().from(jobLocks).where(sql`${jobLocks.name} = ${name}`);
  return rows[0];
}

describe("job scheduler", () => {
  it("two schedulers on the same DB run a 60 s job exactly once in one tick window", async () => {
    let runs = 0;
    const job: JobDefinition = {
      name: unique("once"),
      intervalMs: 60_000,
      run: async () => {
        runs++;
        await new Promise((r) => setTimeout(r, 20));
      },
    };
    const s1 = createScheduler([job], { db: a.db, owner: "s1", log: quiet });
    const s2 = createScheduler([job], { db: b.db, owner: "s2", log: quiet });
    await Promise.all([s1.tick(), s2.tick()]);
    await Promise.all([s1.tick(), s2.tick()]);
    expect(runs).toBe(1);
    expect((await lockRow(job.name))?.lastStatus).toBe("ok");
  });

  it("a throwing job records error and the loop continues", async () => {
    const bad: JobDefinition = { name: unique("bad"), intervalMs: 1000, run: async () => Promise.reject(new Error("kaboom")) };
    const good = vi.fn(async () => {});
    const next: JobDefinition = { name: unique("next"), intervalMs: 1000, run: good };
    const results = await createScheduler([bad, next], { db: a.db, owner: "s3", log: quiet }).tick();
    expect(results.map((r) => r.status)).toEqual(["error", "ok"]);
    expect(good).toHaveBeenCalledOnce();
    const row = await lockRow(bad.name);
    expect(row?.lastStatus).toBe("error");
    expect(row?.lastError).toBe("kaboom");
    expect(row?.lockedUntil).toBeNull();
  });

  it("re-acquires an expired lease and respects a live one", async () => {
    const name = unique("lease");
    let runs = 0;
    const job: JobDefinition = { name, intervalMs: 1000, run: async () => void runs++ };
    await a.db.insert(jobLocks).values({ name, lockedBy: "ghost", lockedUntil: sql`now() + interval '1 hour'` });
    const s = createScheduler([job], { db: a.db, owner: "s4", log: quiet });
    await s.tick();
    expect(runs).toBe(0);
    await a.db.execute(sql`update job_locks set locked_until = now() - interval '1 minute' where name = ${name}`);
    await s.tick();
    expect(runs).toBe(1);
  });

  it("runOnce ignores the interval; timeouts are errors", async () => {
    const slow: JobDefinition = {
      name: unique("slow"),
      intervalMs: 3_600_000,
      timeoutMs: 50,
      run: () => new Promise(() => {}),
    };
    const s = createScheduler([slow], { db: a.db, owner: "s5", log: quiet });
    expect(await s.runOnce(slow.name)).toMatchObject({ ran: true, status: "error", error: "timed out after 50 ms" });
    expect(await s.runOnce(slow.name)).toMatchObject({ ran: true });
    await expect(s.runOnce("nope")).rejects.toThrow(/unknown job/);
  });

  it("registry holds core.outbox.dispatch", () => {
    expect(allJobs.map((j) => j.name)).toContain("core.outbox.dispatch");
  });
});
