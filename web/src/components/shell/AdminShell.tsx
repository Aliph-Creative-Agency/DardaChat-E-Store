import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ADMIN_NAV, filterNav, groupNav } from "@/lib/nav/admin-nav";
import type { ShellViewer } from "@/lib/shell/viewer";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { SkipLink } from "./SkipLink";
import { Wordmark } from "./Wordmark";

export type AdminShellProps = {
  /** From `getShellViewer()`; null renders the bare centred layout (sign-in, 2FA, no sidebar). */
  viewer: ShellViewer | null;
  children: ReactNode;
};

/**
 * Back-office chrome. Sidebar at the logical start (right in Arabic) from `lg` up; below that it becomes a drawer
 * opened from the top bar (UI-005). Owns `<main id="main">`, so admin pages render content only.
 * Display only: pages still call `requireStaff(permission)`.
 */
export function AdminShell({ viewer, children }: AdminShellProps) {
  const t = useTranslations("common.admin");

  if (!viewer) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
        <SkipLink />
        <Wordmark />
        <main id="main" tabIndex={-1} className="w-full max-w-md focus:outline-none">
          {children}
        </main>
      </div>
    );
  }

  const groups = groupNav(filterNav(ADMIN_NAV, viewer.permissions));

  return (
    <div className="flex min-h-dvh">
      <SkipLink />
      <aside
        className="sticky top-0 h-dvh w-68 shrink-0 overflow-y-auto border-e border-line bg-paper-deep max-lg:hidden"
        data-testid="admin-sidebar"
      >
        <div className="flex flex-col gap-6 px-3 py-5">
          <div className="flex flex-col gap-1 px-3">
            <Wordmark href="/admin" />
            <p className="text-sm font-semibold text-ink-soft">{t("backOffice")}</p>
          </div>
          <AdminSidebar groups={groups} idPrefix="sidebar" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar viewer={viewer} drawer={<AdminSidebar groups={groups} idPrefix="drawer" data-testid="admin-drawer-nav" />} />
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-8 focus:outline-none sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
