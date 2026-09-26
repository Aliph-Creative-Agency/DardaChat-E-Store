import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, localeEnum, tstz, updatedAt } from "../../db/columns";

export const staffStatusEnum = pgEnum("auth_staff_status", ["active", "suspended", "revoked"]);

/** Back-office users (FR-ACC-009..015). Email is stored lower-cased; uniqueness is case-insensitive. */
export const staffUsers = pgTable(
  "staff_users",
  {
    id: id(),
    email: text().notNull(),
    name: text().notNull(),
    passwordHash: text().notNull(), // Argon2id (FR-ACC-005)
    status: staffStatusEnum().notNull().default("active"),
    locale: localeEnum().notNull().default("ar"),
    mustChangePassword: boolean().notNull().default(false),
    lastLoginAt: tstz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("staff_users_email_uq").on(sql`lower(${t.email})`)],
);

/** Roles: `owner`, `staff` (FR-ACC-009). */
export const roles = pgTable("roles", {
  id: id(),
  key: text().notNull().unique(),
  nameAr: text().notNull(),
  nameEn: text().notNull(),
  createdAt: createdAt(),
});

/** Permission keys such as `catalog.write`, `reports.financial` — deny by default (FR-ACC-010). */
export const permissions = pgTable("permissions", {
  id: id(),
  key: text().notNull().unique(),
  description: text(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: id(),
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid()
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  // surrogate id + unique pair: drizzle-kit 0.31 push re-creates composite PKs on every run (see DECISIONS.md)
  (t) => [uniqueIndex("role_permissions_uq").on(t.roleId, t.permissionId)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
  },
  (t) => [uniqueIndex("user_roles_uq").on(t.userId, t.roleId)],
);

export const subjectTypeEnum = pgEnum("auth_subject_type", ["customer", "staff"]);

/** DB-backed sessions (NFR-SCL-003: no affinity). Only a hash of the cookie token is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text().notNull().unique(),
    subjectType: subjectTypeEnum().notNull(),
    subjectId: uuid().notNull(), // staff_users.id or customers.id
    secondFactorAt: tstz(), // staff: when 2FA was completed for this session (FR-ACC-012)
    createdAt: createdAt(),
    expiresAt: tstz().notNull(),
    lastSeenAt: tstz().notNull().defaultNow(),
    rotatedFrom: uuid(),
    revokedAt: tstz(),
    ip: text(),
    userAgent: text(),
  },
  (t) => [index("sessions_subject_idx").on(t.subjectType, t.subjectId)],
);

/** One-time passwords (FR-ACC-002..004): 5-minute expiry, single use, attempt-limited. */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: id(),
    phoneE164: text(),
    email: text(),
    codeHash: text().notNull(),
    purpose: text().notNull(), // "login" | "verify_phone" | "verify_email" | "data_request"
    channel: text(), // "whatsapp" | "sms" | "email" — the channel that delivered it
    expiresAt: tstz().notNull(),
    consumedAt: tstz(),
    attempts: integer().notNull().default(0),
    ip: text(),
    createdAt: createdAt(),
  },
  (t) => [
    check("otp_codes_target_ck", sql`${t.phoneE164} is not null or ${t.email} is not null`),
    index("otp_codes_phone_idx").on(t.phoneE164, t.createdAt),
    index("otp_codes_email_idx").on(t.email, t.createdAt),
  ],
);

/** Back-office TOTP second factor (FR-ACC-012). Secret encrypted with SESSION_SECRET-derived key by AUTH. */
export const totpSecrets = pgTable("totp_secrets", {
  userId: uuid()
    .primaryKey()
    .references(() => staffUsers.id, { onDelete: "cascade" }),
  secretEncrypted: text().notNull(),
  recoveryCodeHashes: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  confirmedAt: tstz(),
  createdAt: createdAt(),
});

/** Single-use, time-limited reset tokens (FR-ACC-006) for customers and staff. */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: id(),
  subjectType: subjectTypeEnum().notNull(),
  subjectId: uuid().notNull(),
  tokenHash: text().notNull().unique(),
  expiresAt: tstz().notNull(),
  usedAt: tstz(),
  createdAt: createdAt(),
});

/** Sliding-window rate limiting (FR-ACC-004: per number and per IP). key e.g. `otp:phone:+9705…`, `otp:ip:1.2.3.4`. */
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: id(),
    key: text().notNull(),
    hitAt: createdAt(),
  },
  (t) => [index("rate_limit_hits_key_idx").on(t.key, t.hitAt)],
);
