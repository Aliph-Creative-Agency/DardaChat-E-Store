import { db } from "@/db/client";
import { signOut } from "@/modules/auth/customer-auth";
import { ok, tokenFrom, withoutSessionCookie } from "@/modules/auth/http";

/** POST /api/auth/customer/sign-out — revokes the session and clears the cookie (idempotent). */
export async function POST(req: Request) {
  await signOut(db, tokenFrom(req, "customer"));
  return withoutSessionCookie(ok(), "customer");
}
