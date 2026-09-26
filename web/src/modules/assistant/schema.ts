import { sql } from "drizzle-orm";
import { date, foreignKey, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, localeEnum, tstz, tsvector, updatedAt } from "../../db/columns";
import { staffUsers } from "../auth/schema";
import { customers } from "../engagement/schema";

/**
 * Retrieval corpus for the AI assistant (FR-AI-*): chunks of products, FAQ, policies and static pages per locale.
 * `search` should be filled with `to_tsvector('simple', catalog_search_normalize(chunk))` (020-catalog-fts.sql)
 * by the assistant module's indexer; query it the same way as the catalogue.
 */
export const assistantDocuments = pgTable(
  "assistant_documents",
  {
    id: id(),
    sourceType: text().notNull(), // "product" | "faq" | "policy" | "page" | "delivery"
    sourceId: uuid(),
    locale: localeEnum().notNull(),
    title: text(),
    chunk: text().notNull(),
    chunkIndex: integer().notNull().default(0),
    search: tsvector(),
    refreshedAt: tstz().notNull().defaultNow(),
  },
  (t) => [
    index("assistant_documents_source_idx").on(t.sourceType, t.sourceId),
    index("assistant_documents_search_gin").using("gin", t.search),
  ],
);

export const assistantConversations = pgTable(
  "assistant_conversations",
  {
    id: id(),
    sessionToken: text().notNull(),
    customerId: uuid().references(() => customers.id, { onDelete: "set null" }),
    locale: localeEnum().notNull().default("ar"),
    startedAt: createdAt(),
    lastMessageAt: tstz().notNull().defaultNow(),
  },
  (t) => [index("assistant_conversations_session_idx").on(t.sessionToken)],
);

export const assistantRoleEnum = pgEnum("assistant_message_role", ["user", "assistant", "system", "tool"]);

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: id(),
    conversationId: uuid().notNull(), // FK below with a short name (auto name > 63 chars churns drizzle-kit push)
    role: assistantRoleEnum().notNull(),
    content: text().notNull(),
    citations: jsonb(), // [{ sourceType, sourceId }]
    tokensIn: integer(),
    tokensOut: integer(),
    createdAt: createdAt(),
  },
  (t) => [
    index("assistant_messages_conversation_idx").on(t.conversationId, t.createdAt),
    foreignKey({ name: "assistant_messages_conversation_fk", columns: [t.conversationId], foreignColumns: [assistantConversations.id] }).onDelete("cascade"),
  ],
);

/** Daily usage roll-up for the spend cap (FR-AI-*). Cost estimate in USD micros (the provider bills in USD). */
export const assistantUsage = pgTable(
  "assistant_usage",
  {
    id: id(),
    day: date().notNull(),
    model: text().notNull(),
    requests: integer().notNull().default(0),
    tokensIn: integer().notNull().default(0),
    tokensOut: integer().notNull().default(0),
    costEstimateMicros: integer().notNull().default(0), // USD × 1e6
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("assistant_usage_day_model_uq").on(t.day, t.model)],
);

export const escalationStatusEnum = pgEnum("assistant_escalation_status", ["open", "handled", "dismissed"]);

/** Hand-off to a human (FR-AI-*): contact captured, reason, conversation link. */
export const assistantEscalations = pgTable(
  "assistant_escalations",
  {
    id: id(),
    conversationId: uuid(), // FK below (short name)
    customerId: uuid().references(() => customers.id, { onDelete: "set null" }),
    contact: text(),
    reason: text().notNull(),
    status: escalationStatusEnum().notNull().default("open"),
    handledById: uuid().references(() => staffUsers.id, { onDelete: "set null" }),
    handledAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    index("assistant_escalations_open_idx").on(t.createdAt).where(sql`${t.status} = 'open'`),
    foreignKey({ name: "assistant_escalations_conversation_fk", columns: [t.conversationId], foreignColumns: [assistantConversations.id] }).onDelete("set null"),
  ],
);
