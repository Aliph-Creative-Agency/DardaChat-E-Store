/**
 * Export manifest of every module contract (`src/modules/<m>/index.ts`). Phase 1 teams must keep this passing:
 * removing or renaming a listed export is a contract change (CHANGE-REQUESTS.md + CONTRACTS.md + this file in the
 * same commit). Adding exports is fine; list them here too so they are pinned.
 * `fn` = must be a function, `value` = must be defined (constants, objects, classes checked as functions anyway).
 */
import { describe, expect, it } from "vitest";

type Manifest = Record<string, { fn?: string[]; value?: string[] }>;

const MANIFEST: Manifest = {
  core: {
    fn: [
      "sendMessage",
      "dispatchDueMessages",
      "nextAttemptDelayMs",
      "getSetting",
      "setSetting",
      "deleteSetting",
      "reportDegradation",
      "reportRecovery",
      "getServiceHealth",
      "isServiceAvailable",
      "getFault",
      "setFault",
      "callExternal",
      "mediaUrl",
      "newStorageKey",
      "isValidStorageKey",
      "AppError",
      "NotImplementedError",
      "isAppError",
      "PermanentError",
      "TransientError",
      "TimeoutError",
      "dbOf",
      "nowOf",
      "actorOf",
      "stubWarn",
    ],
    value: ["storage", "SERVICES", "FAULT_MODES", "httpStatus", "systemActor"],
  },
  insights: { fn: ["recordBusinessEvent", "listBusinessEvents"] },
  assistant: {},
  journey: {},
  storefront: {},
};

const loaders: Record<string, () => Promise<Record<string, unknown>>> = {
  core: () => import("./core"),
  insights: () => import("./insights"),
  assistant: () => import("./assistant"),
  journey: () => import("./journey"),
  storefront: () => import("./storefront"),
};

describe("module contract manifest", () => {
  it("has a loader for every module in the manifest", () => {
    expect(Object.keys(loaders).sort()).toEqual(Object.keys(MANIFEST).sort());
  });

  for (const [module, spec] of Object.entries(MANIFEST)) {
    it(`@/modules/${module} exports its contract`, async () => {
      const mod = await loaders[module]!();
      for (const name of spec.fn ?? []) {
        expect(typeof mod[name], `${module}.${name} should be a function`).toBe("function");
      }
      for (const name of spec.value ?? []) {
        expect(mod[name], `${module}.${name} should be exported`).toBeDefined();
      }
    });
  }

  it("storage exposes put/get/delete/exists", async () => {
    const { storage } = await import("./core");
    for (const m of ["put", "get", "delete", "exists"] as const) expect(typeof storage[m]).toBe("function");
  });
});
