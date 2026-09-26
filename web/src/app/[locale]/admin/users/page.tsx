import { notFound } from "next/navigation";
import { isLocale } from "@/i18n-locales";
import { requireStaff } from "@/modules/auth";
import { SignOutButton } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { authT } from "@/modules/auth/ui/t";

/** Back-office Users (FR-ACC-013/014). PLA-A17 fills in the table and actions; W3's admin layout wraps it. */
export default async function AdminUsersPage({ params }: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const staff = await requireStaff("users.manage", { locale, next: `/${locale}/admin/users` });
  const t = authT(locale);
  return (
    <AuthShell title={t("staff.users.title")}>
      <p data-testid="staff-identity">{t("staff.signedInAs", { name: staff.name })}</p>
      <SignOutButton locale={locale} endpoint="/api/auth/staff/sign-out" redirectTo={`/${locale}/staff/sign-in`} />
    </AuthShell>
  );
}
