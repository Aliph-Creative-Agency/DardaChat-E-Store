import { db } from "@/db/client";
import { ok, tokenFrom, withoutSessionCookie } from "@/modules/auth/http";
import { revokeSessionByToken } from "@/modules/auth/session";

/** POST /api/auth/staff/sign-out — revokes the staff session and clears the cookie (idempotent). */
export async function POST(req: Request) {
  const token = tokenFrom(req, "staff");
  if (token) await revokeSessionByToken(db, token);
  return withoutSessionCookie(ok(), "staff");
}
