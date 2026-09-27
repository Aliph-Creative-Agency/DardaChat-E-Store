import { z } from "zod";
import { db } from "@/db/client";
import { signInCustomer, signOut } from "@/modules/auth/customer-auth";
import { fail, metaOf, ok, readBody, tokenFrom, withSessionCookie } from "@/modules/auth/http";

const Body = z.object({ email: z.string().max(320), password: z.string().max(1024) });

/** POST /api/auth/customer/sign-in — FR-ACC-001/005. A previous session cookie is revoked (no fixation). */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const r = await signInCustomer(db, body.data, metaOf(req));
  if (!r.ok) return fail(r);
  await signOut(db, tokenFrom(req, "customer"));
  return withSessionCookie(ok({ customerId: r.customerId }), "customer", r.token);
}
