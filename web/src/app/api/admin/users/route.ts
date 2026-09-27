import { z } from "zod";
import { db } from "@/db/client";
import { staffRoute } from "@/modules/auth";
import { fail, ok, readBody } from "@/modules/auth/http";
import { createStaffUser, listStaffUsers } from "@/modules/auth/staff-users";

/** GET /api/admin/users — back-office users (FR-ACC-013). Owner only via `users.manage`. */
export const GET = staffRoute("users.manage", async () => Response.json({ users: await listStaffUsers(db) }));

const Body = z.object({
  email: z.string().trim().min(3).max(320),
  name: z.string().trim().min(1).max(120),
  role: z.string().min(1).max(64),
  password: z.string().max(256).optional().nullable(),
});

/**
 * POST /api/admin/users — create a back-office user (FR-ACC-013). Without `password` a temporary one is generated
 * and returned ONCE in the response; the user must change it after the first sign-in.
 */
export const POST = staffRoute("users.manage", async (req, { staff, ip }) => {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const r = await createStaffUser(db, { id: staff.id }, body.data, { ip });
  if (!r.ok) return fail(r);
  return ok({ id: r.id, ...(r.tempPassword ? { tempPassword: r.tempPassword } : {}) }, 201);
});
