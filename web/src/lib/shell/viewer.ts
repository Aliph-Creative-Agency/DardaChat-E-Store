import "server-only";
import { db } from "@/db/client";
import { getCurrentCustomer, getCurrentStaff, permissionsOf } from "@/modules/auth";

/**
 * Shell seam: who is looking at the chrome. Layouts read identity ONLY through these two functions so the shell never
 * imports auth internals. They are display helpers, not authorisation: every admin page/handler still calls
 * `requireStaff(permission)` from `@/modules/auth`.
 *
 * Wired to auth at the platform merge (PLM-06): the viewer is the 2FA-complete staff session (`getCurrentStaff`, which
 * includes users who still must change their password — they count as signed in; guarded pages redirect them), and
 * the sidebar shows exactly the permissions their roles grant (`permissionsOf`, the same rule as `can()`).
 */

export type ShellRole = "owner" | "staff";

export type ShellViewer = {
  id: string;
  name: string;
  role: ShellRole;
  /** Permission keys granted to the viewer (auth registry); drives which sidebar items show. */
  permissions: readonly string[];
  /** True for a development stub viewer (none is used since the merge; kept for the topbar badge contract). */
  isDevStub?: boolean;
};

/** Signed-in subject whose locale preference is persisted (UI-003). */
export type ShellSubject = { type: "staff" | "customer"; id: string };

/** Display role: Owner if any of the user's roles is `owner`, otherwise Staff. */
export function shellRoleOf(roles: readonly string[]): ShellRole {
  return roles.includes("owner") ? "owner" : "staff";
}

/** Staff member viewing the back office, or null (no sidebar; sign-in and 2FA screens). */
export async function getShellViewer(): Promise<ShellViewer | null> {
  const staff = await getCurrentStaff();
  if (!staff) return null;
  return {
    id: staff.id,
    name: staff.name,
    role: shellRoleOf(staff.roles),
    permissions: await permissionsOf(db, staff.id),
  };
}

/** Signed-in staff member (preferred) or customer, or null for anonymous visitors. */
export async function getShellSubject(): Promise<ShellSubject | null> {
  const staff = await getCurrentStaff();
  if (staff) return { type: "staff", id: staff.id };
  const customer = await getCurrentCustomer();
  return customer ? { type: "customer", id: customer.id } : null;
}
