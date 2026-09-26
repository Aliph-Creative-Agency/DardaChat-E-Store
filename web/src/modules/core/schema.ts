import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Key/value runtime settings (reservation TTL, COD max, feature toggles…). */
export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
