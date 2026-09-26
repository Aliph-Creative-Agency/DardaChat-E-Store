import { z } from "zod";
import { db } from "@/db/client";
import { fail, metaOf, ok, pendingStaffSession, readBody, withSessionCookie } from "@/modules/auth/http";
import { challengeTotp, mustChangePassword } from "@/modules/auth/staff-auth";

const Body = z.object({ code: z.string().max(32) });

/** POST /api/auth/staff/two-factor/challenge — authenticator code or a single-use recovery code. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const session = await pendingStaffSession(db, req);
  if (!session) return fail({ ok: false, error: "unauthenticated" });
  const r = await challengeTotp(db, session, body.data.code, metaOf(req));
  if (!r.ok) return fail(r);
  return withSessionCookie(
    ok({ recoveryCodesLeft: r.recoveryCodesLeft, mustChangePassword: await mustChangePassword(db, session.subjectId) }),
    "staff",
    r.token,
  );
}
