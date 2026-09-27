import "server-only";
import { ADMIN_NAV_PERMISSIONS } from "@/lib/nav/admin-nav";

/**
 * Shell seam: who is looking at the chrome. Layouts read identity ONLY through these two functions so the shell never
 * imports auth internals. They are display helpers, not authorisation: every admin page/handler still calls
 * `requireStaff(permission)` from `@/modules/auth`.
 *
 * STUB (Phase 0, lane shell): returns a development Owner outside production and null in production. The platform
 * leader wires both functions to auth's session (`getCurrentStaff` / `getCurrentCustomer`) at merge.
 */

export type ShellRole = "owner" | "staff";

export type ShellViewer = {
  id: string;
  name: string;
  role: ShellRole;
  /** Permission keys granted to the viewer (auth registry); drives which sidebar items show. */
  permissions: readonly string[];
  /** True for the development stub, so the topbar can say so. */
  isDevStub?: boolean;
};

/** Signed-in subject whose locale preference is persisted (UI-003). */
export type ShellSubject = { type: "staff" | "customer"; id: string };

const DEV_OWNER: ShellViewer = {
  id: "dev-owner",
  name: "Owner",
  role: "owner",
  permissions: ADMIN_NAV_PERMISSIONS,
  isDevStub: true,
};

/** Staff member viewing the back office, or null (no sidebar; sign-in and 2FA screens). */
export async function getShellViewer(): Promise<ShellViewer | null> {
  if (process.env.NODE_ENV === "production") return null;
  return DEV_OWNER;
}

/** Signed-in staff member or customer, or null for anonymous visitors. Stub: always null until wired to auth. */
export async function getShellSubject(): Promise<ShellSubject | null> {
  return null;
}
