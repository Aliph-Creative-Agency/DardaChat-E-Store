import { and, desc, eq } from "drizzle-orm";
import { createDb, defaultDatabaseUrl } from "../../../src/db/connection";
import { messages } from "../../../src/modules/engagement/schema";

/** E2E DB helper: reads what the mock channels "sent" from the `messages` outbox (never from logs). */
const { db, client } = createDb(defaultDatabaseUrl(), { max: 2 });

export async function lastOutboxPayload(to: string, eventKey: string): Promise<Record<string, unknown> | null> {
  const [m] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.to, to), eq(messages.eventKey, eventKey)))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return (m?.payload as Record<string, unknown>) ?? null;
}

export async function waitForOutbox(to: string, eventKey: string, after = new Date(0)): Promise<Record<string, unknown>> {
  for (let i = 0; i < 50; i++) {
    const [m] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.to, to), eq(messages.eventKey, eventKey)))
      .orderBy(desc(messages.createdAt))
      .limit(1);
    if (m && m.createdAt > after) return m.payload as Record<string, unknown>;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no ${eventKey} message for ${to}`);
}

export const closeDb = () => client.end();

/** A unique client IP per run so the per-IP rate limits never trip across repeated local runs. */
export function randomIp(): string {
  const b = () => 1 + Math.floor(Math.random() * 250);
  return `10.${b()}.${b()}.${b()}`;
}

/** Forget a staff user's authenticator (and its TOTP rate-limit / replay rows) so enrolment can run again. */
export async function resetStaffTwoFactor(email: string): Promise<void> {
  await client`delete from rate_limit_hits where key like ${"totp:%"} or key = ${`signin:staff:${email}`}`;
  await client`delete from totp_secrets where user_id = (select id from staff_users where lower(email) = ${email.toLowerCase()})`;
}
