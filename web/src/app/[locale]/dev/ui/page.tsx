import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ltr } from "@/lib/i18n/bidi";
import { formatMoney } from "@/lib/i18n/format";
import { routing } from "@/lib/i18n/routing";
import { agorot } from "@/lib/money";
import { PrimitivesGallery } from "./Primitives";
import { GallerySection } from "./Section";

/** Design-system gallery (dev only): every token and component, in both locales. */

const SAMPLE_REF = "DC-7K3M-9QPT";

const SWATCHES: Array<{ group: string; tokens: string[] }> = [
  { group: "surface", tokens: ["paper", "paper-deep", "surface", "line", "line-strong"] },
  { group: "ink", tokens: ["ink", "ink-soft"] },
  { group: "brand", tokens: ["brand", "brand-strong", "brand-soft", "saffron", "olive"] },
  {
    group: "semantic",
    tokens: ["success", "success-soft", "warning", "warning-soft", "danger", "danger-soft", "info", "info-soft"],
  },
];

export default async function DesignSystemPage({ params }: PageProps<"/[locale]/dev/ui">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common.devUi");

  return (
    <main className="mx-auto w-full max-w-page px-4 pb-20 pt-10 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-brand">{t("eyebrow")}</p>
        <h1 className="text-4xl text-ink">{t("title")}</h1>
        <p className="max-w-prose text-ink-soft">{t("intro")}</p>
        <div aria-hidden className="stitch-rule mt-4" />
      </header>

      <GallerySection id="type" title={t("type.heading")}>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-card bg-surface p-6 shadow-card">
            <p className="text-xs font-medium text-ink-soft">{t("type.displayLabel")}</p>
            <p className="font-display text-display text-brand">{t("specimen.display")}</p>
            <p className="font-display text-3xl">{t("specimen.h1")}</p>
            <p className="font-display text-2xl">{t("specimen.h2")}</p>
            <p className="font-display text-xl">{t("specimen.h3")}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-card bg-surface p-6 shadow-card">
            <p className="text-xs font-medium text-ink-soft">{t("type.bodyLabel")}</p>
            <p className="text-lg">{t("specimen.body")}</p>
            <p lang="ar" dir="rtl" className="text-2xl">
              {t("specimen.diacritics")}
            </p>
            <p lang="en" dir="ltr" className="text-lg">
              {t("specimen.latin")}
            </p>
            <p className="text-xs font-medium text-ink-soft">{t("type.numeralsLabel")}</p>
            <p className="text-lg">
              {t("specimen.numerals", { price: ltr(formatMoney(agorot(11000), locale)), ref: ltr(SAMPLE_REF) })}
            </p>
          </div>
        </div>
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <GallerySection id="colour" title={t("colour.heading")} note={t("colour.note")}>
        <div className="flex flex-col gap-6">
          {SWATCHES.map(({ group, tokens }) => (
            <ul key={group} className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {tokens.map((token) => (
                <li key={token} className="overflow-hidden rounded-control bg-surface shadow-card">
                  <div className="h-16 border-b border-line" style={{ background: `var(--color-${token})` }} />
                  <p className="px-3 py-2 text-xs">
                    <span className="sr-only">{t("colour.tokenLabel")} </span>
                    <code dir="ltr" className="font-mono">
                      {token}
                    </code>
                  </p>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </GallerySection>

      <div aria-hidden className="stitch-rule-quiet" />

      <PrimitivesGallery />
    </main>
  );
}
