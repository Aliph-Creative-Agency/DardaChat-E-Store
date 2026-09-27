import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SkipLink } from "@/components/shell/SkipLink";
import { Wordmark } from "@/components/shell/Wordmark";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { routing } from "@/lib/i18n/routing";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/staff">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "common.admin" });
  return { title: { default: t("backOffice"), template: `%s · ${t("backOffice")}` }, robots: { index: false, follow: false } };
}

/**
 * Minimal centred chrome for the staff auth screens (`/staff/sign-in`, 2FA, password change/reset, forbidden):
 * wordmark + language switch, no admin sidebar (the viewer may not be signed in yet). Pages render content only.
 */
export default async function StaffAuthLayout({ children, params }: LayoutProps<"/[locale]/staff">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 bg-paper px-4 py-10">
      <SkipLink />
      <header className="flex w-full max-w-md items-center justify-between gap-4">
        <Wordmark />
        <LocaleSwitcher variant="link" />
      </header>
      <main id="main" tabIndex={-1} className="w-full max-w-md focus:outline-none">
        {children}
      </main>
    </div>
  );
}
