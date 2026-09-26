import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz, updatedAt } from "../../db/columns";
import { staffUsers } from "../auth/schema";
import { customers } from "../engagement/schema";

export const dataRequestKindEnum = pgEnum("insights_data_request_kind", ["export", "delete"]);
export const dataRequestStatusEnum = pgEnum("insights_data_request_status", [
  "received",
  "verified",
  "in_progress",
  "completed",
  "rejected",
]);

/** Subject-access / erasure requests (FR-DAT-001..010). Deletion runs through the erasure routine (withErasure). */
export const dataRequests = pgTable(
  "data_requests",
  {
    id: id(),
    kind: dataRequestKindEnum().notNull(),
    status: dataRequestStatusEnum().notNull().default("received"),
    customerId: uuid().references(() => customers.id, { onDelete: "set null" }),
    contact: text(), // how the requester reached us, when not a signed-in customer
    requestedAt: tstz().notNull().defaultNow(),
    verifiedAt: tstz(),
    completedAt: tstz(),
    manualCheckNote: text(), // records the manual identity / legal-hold check
    handledById: uuid().references(() => staffUsers.id, { onDelete: "set null" }),
    exportStorageKey: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("data_requests_status_idx").on(t.status, t.requestedAt)],
);

/**
 * Retention per data category (FR-DAT-*, §5.3). Category keys e.g. "journey_results" (60 months),
 * "journey_anonymous" (90 days), "carts_anonymous", "sessions", "assistant_conversations".
 */
export const retentionSettings = pgTable(
  "retention_settings",
  {
    id: id(),
    category: text().notNull().unique(),
    months: integer(),
    days: integer(),
    note: text(),
    updatedAt: updatedAt(),
  },
  (t) => [check("retention_settings_period_ck", sql`${t.months} is not null or ${t.days} is not null`)],
);
