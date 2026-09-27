import { Link } from "@/lib/i18n/navigation";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n-locales";
import { safeNext } from "@/modules/auth";
import { SignInForms } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { getTranslations } from "next-intl/server";

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined) ?? `/${locale}/account`;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthShell title={t("signIn.title")}>
      <SignInForms locale={locale} next={next} />
      <p>
        {t("signIn.noAccount")}{" "}
        <Link className="underline" href={`/sign-up?next=${encodeURIComponent(next)}`}>
          {t("signIn.createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}
