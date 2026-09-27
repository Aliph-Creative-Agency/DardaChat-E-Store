import { db } from "@/db/client";
import { staffUserActionRoute } from "@/modules/auth/admin-users-route";
import { reinstateStaffUser } from "@/modules/auth/staff-users";

/** POST /api/admin/users/[id]/reinstate — Reinstate a suspended user (never a revoked one) (users.manage). */
export const POST = staffUserActionRoute((actor, id, meta) => reinstateStaffUser(db, actor, id, meta));
