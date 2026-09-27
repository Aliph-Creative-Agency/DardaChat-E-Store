/**
 * Engagement contract implementation (Phase 0, PLATFORM). Real: consent ledger, customer + address records,
 * transactional `notify` over `core.sendMessage`. STUB(contracts): notify renders built-in default texts; the
 * engagement team switches it to approved templates, per-customer channel preferences and quiet hours.
 */
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { withActor } from "../../db/guards";
import { actorOf, dbOf, type ServiceContext, type Tx } from "../../lib/context";
import { AppError } from "../../lib/errors";
import { stubWarn } from "../../lib/stub";
import { sendMessage, type MessageChannel } from "../core/messaging";
import { renderDefaultText } from "./default-texts";
import { addresses, consentRecords, customers } from "./schema";
import {
  TRANSACTIONAL_EVENTS,
  type AddressInput,
  type AddressView,
  type ConsentView,
  type ContactChannel,
  type CustomerView,
  type NotifyData,
  type NotifyRecipient,
  type NotifyResult,
  type RecordConsentInput,
  type TransactionalEvent,
  type UpsertCustomerInput,
  type UpsertCustomerResult,
} from "./types";

// ---------------------------------------------------------------------------------------------------------------
// Contact normalisation (callers should pass E.164 from the auth phone helper; this only validates the shape)
// ---------------------------------------------------------------------------------------------------------------

const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normPhone(phone: string | null | undefined): string | null {
  if (phone == null || phone.trim() === "") return null;
  const p = phone.replace(/[\s()-]/g, "");
  if (!E164.test(p)) throw new AppError("invalid_input", "phone must be E.164 (e.g. +970599123456)", { field: "phone" });
  return p;
}

function normEmail(email: string | null | undefined): string | null {
  if (email == null || email.trim() === "") return null;
  const e = email.trim().toLowerCase();
  if (!EMAIL.test(e)) throw new AppError("invalid_input", "invalid email address", { field: "email" });
  return e;
}

/** Journalled writes (customers, addresses) are attributed to ctx.actor (system when absent). */
function write<T>(ctx: ServiceContext | undefined, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withActor(dbOf(ctx), actorOf(ctx), fn);
}

// ---------------------------------------------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------------------------------------------

type CustomerRow = typeof customers.$inferSelect;

function customerView(r: CustomerRow): CustomerView {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phoneE164,
    locale: r.locale,
    status: r.status,
    isGuest: r.isGuest,
    createdAt: r.createdAt,
  };
}

export async function getCustomer(id: string, ctx?: ServiceContext): Promise<CustomerView | null> {
  const [row] = await dbOf(ctx).select().from(customers).where(eq(customers.id, id));
  return row ? customerView(row) : null;
}

/** Phone match wins over email match. Null when neither matches (or neither is given). */
export async function findCustomerByContact(
  contact: { phone?: string | null; email?: string | null },
  ctx?: ServiceContext,
): Promise<CustomerView | null> {
  const phone = normPhone(contact.phone);
  const email = normEmail(contact.email);
  const db = dbOf(ctx);
  if (phone) {
    const [row] = await db.select().from(customers).where(eq(customers.phoneE164, phone));
    if (row) return customerView(row);
  }
  if (email) {
    const [row] = await db.select().from(customers).where(sql`lower(${customers.email}) = ${email}`);
    if (row) return customerView(row);
  }
  return null;
}

/**
 * Find by phone, then email; create when neither matches. On a match, fills a missing name/email/phone (never
 * overwrites, never steals a contact another customer owns). Does not merge two existing customers.
 */
export async function upsertCustomer(input: UpsertCustomerInput, ctx?: ServiceContext): Promise<UpsertCustomerResult> {
  const phone = normPhone(input.phone);
  const email = normEmail(input.email);
  if (!phone && !email) throw new AppError("invalid_input", "a phone or an email is required");
  const name = input.name?.trim() || null;

  return write(ctx, async (tx) => {
    const existing = await findCustomerByContact({ phone, email }, { db: tx });
    if (!existing) {
      const [row] = await tx
        .insert(customers)
        .values({ name, phoneE164: phone, email, locale: input.locale, isGuest: input.isGuest ?? true })
        .returning();
      return { customer: customerView(row!), created: true };
    }
    const patch: Partial<typeof customers.$inferInsert> = {};
    if (!existing.name && name) patch.name = name;
    if (!existing.phone && phone && !(await findCustomerByContact({ phone }, { db: tx }))) patch.phoneE164 = phone;
    if (!existing.email && email && !(await findCustomerByContact({ email }, { db: tx }))) patch.email = email;
    if (Object.keys(patch).length === 0) return { customer: existing, created: false };
    const [row] = await tx
      .update(customers)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(customers.id, existing.id))
      .returning();
    return { customer: customerView(row!), created: false };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------------------------------------------

type AddressRow = typeof addresses.$inferSelect;

function addressView(r: AddressRow): AddressView {
  return {
    id: r.id,
    customerId: r.customerId,
    label: r.label,
    recipientName: r.recipientName,
    phone: r.phoneE164,
    governorate: r.governorate,
    locality: r.locality,
    line1: r.line1,
    line2: r.line2,
    landmark: r.landmark,
    notes: r.notes,
    isDefault: r.isDefault,
  };
}

/** Active (not archived) addresses, default first, then newest. */
export async function listAddresses(customerId: string, ctx?: ServiceContext): Promise<AddressView[]> {
  const rows = await dbOf(ctx)
    .select()
    .from(addresses)
    .where(and(eq(addresses.customerId, customerId), isNull(addresses.archivedAt)))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return rows.map(addressView);
}

/** Create (no id) or update (id of one of the customer's addresses). isDefault clears the flag on the others. */
export async function saveAddress(customerId: string, input: AddressInput, ctx?: ServiceContext): Promise<AddressView> {
  const required = { recipientName: input.recipientName, governorate: input.governorate, locality: input.locality, line1: input.line1 };
  for (const [field, value] of Object.entries(required)) {
    if (!value || !value.trim()) throw new AppError("invalid_input", `${field} is required`, { field });
  }
  const phone = normPhone(input.phone);
  if (!phone) throw new AppError("invalid_input", "phone is required", { field: "phone" });
  const values = {
    label: input.label?.trim() || null,
    recipientName: input.recipientName.trim(),
    phoneE164: phone,
    governorate: input.governorate.trim(),
    locality: input.locality.trim(),
    line1: input.line1.trim(),
    line2: input.line2?.trim() || null,
    landmark: input.landmark?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  return write(ctx, async (tx) => {
    const [owner] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId));
    if (!owner) throw new AppError("not_found", "customer not found", { customerId });
    const hasOthers = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.customerId, customerId), isNull(addresses.archivedAt)))
      .limit(1);
    // The first address becomes the default.
    const isDefault = input.isDefault ?? hasOthers.length === 0;

    let row: AddressRow | undefined;
    if (input.id) {
      [row] = await tx
        .update(addresses)
        .set({ ...values, ...(input.isDefault !== undefined ? { isDefault } : {}), updatedAt: new Date() })
        .where(and(eq(addresses.id, input.id), eq(addresses.customerId, customerId), isNull(addresses.archivedAt)))
        .returning();
      if (!row) throw new AppError("not_found", "address not found", { addressId: input.id });
    } else {
      [row] = await tx.insert(addresses).values({ ...values, customerId, isDefault }).returning();
    }
    if (row!.isDefault) {
      await tx
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(addresses.customerId, customerId), ne(addresses.id, row!.id), eq(addresses.isDefault, true)));
    }
    return addressView(row!);
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Consent ledger (latest record per purpose wins)
// ---------------------------------------------------------------------------------------------------------------

export function consentPurpose(purpose: string, channel?: ContactChannel | null): string {
  return channel ? `${purpose}_${channel}` : purpose;
}

type ConsentRow = typeof consentRecords.$inferSelect;

function consentView(r: ConsentRow): ConsentView {
  return {
    id: r.id,
    customerId: r.customerId!,
    purpose: r.purpose,
    granted: r.granted,
    source: r.source,
    policyVersion: r.policyVersion,
    recordedAt: r.recordedAt,
  };
}

export async function recordConsent(input: RecordConsentInput, ctx?: ServiceContext): Promise<ConsentView> {
  if (!input.purpose.trim()) throw new AppError("invalid_input", "purpose is required", { field: "purpose" });
  const [row] = await dbOf(ctx)
    .insert(consentRecords)
    .values({
      customerId: input.customerId,
      purpose: consentPurpose(input.purpose.trim(), input.channel),
      granted: input.granted,
      source: input.source,
      policyVersion: input.policyVersion ?? null,
      evidence: input.evidence ?? null,
      // clock_timestamp(): distinct, increasing even inside one transaction, so "latest wins" is well defined.
      recordedAt: sql`clock_timestamp()`,
    })
    .returning();
  return consentView(row!);
}

/** True only when the newest record for `<purpose>_<channel>` is a grant (no record = no consent). */
export async function hasConsent(
  customerId: string,
  channel: ContactChannel | null,
  purpose = "marketing",
  ctx?: ServiceContext,
): Promise<boolean> {
  const [row] = await dbOf(ctx)
    .select({ granted: consentRecords.granted })
    .from(consentRecords)
    .where(and(eq(consentRecords.customerId, customerId), eq(consentRecords.purpose, consentPurpose(purpose, channel))))
    .orderBy(desc(consentRecords.recordedAt))
    .limit(1);
  return row?.granted ?? false;
}

/**
 * Current state: the newest record per purpose (sorted by purpose). `{ history: true }` returns the whole ledger,
 * newest first.
 */
export async function listConsents(
  customerId: string,
  opts: { history?: boolean } = {},
  ctx?: ServiceContext,
): Promise<ConsentView[]> {
  const rows = await dbOf(ctx)
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.customerId, customerId))
    .orderBy(desc(consentRecords.recordedAt));
  if (opts.history) return rows.map(consentView);
  const latest = new Map<string, ConsentRow>();
  for (const r of rows) if (!latest.has(r.purpose)) latest.set(r.purpose, r);
  return [...latest.values()].sort((a, b) => a.purpose.localeCompare(b.purpose)).map(consentView);
}

// ---------------------------------------------------------------------------------------------------------------
// Transactional notifications
// ---------------------------------------------------------------------------------------------------------------

/** Account events that may legitimately repeat (dedupe only with an explicit data.dedupeRef). */
const REPEATABLE: ReadonlySet<TransactionalEvent> = new Set(["account.password_reset", "account.email_changed"]);

function dedupeKeyOf(event: TransactionalEvent, data: NotifyData, customerId: string | undefined): string | undefined {
  const ref = data.dedupeRef ?? data.orderId ?? (REPEATABLE.has(event) ? undefined : customerId);
  return ref ? `${event}:${ref}` : undefined;
}

/**
 * Send a transactional message (no consent gate): phone → WhatsApp with SMS fallback, and email when present.
 * Contact + locale come from the customer row unless given. Deduped per `<event>:<orderId|customerId>`.
 * Returns no ids when the recipient has no usable contact (or was erased) — never throws for that.
 */
export async function notify(
  event: TransactionalEvent,
  recipient: NotifyRecipient,
  data: NotifyData = {},
  ctx?: ServiceContext,
): Promise<NotifyResult> {
  if (!(TRANSACTIONAL_EVENTS as readonly string[]).includes(event)) {
    throw new AppError("invalid_input", `unknown transactional event ${event}`, { event });
  }
  stubWarn("engagement.notify.defaultTexts");
  const customer = recipient.customerId ? await getCustomer(recipient.customerId, ctx) : null;
  if (recipient.customerId && !customer) throw new AppError("not_found", "customer not found", { customerId: recipient.customerId });
  if (customer?.status === "erased") return { messageIds: [] };

  const phone = normPhone(recipient.phone) ?? customer?.phone ?? null;
  const email = normEmail(recipient.email) ?? customer?.email ?? null;
  const locale = recipient.locale ?? customer?.locale ?? "ar";
  const { text, subject } = renderDefaultText(event, locale, data, customer?.name);
  const baseKey = dedupeKeyOf(event, data, customer?.id);
  const { dedupeRef: _ignored, ...payload } = data;
  void _ignored;

  const groups: { channels: MessageChannel[]; to: { phone?: string; email?: string }; suffix: string }[] = [];
  if (phone) groups.push({ channels: ["whatsapp", "sms"], to: { phone }, suffix: "" });
  if (email) groups.push({ channels: ["email"], to: { email }, suffix: ":email" });

  const messageIds: string[] = [];
  for (const g of groups) {
    const result = await sendMessage(
      {
        channels: g.channels,
        to: g.to,
        eventKey: event,
        locale,
        text,
        subject,
        payload,
        customerId: customer?.id,
        dedupeKey: baseKey ? `${baseKey}${g.suffix}` : undefined,
      },
      ctx,
    );
    messageIds.push(result.messageId);
  }
  return { messageIds };
}
