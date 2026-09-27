import { z } from "zod";
import { db } from "@/db/client";
import { fail, metaOf, ok, readBody, tokenFrom } from "@/modules/auth/http";
import { resolveStaff } from "@/modules/auth/guards";
import { changeOwnPassword } from "@/modules/auth/staff-auth";

const Body = z.object({ currentPassword: z.string().max(1024), newPassword: z.string().max(1024) });

/** POST /api/auth/staff/password/change — FR-ACC-015. Needs a 2FA-complete session; other sessions are signed out. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const ctx = await resolveStaff(db, tokenFrom(req, "staff"));
  if (!ctx?.staff.secondFactorDone) return fail({ ok: false, error: "unauthenticated" });
  const r = await changeOwnPassword(db, ctx.session, body.data, metaOf(req));
  return r.ok ? ok() : fail(r);
}
