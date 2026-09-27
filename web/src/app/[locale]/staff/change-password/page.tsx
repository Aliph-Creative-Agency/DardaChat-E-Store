import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n-locales";
import { getCurrentStaff } from "@/modules/auth";
import { getPasswordMinLength } from "@/modules/auth/password-policy";
import { AuthShell } from "@/modules/auth/ui/shell";
import { ChangePasswordForm } from "@/modules/auth/ui/staff-forms";
import { staffNext, withNextParam } from "@/modules/auth/ui/staff-pages";
import { getTranslations } from "next-intl/server";

export default async function ChangePasswordPage({
  params,
  searchParams,
}: PageProps<"/[locale]/staff/change-password">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const next = staffNext(locale, await searchParams);
  const staff = await getCurrentStaff();
  if (!staff) redirect(withNextParam(`/${locale}/staff/sign-in`, `/${locale}/staff/change-password`));
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthShell title={t("staff.changePassword.title")}>
      {staff.mustChangePassword ? <p role="status">{t("staff.changePassword.mustChange")}</p> : null}
      <ChangePasswordForm next={next} minLength={await getPasswordMinLength(db, "staff")} />
    </AuthShell>
  );
}
