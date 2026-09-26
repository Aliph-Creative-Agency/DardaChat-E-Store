import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n-locales";
import { getPasswordMinLength } from "@/modules/auth/password-policy";
import { ResetForm } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { authT } from "@/modules/auth/ui/t";

export default async function ResetPasswordPage({ params, searchParams }: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const t = authT(locale);
  return (
    <AuthShell title={t("reset.title")}>
      <ResetForm
        locale={locale}
        endpoint="/api/auth/customer/password/reset"
        token={typeof sp.token === "string" ? sp.token : ""}
        minLength={await getPasswordMinLength(db, "customer")}
        signInHref={`/${locale}/sign-in`}
      />
    </AuthShell>
  );
}
