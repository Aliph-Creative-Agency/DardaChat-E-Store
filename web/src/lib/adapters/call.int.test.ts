import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createTestDb } from "../../db/test-utils";
import { deadLetters } from "../../modules/core/schema";
import { setFault } from "../faults";
import { getServiceHealth } from "../health";
import { callExternal } from "./call";

const { db, close } = createTestDb();
const ctx = { db };

afterAll(async () => {
  await setFault("payments", null, ctx);
  await close();
});

const status = async () => (await getServiceHealth(ctx)).find((s) => s.service === "payments")?.status;

describe("callExternal against the test DB", () => {
  it("down fault → one dead letter with 4 attempts and service degraded; later success → up", async () => {
    await setFault("payments", "down", ctx);
    await expect(
      callExternal({
        service: "payments",
        operation: "initiate",
        fn: async () => "never",
        sleep: async () => {},
        deadLetter: { reference: "order-dl-1", payload: { orderId: "order-dl-1" } },
        ctx,
      }),
    ).rejects.toMatchObject({ code: "unavailable" });

    const rows = await db
      .select()
      .from(deadLetters)
      .where(and(eq(deadLetters.source, "payments.initiate"), eq(deadLetters.reference, "order-dl-1")));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.attempts).toBe(4);
    expect(rows[0]?.payload).toEqual({ orderId: "order-dl-1" });
    expect(await status()).toBe("degraded");

    await setFault("payments", null, ctx);
    await expect(callExternal({ service: "payments", operation: "initiate", fn: async () => "ok", ctx })).resolves.toBe("ok");
    expect(await status()).toBe("up");
  });
});
