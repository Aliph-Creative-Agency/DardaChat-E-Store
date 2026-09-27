import { eq } from "drizzle-orm";
import { db as defaultDb, type DbOrTx } from "@/db/client";
import { withActor } from "@/db/guards";
import { customers, staffUsers } from "@/db/schema";
import { isLocale, type Locale } from "./routing";

/**
 * Locale preference of a signed-in user (UI-003): stored on `staff_users.locale` / `customers.locale`, written by the
 * LocaleSwitcher's server action, read by auth's post-sign-in redirect (`preferredLocale`). The anonymous preference is
 * the `NEXT_LOCALE` cookie alone.
 */

export type LocaleSubject = { type: "staff" | "customer"; id: string };

/** Saves `locale` for the subject, attributed to them in the row journal. Returns false if no such user exists. */
export async function persistLocalePreference(
  subject: LocaleSubject,
  locale: string,
  db: DbOrTx = defaultDb,
): Promise<boolean> {
  if (!isLocale(locale)) throw new RangeError(`Unsupported locale: ${locale}`);
  const table = subject.type === "staff" ? staffUsers : customers;
  const rows = await withActor(db, { type: subject.type, id: subject.id }, (tx) =>
    tx.update(table).set({ locale, updatedAt: new Date() }).where(eq(table.id, subject.id)).returning({ id: table.id }),
  );
  return rows.length > 0;
}

/** The subject's saved locale, or null if the user does not exist. */
export async function preferredLocale(subject: LocaleSubject, db: DbOrTx = defaultDb): Promise<Locale | null> {
  const table = subject.type === "staff" ? staffUsers : customers;
  const [row] = await db.select({ locale: table.locale }).from(table).where(eq(table.id, subject.id)).limit(1);
  return row && isLocale(row.locale) ? row.locale : null;
}
