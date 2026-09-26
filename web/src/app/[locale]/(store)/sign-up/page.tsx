import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n-locales";
import { safeNext } from "@/modules/auth";
import { getPasswordMinLength } from "@/modules/auth/password-policy";
import { SignUpForm } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { authT } from "@/modules/auth/ui/t";

export default async function SignUpPage({ params, searchParams }: PageProps<"/[locale]/sign-up">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined) ?? `/${locale}/account`;
  const t = authT(locale);
  return (
    <AuthShell title={t("signUp.title")}>
      <SignUpForm locale={locale} next={next} minLength={await getPasswordMinLength(db, "customer")} />
      <p>
        {t("signUp.haveAccount")}{" "}
        <a className="underline" href={`/${locale}/sign-in`}>
          {t("signUp.signInLink")}
        </a>
      </p>
    </AuthShell>
  );
}
