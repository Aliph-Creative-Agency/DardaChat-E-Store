import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
