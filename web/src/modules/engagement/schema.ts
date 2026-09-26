import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, localeEnum, tstz, updatedAt } from "../../db/columns";

// ---------------------------------------------------------------------------------------------------------------
// Customer records (FR-ACC-001/002/007, CON-04, CON-05, FR-DAT-*)
// ---------------------------------------------------------------------------------------------------------------

export const customerStatusEnum = pgEnum("engagement_customer_status", ["active", "disabled", "erased"]);

/**
 * A customer may have email+password, phone+OTP, or both (FR-ACC-001/002). Guest checkouts create a customer
 * with contact details and no password. Phone numbers are E.164 (CON-05). Journaled by 015-journal.sql.
 */
export const customers = pgTable(
  "customers",
  {
    id: id(),
    email: text(), // lower-cased by the application
    phoneE164: text(),
    passwordHash: text(), // Argon2id; null for OTP-only and guest customers
    name: text(),
    locale: localeEnum().notNull().default("ar"),
    status: customerStatusEnum().notNull().default("active"),
    isGuest: boolean().notNull().default(false),
    emailVerifiedAt: tstz(),
    phoneVerifiedAt: tstz(),
    /** FR-ACC-007: `{ orderUpdates: {whatsapp,sms,email}, marketing: … }` — consent itself lives in consent_records. */
    notificationPreferences: jsonb().notNull().default(sql`'{}'::jsonb`),
    lastLoginAt: tstz(),
    erasedAt: tstz(), // FR-DAT-008: PII overwritten, row kept for order history
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("customers_email_uq").on(sql`lower(${t.email})`),
    uniqueIndex("customers_phone_uq").on(t.phoneE164),
    check(
      "customers_contact_ck",
      sql`${t.email} is not null or ${t.phoneE164} is not null or ${t.erasedAt} is not null`,
    ),
  ],
);

/**
 * Free-form Palestinian addresses (CON-04: no postal code, no assumed street structure). Journaled.
 * governorate matches delivery_zones.governorate; locality is the town/village/camp; landmark is how couriers find it.
 */
export const addresses = pgTable(
  "addresses",
  {
    id: id(),
    customerId: uuid()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: text(), // "home", "work", …
    recipientName: text().notNull(),
    phoneE164: text().notNull(),
    governorate: text().notNull(),
    locality: text().notNull(),
    line1: text().notNull(),
    line2: text(),
    landmark: text(),
    notes: text(),
    isDefault: boolean().notNull().default(false),
    archivedAt: tstz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("addresses_customer_idx").on(t.customerId)],
);

/**
 * Consent ledger (FR-DAT-*, FR-MSG-*, FR-JRN-*): one row per grant or withdrawal; latest row per purpose wins.
 * purpose e.g. "marketing_whatsapp" | "marketing_sms" | "marketing_email" | "journey_results" | "terms" | "privacy".
 * customer_id is null for anonymous Journey sessions (session_ref then identifies the grant).
 */
export const consentRecords = pgTable(
  "consent_records",
  {
    id: id(),
    customerId: uuid().references(() => customers.id, { onDelete: "cascade" }),
    sessionRef: text(),
    purpose: text().notNull(),
    granted: boolean().notNull(),
    source: text().notNull(), // "checkout", "account", "journey", "admin", "import"
    policyVersion: text(), // policies.version the customer saw
    evidence: jsonb(), // e.g. { ip, userAgent, text shown }
    recordedAt: createdAt(),
  },
  (t) => [
    index("consent_records_customer_idx").on(t.customerId, t.purpose, t.recordedAt),
    check("consent_records_subject_ck", sql`${t.customerId} is not null or ${t.sessionRef} is not null`),
  ],
);

// ---------------------------------------------------------------------------------------------------------------
// Segments, messaging and campaigns (FR-CRM-001..003, FR-MSG-001..008)
// ---------------------------------------------------------------------------------------------------------------

/** Saved customer segments; `rules` is a JSON filter evaluated by the engagement module ("dynamic") or unused ("manual"). */
export const segments = pgTable("segments", {
  id: id(),
  key: text().notNull().unique(),
  nameAr: text().notNull(),
  nameEn: text().notNull(),
  kind: text().notNull().default("dynamic"), // "dynamic" | "manual"
  rules: jsonb().notNull().default(sql`'{}'::jsonb`),
  refreshedAt: tstz(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const segmentMemberships = pgTable(
  "segment_memberships",
  {
    id: id(),
    segmentId: uuid()
      .notNull()
      .references(() => segments.id, { onDelete: "cascade" }),
    customerId: uuid()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    addedAt: createdAt(),
  },
  (t) => [
    uniqueIndex("segment_memberships_uq").on(t.segmentId, t.customerId),
    index("segment_memberships_customer_idx").on(t.customerId),
  ],
);

export const messageChannelEnum = pgEnum("engagement_message_channel", ["whatsapp", "sms", "email"]);
/** WhatsApp templates need Meta approval before use (FR-MSG-*); sms/email templates are `not_required`. */
export const templateApprovalEnum = pgEnum("engagement_template_approval", [
  "not_required",
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

/** One row per (event, channel, locale). event_key e.g. "order.confirmed", "order.dispatched", "otp", "back_in_stock". */
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: id(),
    eventKey: text().notNull(),
    channel: messageChannelEnum().notNull(),
    locale: localeEnum().notNull(),
    subject: text(), // email only
    body: text().notNull(), // {{placeholders}}
    providerTemplateName: text(), // WhatsApp template name at Meta
    metaApprovalState: templateApprovalEnum().notNull().default("not_required"),
    isMarketing: boolean().notNull().default(false), // marketing ⇒ consent gate applies
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("message_templates_event_channel_locale_uq").on(t.eventKey, t.channel, t.locale)],
);

export const messageStatusEnum = pgEnum("engagement_message_status", ["queued", "sending", "sent", "failed", "dead"]);

/**
 * Transactional outbox (FR-MSG-*): business code inserts a row in the same transaction as the business change; a
 * worker delivers it with retries; `dead` after max attempts (plus a dead_letters row). `to` is E.164 or an email.
 */
export const messages = pgTable(
  "messages",
  {
    id: id(),
    channel: messageChannelEnum().notNull(),
    to: text().notNull(),
    customerId: uuid().references(() => customers.id, { onDelete: "set null" }),
    templateId: uuid().references(() => messageTemplates.id, { onDelete: "set null" }),
    eventKey: text().notNull(),
    locale: localeEnum().notNull().default("ar"),
    payload: jsonb().notNull().default(sql`'{}'::jsonb`),
    status: messageStatusEnum().notNull().default("queued"),
    attempts: integer().notNull().default(0),
    nextAttemptAt: tstz().notNull().defaultNow(),
    providerRef: text(),
    error: text(),
    dedupeKey: text().unique("messages_dedupe_key_unique"), // e.g. "order.dispatched:<orderId>"
    campaignId: uuid(),
    sentAt: tstz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("messages_due_idx").on(t.nextAttemptAt).where(sql`${t.status} in ('queued', 'failed')`),
    index("messages_customer_idx").on(t.customerId),
  ],
);

export const campaignStatusEnum = pgEnum("engagement_campaign_status", ["draft", "scheduled", "sending", "sent", "cancelled"]);

/** Marketing sends to a segment — only to recipients with current consent for the channel. */
export const campaigns = pgTable("campaigns", {
  id: id(),
  name: text().notNull(),
  channel: messageChannelEnum().notNull(),
  segmentId: uuid().references(() => segments.id, { onDelete: "set null" }),
  templateId: uuid().references(() => messageTemplates.id, { onDelete: "set null" }),
  status: campaignStatusEnum().notNull().default("draft"),
  scheduledAt: tstz(),
  sentAt: tstz(),
  createdById: uuid(), // staff_users.id (no FK: engagement must not import auth)
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: id(),
    campaignId: uuid()
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    customerId: uuid()
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    messageId: uuid().references(() => messages.id, { onDelete: "set null" }),
    skippedReason: text(), // "no_consent", "no_contact", …
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("campaign_recipients_uq").on(t.campaignId, t.customerId)],
);
