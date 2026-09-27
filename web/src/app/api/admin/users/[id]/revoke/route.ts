import { db } from "@/db/client";
import { staffUserActionRoute } from "@/modules/auth/admin-users-route";
import { revokeStaffUser } from "@/modules/auth/staff-users";

/** POST /api/admin/users/[id]/revoke — Revoke permanently: sessions + authenticator removed; row and audit history kept (users.manage). */
export const POST = staffUserActionRoute((actor, id, meta) => revokeStaffUser(db, actor, id, meta));
