import { Link } from "@/lib/i18n/navigation";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n-locales";
import { safeNext } from "@/modules/auth";
import { getPasswordMinLength } from "@/modules/auth/password-policy";
import { SignUpForm } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { getTranslations } from "next-intl/server";

export default async function SignUpPage({ params, searchParams }: PageProps<"/[locale]/sign-up">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined) ?? `/${locale}/account`;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthShell title={t("signUp.title")}>
      <SignUpForm locale={locale} next={next} minLength={await getPasswordMinLength(db, "customer")} />
      <p>
        {t("signUp.haveAccount")}{" "}
        <Link className="underline" href={`/sign-in`}>
          {t("signUp.signInLink")}
        </Link>
      </p>
    </AuthShell>
  );
}
