import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n-locales";
import { getPasswordMinLength } from "@/modules/auth/password-policy";
import { ResetForm } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { authT } from "@/modules/auth/ui/t";

export default async function StaffResetPasswordPage({
  params,
  searchParams,
}: PageProps<"/[locale]/staff/reset-password">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const t = authT(locale);
  return (
    <AuthShell title={t("reset.title")}>
      <ResetForm
        locale={locale}
        endpoint="/api/auth/staff/password/reset"
        token={typeof sp.token === "string" ? sp.token : ""}
        minLength={await getPasswordMinLength(db, "staff")}
        signInHref={`/${locale}/staff/sign-in`}
      />
    </AuthShell>
  );
}
