import { Link } from "@/lib/i18n/navigation";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n-locales";
import { ForgotForm } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { getTranslations } from "next-intl/server";

export default async function StaffForgotPasswordPage({ params }: PageProps<"/[locale]/staff/forgot-password">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthShell title={t("forgot.title")}>
      <p>{t("forgot.intro")}</p>
      <ForgotForm endpoint="/api/auth/staff/password/forgot" />
      <Link className="underline" href={`/staff/sign-in`}>
        {t("common.backToSignIn")}
      </Link>
    </AuthShell>
  );
}
