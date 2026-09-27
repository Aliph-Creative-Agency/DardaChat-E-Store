import { db } from "@/db/client";
import { staffUserActionRoute } from "@/modules/auth/admin-users-route";
import { resetStaffTwoFactor } from "@/modules/auth/staff-users";

/** POST /api/admin/users/[id]/reset-2fa — Forget the user's authenticator; the next sign-in forces a fresh enrolment (users.manage). */
export const POST = staffUserActionRoute((actor, id, meta) => resetStaffTwoFactor(db, actor, id, meta));
