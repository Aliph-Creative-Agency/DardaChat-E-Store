import { notFound } from "next/navigation";
import { isLocale } from "@/i18n-locales";
import { safeNext } from "@/modules/auth";
import { SignInForms } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { authT } from "@/modules/auth/ui/t";

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined) ?? `/${locale}/account`;
  const t = authT(locale);
  return (
    <AuthShell title={t("signIn.title")}>
      <SignInForms locale={locale} next={next} />
      <p>
        {t("signIn.noAccount")}{" "}
        <a className="underline" href={`/${locale}/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {t("signIn.createAccount")}
        </a>
      </p>
    </AuthShell>
  );
}
