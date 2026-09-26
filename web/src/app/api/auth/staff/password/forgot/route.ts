import { z } from "zod";
import { db } from "@/db/client";
import { fail, metaOf, ok, readBody } from "@/modules/auth/http";
import { outboxResetLinkDelivery } from "@/modules/auth/otp-delivery";
import { requestPasswordReset } from "@/modules/auth/password-reset";

const Body = z.object({ email: z.string().max(320) });

/** POST /api/auth/staff/password/forgot — FR-ACC-006. Always `{ ok: true }` unless rate-limited. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const r = await requestPasswordReset(db, body.data.email, "staff", metaOf(req), {
    delivery: outboxResetLinkDelivery(db),
  });
  return r.ok ? ok() : fail(r);
}
