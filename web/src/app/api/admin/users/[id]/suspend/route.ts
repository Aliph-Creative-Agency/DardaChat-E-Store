import { db } from "@/db/client";
import { staffUserActionRoute } from "@/modules/auth/admin-users-route";
import { suspendStaffUser } from "@/modules/auth/staff-users";

/** POST /api/admin/users/[id]/suspend — Suspend: signs the user out everywhere at once (users.manage). */
export const POST = staffUserActionRoute((actor, id, meta) => suspendStaffUser(db, actor, id, meta));
