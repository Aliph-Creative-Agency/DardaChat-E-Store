import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { isLocale } from "@/i18n-locales";
import { requireStaff } from "@/modules/auth";
import { listAuditEntries } from "@/modules/auth/audit";
import { getStaffUser, listRoleKeys, listStaffUsers } from "@/modules/auth/staff-users";
import { formatDateTime, roleLabel, statusBadgeCls } from "@/modules/auth/ui/admin-format";
import { StaffUserActions } from "@/modules/auth/ui/admin-users";
import { authT } from "@/modules/auth/ui/t";

/** One back-office user: details, actions and that user's audit history (FR-ACC-011, FR-ACC-014). */
export default async function AdminUserPage({ params }: PageProps<"/[locale]/admin/users/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const staff = await requireStaff("users.manage", { locale, next: `/${locale}/admin/users/${id}` });
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await getStaffUser(db, id);
  if (!user) notFound();
  const t = authT(locale);
  const [roles, history, everyone] = await Promise.all([
    listRoleKeys(db),
    listAuditEntries(db, { targetId: id, limit: 200 }),
    listStaffUsers(db),
  ]);
  const nameOf = new Map(everyone.map((u) => [u.id, u.name]));
  const eventLabel = (action: string) => {
    const label = t(`staff.users.event.${action}`);
    return label === `staff.users.event.${action}` ? action : label;
  };
  const th = "px-3 py-2 text-start font-semibold";
  const td = "px-3 py-2 align-top";
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <Link className="underline" href={`/${locale}/admin/users`}>
        {t("staff.users.detail.back")}
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold">{user.name}</h1>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          <dt className="text-ink-soft">{t("staff.users.col.email")}</dt>
          <dd>
            <bdi dir="ltr">{user.email}</bdi>
          </dd>
          <dt className="text-ink-soft">{t("staff.users.col.role")}</dt>
          <dd>{user.roles.map((r) => roleLabel(t, r)).join(locale === "ar" ? "، " : ", ")}</dd>
          <dt className="text-ink-soft">{t("staff.users.col.status")}</dt>
          <dd>
            <span data-testid="staff-user-status" className={statusBadgeCls(user.status)}>
              {t(`staff.users.status.${user.status}`)}
            </span>
          </dd>
          <dt className="text-ink-soft">{t("staff.users.col.twoFactor")}</dt>
          <dd>{user.twoFactorEnabled ? t("staff.users.twoFactorOn") : t("staff.users.twoFactorOff")}</dd>
          <dt className="text-ink-soft">{t("staff.users.col.lastLogin")}</dt>
          <dd>{formatDateTime(locale, user.lastLoginAt) ?? t("staff.users.never")}</dd>
          <dt className="text-ink-soft">{t("staff.users.detail.created")}</dt>
          <dd>{formatDateTime(locale, user.createdAt)}</dd>
        </dl>
      </header>

      <StaffUserActions locale={locale} user={user} roles={roles} isSelf={user.id === staff.id} showRole />

      <section aria-labelledby="history-title" className="flex flex-col gap-3">
        <h2 id="history-title" className="text-lg font-semibold">
          {t("staff.users.detail.history")}
        </h2>
        {history.length === 0 ? (
          <p className="text-ink-soft">{t("staff.users.detail.noHistory")}</p>
        ) : (
          <div className="overflow-x-auto rounded-control border border-line-strong">
            <table className="w-full border-collapse text-sm" data-testid="audit-history">
              <thead className="border-b border-line-strong">
                <tr>
                  <th scope="col" className={th}>{t("staff.users.detail.when")}</th>
                  <th scope="col" className={th}>{t("staff.users.detail.event")}</th>
                  <th scope="col" className={th}>{t("staff.users.detail.actor")}</th>
                  <th scope="col" className={th}>{t("staff.users.detail.ip")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e) => (
                  <tr key={e.id} data-action={e.action} className="border-b border-line-strong last:border-b-0">
                    <td className={td}>{formatDateTime(locale, e.occurredAt)}</td>
                    <td className={td}>{eventLabel(e.action)}</td>
                    <td className={td}>{e.actorId ? (nameOf.get(e.actorId) ?? e.actorId) : t("staff.users.detail.system")}</td>
                    <td className={td}>
                      <bdi dir="ltr">{e.ip ?? "—"}</bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
