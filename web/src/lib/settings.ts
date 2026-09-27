/** Typed access to the `settings` key/value table. Invalid stored values never crash callers: warn + fallback. */
import { eq, sql } from "drizzle-orm";
import type { ZodType } from "zod";
import { settings } from "../modules/core/schema";
import { dbOf, type ServiceContext } from "./context";

export async function getSetting<T>(key: string, schema: ZodType<T>, fallback: T, ctx?: ServiceContext): Promise<T> {
  const [row] = await dbOf(ctx).select({ value: settings.value }).from(settings).where(eq(settings.key, key));
  if (!row) return fallback;
  const parsed = schema.safeParse(row.value);
  if (!parsed.success) {
    console.warn(`[settings] invalid value for "${key}", using fallback: ${parsed.error.message}`);
    return fallback;
  }
  return parsed.data;
}

export async function setSetting(key: string, value: unknown, ctx?: ServiceContext): Promise<void> {
  const json = value === undefined ? null : value;
  await dbOf(ctx)
    .insert(settings)
    .values({ key, value: json })
    .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedAt: sql`now()` } });
}

export async function deleteSetting(key: string, ctx?: ServiceContext): Promise<void> {
  await dbOf(ctx).delete(settings).where(eq(settings.key, key));
}
