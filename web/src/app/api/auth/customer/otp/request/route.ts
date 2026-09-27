import { z } from "zod";
import { db } from "@/db/client";
import { requestPhoneSignIn } from "@/modules/auth/customer-auth";
import { fail, localeField, metaOf, ok, readBody } from "@/modules/auth/http";
import { outboxOtpDelivery } from "@/modules/auth/otp-delivery";

const Body = z.object({ phone: z.string().max(64), locale: localeField });

/** POST /api/auth/customer/otp/request — FR-ACC-002/003/004. Same answer whether or not the number has an account. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const r = await requestPhoneSignIn(db, body.data.phone, { ...metaOf(req), locale: body.data.locale }, {
    delivery: outboxOtpDelivery(db),
  });
  if (!r.ok) return fail(r);
  return ok({ expiresAt: r.expiresAt.toISOString() });
}
