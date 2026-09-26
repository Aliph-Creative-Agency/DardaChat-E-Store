import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "./schema";
import { consentRecords, customers, journeyResults, messages, messageTemplates } from "./schema";
import { createTestDb, expectConstraintViolation, truncateAll } from "./test-utils";

const { db, close } = createTestDb();

beforeAll(() => truncateAll(db));
afterAll(() => close());

/** The BRIEF module map (lanes/core/BRIEF.md) plus tables the requirements implied (order_notes). */
const EXPECTED_TABLES = [
  // core
  "settings", "audit_entries", "business_events", "dead_letters", "job_locks", "service_health",
  // auth
  "staff_users", "roles", "permissions", "role_permissions", "user_roles", "sessions", "otp_codes", "totp_secrets",
  "password_reset_tokens", "rate_limit_hits",
  // catalog
  "products", "variants", "media_assets", "collections", "collection_products", "slug_redirects",
  "product_components", "seasonal_windows", "static_pages", "faq_entries", "policies",
  // inventory
  "locations", "stock_levels", "stock_movements", "reservations", "back_in_stock_requests", "suppliers",
  "purchase_orders", "po_lines", "po_receipts", "po_receipt_lines",
  // storefront
  "carts", "cart_lines",
  // orders
  "delivery_zones", "orders", "order_lines", "order_events", "order_notes", "idempotency_keys", "shipments",
  "shipment_lines", "delivery_outcomes", "returns", "return_lines",
  // payments
  "vat_rates", "payments", "refunds", "invoices", "credit_notes", "number_series", "einvoice_submissions",
  "cash_remittances", "remittance_allocations",
  // engagement
  "customers", "addresses", "consent_records", "segments", "segment_memberships", "message_templates", "messages",
  "campaigns", "campaign_recipients",
  // insights
  "data_requests", "retention_settings",
  // assistant
  "assistant_documents", "assistant_conversations", "assistant_messages", "assistant_usage", "assistant_escalations",
  // journey
  "journey_sessions", "journey_results", "journey_aggregates",
].sort();

describe("whole schema", () => {
  it("the barrel exports exactly the expected tables and each exists in the database", async () => {
    const barrel = Object.values(schema)
      .filter((v) => is(v, PgTable))
      .map((t) => getTableName(t as PgTable))
      .sort();
    expect(barrel).toEqual(EXPECTED_TABLES);

    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`,
    );
    const inDb = new Set(rows.map((r) => r.table_name));
    expect(EXPECTED_TABLES.filter((t) => !inDb.has(t))).toEqual([]);
  });

  it("refuses a journey result tied to a customer without a consent record", async () => {
    const [c] = await db.insert(customers).values({ email: "j@example.test" }).returning();
    const base = { sessionToken: "s-1", choices: [], traitScores: {}, resultKey: "explorer" };
    await db.insert(journeyResults).values(base); // anonymous: fine
    await expectConstraintViolation(
      db.insert(journeyResults).values({ ...base, customerId: c!.id }),
      "journey_results_consent_ck",
    );
    const [consent] = await db
      .insert(consentRecords)
      .values({ customerId: c!.id, purpose: "journey_results", granted: true, source: "journey" })
      .returning();
    await db.insert(journeyResults).values({ ...base, customerId: c!.id, consentRecordId: consent!.id });
  });

  it("queues an outbox message with a unique dedupe key and one template per event/channel/locale", async () => {
    const tpl = { eventKey: "order.confirmed", channel: "whatsapp" as const, locale: "ar" as const, body: "تم تأكيد طلبك {{ref}}" };
    await db.insert(messageTemplates).values(tpl);
    await expectConstraintViolation(db.insert(messageTemplates).values(tpl), "message_templates_event_channel_locale_uq");
    const msg = { channel: "whatsapp" as const, to: "+970599123456", eventKey: "order.confirmed", dedupeKey: "order.confirmed:1" };
    const [m] = await db.insert(messages).values(msg).returning();
    expect(m!.status).toBe("queued");
    await expectConstraintViolation(db.insert(messages).values(msg), "messages_dedupe_key_unique");
  });
});
