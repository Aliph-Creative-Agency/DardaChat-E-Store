import { notFound } from "next/navigation";
import { isLocale } from "@/i18n-locales";
import { ForgotForm } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { authT } from "@/modules/auth/ui/t";

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = authT(locale);
  return (
    <AuthShell title={t("forgot.title")}>
      <p>{t("forgot.intro")}</p>
      <ForgotForm locale={locale} endpoint="/api/auth/customer/password/forgot" />
      <a className="underline" href={`/${locale}/sign-in`}>
        {t("common.backToSignIn")}
      </a>
    </AuthShell>
  );
}
