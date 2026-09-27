import { z } from "zod";
import { db } from "@/db/client";
import { registerCustomer } from "@/modules/auth/customer-auth";
import { fail, localeField, metaOf, ok, readBody, withSessionCookie } from "@/modules/auth/http";

const Body = z.object({
  email: z.string().max(320),
  password: z.string().max(1024),
  name: z.string().max(200).nullish(),
  locale: localeField,
});

/** POST /api/auth/customer/register — FR-ACC-001. Sets the customer session cookie. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const r = await registerCustomer(db, body.data, metaOf(req));
  if (!r.ok) return fail(r);
  return withSessionCookie(ok({ customerId: r.customerId }, 201), "customer", r.token);
}
