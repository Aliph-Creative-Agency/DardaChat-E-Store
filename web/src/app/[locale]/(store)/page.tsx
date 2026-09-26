import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { IconArrowForward } from "@/components/ui/icons";
import { routing } from "@/lib/i18n/routing";

/** Placeholder home (STOREFRONT replaces the content; the shell stays). */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("storefront.home");

  return (
    <section aria-labelledby="home-title" className="relative overflow-hidden">
      <div aria-hidden className="tatreez-field pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto flex w-full max-w-page flex-col items-start gap-6 px-4 py-16 sm:px-8 sm:py-24">
        <p className="rounded-pill bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-strong">{t("eyebrow")}</p>
        <h1 id="home-title" className="max-w-3xl font-display text-display text-ink">
          {t("title")}
        </h1>
        <p className="max-w-prose text-lg text-ink-soft">{t("lead")}</p>
        <div className="flex flex-wrap gap-3">
          <Button href="/products" size="lg" iconEnd={<IconArrowForward />}>
            {t("shop")}
          </Button>
          <Button href="/collections/ramadan" size="lg" variant="secondary">
            {t("ramadan")}
          </Button>
        </div>
        <p className="text-sm text-ink-soft">{t("note")}</p>
      </div>
    </section>
  );
}
