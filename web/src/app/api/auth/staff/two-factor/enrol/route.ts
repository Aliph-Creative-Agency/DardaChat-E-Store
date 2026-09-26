import { db } from "@/db/client";
import { fail, ok, pendingStaffSession } from "@/modules/auth/http";
import { beginTotpEnrolment } from "@/modules/auth/staff-auth";

/** POST /api/auth/staff/two-factor/enrol — new (unconfirmed) authenticator secret for the signed-in staff user. */
export async function POST(req: Request) {
  const session = await pendingStaffSession(db, req);
  if (!session) return fail({ ok: false, error: "unauthenticated" });
  const r = await beginTotpEnrolment(db, session);
  if (!r.ok) return fail(r);
  return ok({ otpauthUri: r.otpauthUri, groupedSecret: r.groupedSecret });
}
