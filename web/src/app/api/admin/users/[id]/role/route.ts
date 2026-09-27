import { z } from "zod";
import { db } from "@/db/client";
import { staffUserActionRoute } from "@/modules/auth/admin-users-route";
import { changeStaffRole } from "@/modules/auth/staff-users";

/** POST /api/admin/users/[id]/role `{ role }` — replace the user's role; effective on the next permission check. */
export const POST = staffUserActionRoute(
  (actor, id, meta, body) => changeStaffRole(db, actor, id, body.role, meta),
  z.object({ role: z.string().min(1).max(64) }),
);
