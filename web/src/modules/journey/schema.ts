import { sql } from "drizzle-orm";
import { check, date, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, localeEnum, tstz, updatedAt } from "../../db/columns";
import { consentRecords, customers } from "../engagement/schema";

/**
 * The Journey (FR-JRN-*). The concept itself is client-owned and still open (BACKLOG) — these tables hold the
 * provider-neutral record: an anonymous session, its result, and anonymous aggregates.
 */
export const journeySessions = pgTable(
  "journey_sessions",
  {
    id: id(),
    sessionToken: text().notNull().unique("journey_sessions_session_token_unique"),
    locale: localeEnum().notNull().default("ar"),
    startedAt: createdAt(),
    lastActivityAt: tstz().notNull().defaultNow(),
    linkedCustomerId: uuid().references(() => customers.id, { onDelete: "set null" }),
  },
  (t) => [index("journey_sessions_activity_idx").on(t.lastActivityAt)],
);

/**
 * §5.2 JourneyResult. choices and trait_scores are personal data. customer_id may be set only together with a
 * consent record (`journey_results_consent_ck`).
 */
export const journeyResults = pgTable(
  "journey_results",
  {
    id: id(),
    customerId: uuid().references(() => customers.id, { onDelete: "cascade" }),
    sessionToken: text().notNull(),
    choices: jsonb().notNull(),
    traitScores: jsonb().notNull(),
    resultKey: text().notNull(),
    consentRecordId: uuid().references(() => consentRecords.id, { onDelete: "restrict" }),
    completedAt: tstz().notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("journey_results_session_idx").on(t.sessionToken),
    index("journey_results_customer_idx").on(t.customerId),
    check("journey_results_consent_ck", sql`${t.customerId} is null or ${t.consentRecordId} is not null`),
  ],
);

/** Anonymous counts per result per business day (kept after individual results expire). */
export const journeyAggregates = pgTable(
  "journey_aggregates",
  {
    id: id(),
    day: date().notNull(),
    resultKey: text().notNull(),
    completions: integer().notNull().default(0),
    identified: integer().notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("journey_aggregates_day_result_uq").on(t.day, t.resultKey)],
);
