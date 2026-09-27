/**
 * Dev only (404 in production). GET: latest outbox messages as JSON, `?to=<E.164|email>` and `?limit=` filters — lets
 * e2e tests and other teams read an OTP or a notification. POST `{ channel, to, text, subject?, locale?, eventKey? }`
 * sends a test message through `sendMessage` (fallback rules apply only to the one channel given).
 */
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { messages } from "@/modules/engagement/schema";
import { sendMessage } from "@/modules/core/messaging";
import { CHANNELS } from "@/lib/channels";
import { dbOf } from "@/lib/context";
import { httpStatus, isAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const notFound = () => Response.json({ error: "not_found" }, { status: 404 });
const isProd = () => process.env.NODE_ENV === "production";

export async function GET(request: Request): Promise<Response> {
  if (isProd()) return notFound();
  const url = new URL(request.url);
  const to = url.searchParams.get("to");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
  const rows = await dbOf()
    .select()
    .from(messages)
    .where(to ? eq(messages.to, to) : undefined)
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return Response.json({
    messages: rows.map((m) => {
      const payload = m.payload as { text?: string; subject?: string | null };
      return {
        id: m.id,
        createdAt: m.createdAt,
        channel: m.channel,
        to: m.to,
        eventKey: m.eventKey,
        locale: m.locale,
        status: m.status,
        attempts: m.attempts,
        text: payload.text ?? "",
        subject: payload.subject ?? null,
        providerRef: m.providerRef,
        error: m.error,
      };
    }),
  });
}

const postSchema = z.object({
  channel: z.enum(CHANNELS),
  to: z.string().min(1),
  text: z.string().min(1),
  subject: z.string().optional(),
  locale: z.enum(["ar", "en"]).default("en"),
  eventKey: z.string().min(1).default("dev.test"),
});

export async function POST(request: Request): Promise<Response> {
  if (isProd()) return notFound();
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  const { channel, to, ...rest } = parsed.data;
  try {
    const result = await sendMessage({
      channels: [channel],
      to: channel === "email" ? { email: to } : { phone: to },
      ...rest,
    });
    return Response.json(result, { status: result.status === "failed" ? 502 : 201 });
  } catch (error) {
    if (isAppError(error)) return Response.json({ error: error.code, message: error.message }, { status: httpStatus[error.code] });
    throw error;
  }
}
