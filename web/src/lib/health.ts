/**
 * Degradation registry (CI-004): last known state of each external service in `service_health`. Adapters call
 * `reportDegradation` when a call finally fails and `reportRecovery` when one succeeds; a business event
 * `service.degraded` / `service.recovered` is recorded only when the state actually changes.
 */
import { sql } from "drizzle-orm";
import { serviceHealth } from "../modules/core/schema";
import { dbOf, nowOf, type ServiceContext } from "./context";
import { recordBusinessEvent } from "./events";

export const SERVICES = ["payments", "einvoice", "whatsapp", "sms", "email", "llm", "storage", "analytics"] as const;
export type ServiceName = (typeof SERVICES)[number];
export type ServiceStatus = "up" | "degraded" | "down";

export interface ServiceHealth {
  service: ServiceName;
  status: ServiceStatus;
  since: Date | null;
  lastCheckedAt: Date | null;
  lastError: string | null;
}

export function isServiceName(value: string): value is ServiceName {
  return (SERVICES as readonly string[]).includes(value);
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : JSON.stringify(error);
}

async function currentStatus(service: ServiceName, ctx?: ServiceContext): Promise<ServiceStatus> {
  const rows = await dbOf(ctx).execute<{ status: ServiceStatus }>(
    sql`select status from service_health where service = ${service}`,
  );
  return rows[0]?.status ?? "up";
}

async function setStatus(
  service: ServiceName,
  status: ServiceStatus,
  lastError: string | null,
  ctx?: ServiceContext,
): Promise<boolean> {
  const previous = await currentStatus(service, ctx);
  const now = nowOf(ctx);
  const changed = previous !== status;
  await dbOf(ctx)
    .insert(serviceHealth)
    .values({ service, status, since: now, lastCheckedAt: now, lastError })
    .onConflictDoUpdate({
      target: serviceHealth.service,
      set: changed ? { status, since: now, lastCheckedAt: now, lastError } : { lastCheckedAt: now, lastError },
    });
  if (changed) {
    await recordBusinessEvent(
      {
        type: status === "up" ? "service.recovered" : "service.degraded",
        aggregateType: "service",
        aggregateId: service,
        payload: { from: previous, to: status, ...(lastError ? { error: lastError } : {}) },
      },
      ctx,
    );
  }
  return changed;
}

/** Mark a service degraded/down. Returns true when this changed the state. */
export function reportDegradation(
  service: ServiceName,
  error: unknown,
  status: "degraded" | "down" = "degraded",
  ctx?: ServiceContext,
): Promise<boolean> {
  return setStatus(service, status, errorText(error).slice(0, 2000), ctx);
}

/** Mark a service up again. Cheap no-op write when it already was up. Returns true when the state changed. */
export async function reportRecovery(service: ServiceName, ctx?: ServiceContext): Promise<boolean> {
  if ((await currentStatus(service, ctx)) === "up") return false;
  return setStatus(service, "up", null, ctx);
}

/** Every known service (missing rows = up). */
export async function getServiceHealth(ctx?: ServiceContext): Promise<ServiceHealth[]> {
  const rows = await dbOf(ctx).select().from(serviceHealth);
  const byName = new Map(rows.map((r) => [r.service, r]));
  return SERVICES.map((service) => {
    const r = byName.get(service);
    return {
      service,
      status: (r?.status ?? "up") as ServiceStatus,
      since: r?.since ?? null,
      lastCheckedAt: r?.lastCheckedAt ?? null,
      lastError: r?.lastError ?? null,
    };
  });
}

/** False only when the service is recorded `down` (degraded services are still tried). */
export async function isServiceAvailable(service: ServiceName, ctx?: ServiceContext): Promise<boolean> {
  return (await currentStatus(service, ctx)) !== "down";
}
