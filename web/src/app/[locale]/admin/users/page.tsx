import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n-locales";
import { requireStaff } from "@/modules/auth";
import { listRoleKeys, listStaffUsers } from "@/modules/auth/staff-users";
import { formatDateTime, roleLabel, statusBadgeCls } from "@/modules/auth/ui/admin-format";
import { CreateStaffUserForm, StaffUserActions } from "@/modules/auth/ui/admin-users";
import { SignOutButton } from "@/modules/auth/ui/forms";
import { authT } from "@/modules/auth/ui/t";

/** Back-office Users (FR-ACC-013/014): list, status, create, suspend/reinstate/revoke/reset 2FA. W3's admin layout wraps it. */
export default async function AdminUsersPage({ params }: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const staff = await requireStaff("users.manage", { locale, next: `/${locale}/admin/users` });
  const t = authT(locale);
  const [users, roles] = await Promise.all([listStaffUsers(db), listRoleKeys(db)]);
  const th = "px-3 py-2 text-start font-semibold";
  const td = "px-3 py-2 align-top";
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold">{t("staff.users.title")}</h1>
          <p className="text-ink-soft">{t("staff.users.intro")}</p>
        </div>
        <div className="flex items-center gap-3">
          <p data-testid="staff-identity" className="text-sm text-ink-soft">
            {t("staff.signedInAs", { name: staff.name })}
          </p>
          <SignOutButton locale={locale} endpoint="/api/auth/staff/sign-out" redirectTo={`/${locale}/staff/sign-in`} />
        </div>
      </header>

      <div className="overflow-x-auto rounded-control border border-line-strong">
        <table className="w-full border-collapse text-sm">
          <caption className="px-3 py-2 text-start text-ink-soft">{t("staff.users.count", { count: users.length })}</caption>
          <thead className="border-b border-line-strong">
            <tr>
              <th scope="col" className={th}>{t("staff.users.col.name")}</th>
              <th scope="col" className={th}>{t("staff.users.col.email")}</th>
              <th scope="col" className={th}>{t("staff.users.col.role")}</th>
              <th scope="col" className={th}>{t("staff.users.col.status")}</th>
              <th scope="col" className={th}>{t("staff.users.col.twoFactor")}</th>
              <th scope="col" className={th}>{t("staff.users.col.lastLogin")}</th>
              <th scope="col" className={th}>{t("staff.users.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} data-testid="staff-user-row" data-email={u.email} className="border-b border-line-strong last:border-b-0">
                <td className={td}>
                  <Link className="font-medium underline" href={`/${locale}/admin/users/${u.id}`}>
                    {u.name}
                  </Link>
                  {u.id === staff.id ? <span className="ms-1 text-ink-soft">{t("staff.users.you")}</span> : null}
                  {u.mustChangePassword && u.status !== "revoked" ? (
                    <p className="text-ink-soft">{t("staff.users.mustChange")}</p>
                  ) : null}
                </td>
                <td className={td}>
                  <bdi dir="ltr">{u.email}</bdi>
                </td>
                <td className={td}>{u.roles.map((r) => roleLabel(t, r)).join(locale === "ar" ? "، " : ", ")}</td>
                <td className={td}>
                  <span data-testid="staff-user-status" className={statusBadgeCls(u.status)}>
                    {t(`staff.users.status.${u.status}`)}
                  </span>
                </td>
                <td className={td}>{u.twoFactorEnabled ? t("staff.users.twoFactorOn") : t("staff.users.twoFactorOff")}</td>
                <td className={td}>{formatDateTime(locale, u.lastLoginAt) ?? t("staff.users.never")}</td>
                <td className={td}>
                  <StaffUserActions locale={locale} user={u} roles={roles} isSelf={u.id === staff.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateStaffUserForm locale={locale} roles={roles} />
    </main>
  );
}
