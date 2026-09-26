import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz } from "../../db/columns";

export { localeEnum } from "../../db/columns";

/** Key/value runtime settings (reservation TTL, COD max, feature toggles…). */
export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: tstz().notNull().defaultNow(),
});

export const actorTypeEnum = pgEnum("core_actor_type", ["staff", "customer", "system"]);

/**
 * Audit log (FR-ACC-011) and mutable-row journal (FR-DAT-006, written by DB triggers with action `row.update`).
 * Append-only: UPDATE/DELETE refused by 010-append-only.sql (erasure escape only).
 */
export const auditEntries = pgTable(
  "audit_entries",
  {
    id: id(),
    actorType: actorTypeEnum().notNull().default("system"),
    actorId: uuid(), // staff_users.id / customers.id; null for system
    action: text().notNull(), // e.g. "product.update", "user.suspend", "row.update"
    targetType: text().notNull(), // table or aggregate name
    targetId: text(),
    before: jsonb(),
    after: jsonb(),
    ip: text(),
    occurredAt: createdAt(),
  },
  (t) => [
    index("audit_entries_target_idx").on(t.targetType, t.targetId),
    index("audit_entries_actor_idx").on(t.actorType, t.actorId),
    index("audit_entries_occurred_idx").on(t.occurredAt),
  ],
);

/** Domain events for in-process subscribers / reports (e.g. order.placed). Processed by the job runner. */
export const businessEvents = pgTable(
  "business_events",
  {
    id: id(),
    type: text().notNull(),
    aggregateType: text().notNull(),
    aggregateId: text().notNull(),
    payload: jsonb().notNull().default(sql`'{}'::jsonb`),
    occurredAt: createdAt(),
    processedAt: tstz(),
  },
  (t) => [
    index("business_events_type_idx").on(t.type, t.occurredAt),
    index("business_events_unprocessed_idx").on(t.occurredAt).where(sql`${t.processedAt} is null`),
  ],
);

/** Work that exhausted its retries (CI-003): adapter calls, jobs, outbound messages. */
export const deadLetters = pgTable(
  "dead_letters",
  {
    id: id(),
    source: text().notNull(), // adapter or job name
    reference: text(), // e.g. message id, order id
    payload: jsonb().notNull().default(sql`'{}'::jsonb`),
    error: text().notNull(),
    attempts: integer().notNull().default(0),
    createdAt: createdAt(),
    resolvedAt: tstz(),
    resolvedBy: uuid(),
  },
  (t) => [index("dead_letters_open_idx").on(t.source, t.createdAt).where(sql`${t.resolvedAt} is null`)],
);

/** Single-runner locks for scheduled jobs (no double execution across processes). */
export const jobLocks = pgTable("job_locks", {
  name: text().primaryKey(),
  lockedUntil: tstz(),
  lockedBy: text(),
  lastRunAt: tstz(),
  lastStatus: text(), // "ok" | "error"
  lastError: text(),
});

export const serviceStatusEnum = pgEnum("core_service_status", ["up", "degraded", "down"]);

/** Degradation registry (CI-004): last known state of each external dependency. */
export const serviceHealth = pgTable("service_health", {
  service: text().primaryKey(), // "payments", "whatsapp", "sms", "email", "llm", "einvoice", "storage"
  status: serviceStatusEnum().notNull().default("up"),
  since: tstz().notNull().defaultNow(),
  lastCheckedAt: tstz().notNull().defaultNow(),
  lastError: text(),
});
