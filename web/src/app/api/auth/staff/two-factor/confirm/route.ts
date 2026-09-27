import { z } from "zod";
import { db } from "@/db/client";
import { fail, metaOf, ok, pendingStaffSession, readBody, withSessionCookie } from "@/modules/auth/http";
import { confirmTotpEnrolment, mustChangePassword } from "@/modules/auth/staff-auth";

const Body = z.object({ code: z.string().max(32) });

/** POST /api/auth/staff/two-factor/confirm — first code confirms enrolment; returns the recovery codes ONCE. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const session = await pendingStaffSession(db, req);
  if (!session) return fail({ ok: false, error: "unauthenticated" });
  const r = await confirmTotpEnrolment(db, session, body.data.code, metaOf(req));
  if (!r.ok) return fail(r);
  const res = ok({ recoveryCodes: r.recoveryCodes, mustChangePassword: await mustChangePassword(db, session.subjectId) });
  res.headers.set("Cache-Control", "no-store");
  return withSessionCookie(res, "staff", r.token);
}
