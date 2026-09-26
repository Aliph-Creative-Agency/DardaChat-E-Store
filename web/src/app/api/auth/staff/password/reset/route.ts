import { z } from "zod";
import { db } from "@/db/client";
import { fail, metaOf, ok, readBody, withoutSessionCookie } from "@/modules/auth/http";
import { resetPassword } from "@/modules/auth/password-reset";

const Body = z.object({ token: z.string().max(200), password: z.string().max(1024) });

/** POST /api/auth/staff/password/reset — FR-ACC-006. Signs the staff user out everywhere. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const r = await resetPassword(db, body.data.token, body.data.password, {
    ...metaOf(req),
    subjectType: "staff",
  });
  if (!r.ok) return fail(r);
  return withoutSessionCookie(ok(), "staff");
}
