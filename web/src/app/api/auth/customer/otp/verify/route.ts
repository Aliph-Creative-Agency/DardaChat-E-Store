import { z } from "zod";
import { db } from "@/db/client";
import { signOut, verifyPhoneSignIn } from "@/modules/auth/customer-auth";
import { fail, localeField, metaOf, ok, readBody, tokenFrom, withSessionCookie } from "@/modules/auth/http";

const Body = z.object({ phone: z.string().max(64), code: z.string().max(32), locale: localeField });

/** POST /api/auth/customer/otp/verify — FR-ACC-002. First success creates the (password-less) account. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const { phone, code, locale } = body.data;
  const r = await verifyPhoneSignIn(db, phone, code, { ...metaOf(req), locale });
  if (!r.ok) return fail(r);
  await signOut(db, tokenFrom(req, "customer"));
  return withSessionCookie(ok({ customerId: r.customerId }), "customer", r.token);
}
