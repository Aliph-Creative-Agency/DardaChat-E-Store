import { NextResponse } from "next/server";
import { z } from "zod";
import { COOKIE_NAMES } from "./config";
import { readCookie } from "./guards";
import { clientIp } from "./rate-limit";
import type { DbOrTx } from "../../db/connection";
import { type Session, type SubjectType, sessionCookie, validateSession } from "./session";

/** Shared plumbing for the auth route handlers (JSON in/out, status mapping, cookies). */

export const localeField = z.enum(["ar", "en"]).catch("ar");

const STATUS: Record<string, number> = {
  invalid_input: 400,
  invalid_phone: 400,
  invalid_token: 400,
  invalid_credentials: 401,
  invalid_code: 401,
  expired: 401,
  unauthenticated: 401,
  unknown_role: 400,
  account_disabled: 403,
  forbidden: 403,
  password_change_required: 403,
  not_found: 404,
  email_taken: 409,
  self_action: 409,
  last_owner: 409,
  invalid_state: 409,
  weak_password: 422,
  locked: 423,
  rate_limited: 429,
  delivery_failed: 503,
};

export type Failure = { ok: false; error: string; retryAfterMs?: number; [k: string]: unknown };

export function fail(f: Failure): NextResponse {
  const { ok: _ok, ...body } = f;
  void _ok;
  const res = NextResponse.json(body, { status: STATUS[f.error] ?? 400 });
  if (f.error === "rate_limited" && f.retryAfterMs) {
    res.headers.set("Retry-After", String(Math.ceil(f.retryAfterMs / 1000)));
  }
  return res;
}

export function ok(body: Record<string, unknown> = {}, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...body }, { status });
}

/** Parse a JSON body with zod; a malformed body becomes a 400 `invalid_input` listing the fields. */
export async function readBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = undefined;
  }
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  const fields = [...new Set(r.error.issues.map((i) => String(i.path[0] ?? "body")))];
  return { ok: false, res: fail({ ok: false, error: "invalid_input", fields }) };
}

export function metaOf(req: Request): { ip: string; userAgent: string | null } {
  return { ip: clientIp(req.headers), userAgent: req.headers.get("user-agent") };
}

export function tokenFrom(req: Request, subjectType: SubjectType): string | undefined {
  return readCookie(req, COOKIE_NAMES[subjectType]) ?? undefined;
}

export function withSessionCookie(res: NextResponse, subjectType: SubjectType, token: string): NextResponse {
  const { name, ...opts } = sessionCookie(subjectType);
  res.cookies.set(name, token, opts);
  return res;
}

export function withoutSessionCookie(res: NextResponse, subjectType: SubjectType): NextResponse {
  const { name, ...opts } = sessionCookie(subjectType);
  res.cookies.set(name, "", { ...opts, maxAge: 0 });
  return res;
}

/** Staff session from the request cookie, INCLUDING one still waiting for its second factor (2FA routes only). */
export function pendingStaffSession(db: DbOrTx, req: Request): Promise<Session | null> {
  return validateSession(db, tokenFrom(req, "staff"), "staff");
}
