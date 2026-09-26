/**
 * Permission registry (FR-ACC-009, FR-ACC-010). Deny by default: a key that is not in this registry, or not granted
 * to the user's role in the DB, is refused for every role. The Owner gets an explicit grant for every key (no
 * wildcard). Pre-populated for every module so Phase 1 teams never edit auth: pick the key that fits, or add one
 * here in a coordinated change.
 */

export interface PermissionDef {
  /** Owner always true — kept explicit so the grant table reads the same as this file. */
  owner: true;
  /** Granted to the Staff role by default (operational read/write only). */
  staff: boolean;
  descAr: string;
  descEn: string;
}

const op = (descAr: string, descEn: string): PermissionDef => ({ owner: true, staff: true, descAr, descEn });
const ownerOnly = (descAr: string, descEn: string): PermissionDef => ({ owner: true, staff: false, descAr, descEn });

export const PERMISSIONS = {
  "dashboard.view": op("عرض لوحة التحكم", "View the dashboard"),

  "catalog.read": op("عرض الكتالوج", "View the catalogue"),
  "catalog.write": op("تعديل الكتالوج", "Edit the catalogue"),

  "inventory.read": op("عرض المخزون", "View inventory"),
  "inventory.write": op("تعديل المخزون", "Adjust inventory"),
  "inventory.cost.read": ownerOnly("عرض تكلفة الوحدة", "View unit cost"),
  "purchasing.read": op("عرض المشتريات", "View purchasing"),
  "purchasing.write": op("إدارة المشتريات", "Manage purchasing"),

  "orders.read": op("عرض الطلبات", "View orders"),
  "orders.write": op("إدارة الطلبات", "Manage orders"),
  "orders.close_lost": ownerOnly("إغلاق الطلب كمفقود", "Close an order as lost"),
  "returns.write": op("إدارة المرتجعات", "Manage returns"),

  "payments.read": op("عرض المدفوعات", "View payments"),
  "payments.refund": op("إصدار استرداد", "Issue refunds"),
  "payments.cod_writeoff": ownerOnly("شطب مبالغ الدفع عند الاستلام", "Write off cash-on-delivery amounts"),
  "invoices.read": op("عرض الفواتير", "View invoices"),
  "einvoice.manage": ownerOnly("إدارة الفوترة الإلكترونية", "Manage e-invoicing"),

  "customers.read": op("عرض العملاء", "View customers"),
  "customers.write": op("تعديل بيانات العملاء", "Edit customers"),
  "privacy.manage": ownerOnly("إدارة طلبات الخصوصية", "Manage privacy requests"),

  "messaging.templates.write": op("تعديل قوالب الرسائل", "Edit message templates"),
  "campaigns.write": op("إعداد الحملات", "Prepare campaigns"),
  "campaigns.send": ownerOnly("إرسال الحملات", "Send campaigns"),

  "reports.operational": op("التقارير التشغيلية", "Operational reports"),
  "reports.financial": ownerOnly("التقارير المالية", "Financial reports"),

  "assistant.manage": op("إدارة المساعد", "Manage the assistant"),
  "journey.manage": op("إدارة الرحلة", "Manage the Journey"),
  "content.write": op("تعديل المحتوى", "Edit content"),

  "settings.read": op("عرض الإعدادات", "View settings"),
  "settings.write": ownerOnly("تعديل الإعدادات", "Change settings"),
  "users.manage": ownerOnly("إدارة المستخدمين", "Manage back-office users"),
  "audit.read": ownerOnly("عرض سجل التدقيق", "View the audit log"),
} as const satisfies Record<string, PermissionDef>;

export type Permission = keyof typeof PERMISSIONS;
export type RoleKey = "owner" | "staff";

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export function isKnownPermission(key: string): key is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, key);
}

/** Default grants for a role (the seed writes these; runtime checks read the DB). Unknown role → none. */
export function grantsFor(roleKey: string): Permission[] {
  if (roleKey === "owner") return PERMISSION_KEYS.filter((k) => PERMISSIONS[k].owner);
  if (roleKey === "staff") return PERMISSION_KEYS.filter((k) => PERMISSIONS[k].staff);
  return [];
}
