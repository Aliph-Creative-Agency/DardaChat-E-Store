/**
 * Fault injection for QA (CI-004 "disable each service in turn"). Source of truth per service:
 * env `FAULTS=whatsapp:down,llm:slow` (wins) → settings key `dev.faults` = `{ "<service>": "down"|"slow"|"flaky" }`
 * (toggled at /dev/services). Every mock adapter honours it through `callExternal()`.
 */
import { z } from "zod";
import type { ServiceContext } from "./context";
import { isServiceName, type ServiceName } from "./health";
import { getSetting, setSetting } from "./settings";

export const FAULT_MODES = ["down", "slow", "flaky"] as const;
export type FaultMode = (typeof FAULT_MODES)[number];
export const FAULTS_SETTING = "dev.faults";

const faultMapSchema = z.record(z.string(), z.enum(FAULT_MODES));
type FaultMap = Partial<Record<ServiceName, FaultMode>>;

const CACHE_MS = 2000;
let cache: { at: number; value: FaultMap } | null = null;

export function clearFaultCache(): void {
  cache = null;
}

export function parseFaultsEnv(raw: string | undefined): FaultMap {
  const out: FaultMap = {};
  for (const part of (raw ?? "").split(",")) {
    const [name, mode] = part.split(":").map((s) => s.trim());
    if (name && mode && isServiceName(name) && (FAULT_MODES as readonly string[]).includes(mode)) {
      out[name] = mode as FaultMode;
    }
  }
  return out;
}

async function settingsFaults(ctx?: ServiceContext): Promise<FaultMap> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = (await getSetting(FAULTS_SETTING, faultMapSchema, {}, ctx)) as FaultMap;
  cache = { at: Date.now(), value };
  return value;
}

/** All active faults (env entries override settings entries per service). */
export async function getFaults(ctx?: ServiceContext): Promise<FaultMap> {
  return { ...(await settingsFaults(ctx)), ...parseFaultsEnv(process.env.FAULTS) };
}

export async function getFault(service: ServiceName, ctx?: ServiceContext): Promise<FaultMode | null> {
  const env = parseFaultsEnv(process.env.FAULTS)[service];
  if (env) return env;
  return (await settingsFaults(ctx))[service] ?? null;
}

/** Persist a fault in settings (`null` clears it). Env FAULTS still wins. */
export async function setFault(service: ServiceName, mode: FaultMode | null, ctx?: ServiceContext): Promise<void> {
  clearFaultCache();
  const current = (await getSetting(FAULTS_SETTING, faultMapSchema, {}, ctx)) as FaultMap;
  const next: FaultMap = { ...current };
  if (mode) next[service] = mode;
  else delete next[service];
  await setSetting(FAULTS_SETTING, next, ctx);
  clearFaultCache();
}

export class InjectedFaultError extends Error {
  constructor(
    readonly service: ServiceName,
    readonly mode: FaultMode,
  ) {
    super(`injected fault: ${service} ${mode}`);
    this.name = "InjectedFaultError";
  }
}

/**
 * Apply `mode` before a real/mock call. `down` throws; `flaky` throws on the first attempt only; `slow` waits until
 * `signal` aborts (the caller's timeout), then throws.
 */
export async function applyFault(
  service: ServiceName,
  mode: FaultMode | null,
  opts: { attempt: number; signal: AbortSignal },
): Promise<void> {
  if (!mode) return;
  if (mode === "down" || (mode === "flaky" && opts.attempt === 0)) throw new InjectedFaultError(service, mode);
  if (mode === "slow") {
    await new Promise<void>((resolve) => {
      if (opts.signal.aborted) return resolve();
      opts.signal.addEventListener("abort", () => resolve(), { once: true });
    });
    throw new InjectedFaultError(service, mode);
  }
}
