import { db } from "@/db/client";
import { staffRoute } from "@/modules/auth";
import { listStaffUsers } from "@/modules/auth/staff-users";

/** GET /api/admin/users — back-office users (FR-ACC-013). Owner only via `users.manage`. */
export const GET = staffRoute("users.manage", async () => Response.json({ users: await listStaffUsers(db) }));
