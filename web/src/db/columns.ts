/**
 * Shared column builders for every module's schema.ts (import relatively: `../../db/columns`).
 * Conventions (PLAN §1, lane BRIEF): uuid ids, timestamptz in UTC, money as integer agorot, bilingual `_ar`/`_en`,
 * snake_case column names (drizzle `casing: "snake_case"` maps camelCase keys).
 */
import { customType, integer, pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

/** Primary key: uuid with DB-side default. */
export const id = () => uuid().primaryKey().defaultRandom();

/** timestamptz (UTC). */
export const tstz = () => timestamp({ withTimezone: true });

export const createdAt = () => tstz().notNull().defaultNow();
/** Set by application code on update (`updatedAt: new Date()`); defaults to now on insert. */
export const updatedAt = () => tstz().notNull().defaultNow();

/** Money column: integer agorot (CON-01). Name columns plainly (`price`, `total`), never with an `_agorot` suffix. */
export const money = () => integer();

/** UI locales (UI-001). */
export const localeEnum = pgEnum("core_locale", ["ar", "en"]);

/** Postgres `tsvector` (full-text search). Maintained by triggers in `src/db/sql/*.sql`, never written by app code. */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
