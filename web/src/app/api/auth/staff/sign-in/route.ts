import { z } from "zod";
import { db } from "@/db/client";
import { fail, metaOf, ok, readBody, tokenFrom, withSessionCookie } from "@/modules/auth/http";
import { revokeSessionByToken } from "@/modules/auth/session";
import { signInStaff } from "@/modules/auth/staff-auth";

const Body = z.object({ email: z.string().max(320), password: z.string().max(1024) });

/**
 * POST /api/auth/staff/sign-in — FR-ACC-012. Sets a PENDING staff session (no second factor yet); the client goes
 * to `/staff/two-factor/setup` (next = "enrol") or `/staff/two-factor` (next = "challenge").
 */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const r = await signInStaff(db, body.data, metaOf(req));
  if (!r.ok) return fail(r);
  const previous = tokenFrom(req, "staff");
  if (previous) await revokeSessionByToken(db, previous);
  return withSessionCookie(ok({ next: r.next }), "staff", r.token);
}
