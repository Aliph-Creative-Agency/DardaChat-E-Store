"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { LOCALES, type Locale } from "@/lib/i18n/routing";
import { IconGlobe } from "./icons";

/**
 * Each language named in itself (endonym), so a visitor who cannot read the current UI still finds their own language.
 * These are data, not UI copy, and are identical in every locale.
 */
export const LOCALE_ENDONYM: Record<Locale, string> = { ar: "العربية", en: "English" };

export type LocaleSwitcherProps = {
  className?: string;
  /** `link` = quiet text link (footer), `pill` = bordered control (headers). */
  variant?: "link" | "pill";
};

type Query = Record<string, string | string[]>;

function toQuery(params: URLSearchParams | null): Query {
  const query: Query = {};
  params?.forEach((value, key) => {
    const prev = query[key];
    query[key] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
  });
  return query;
}

function Links({ query, className, variant = "pill" }: LocaleSwitcherProps & { query: Query }) {
  const current = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common.ui");
  const others = LOCALES.filter((l) => l !== current);
  return (
    <nav aria-label={t("language")} className={className}>
      <ul className="flex items-center gap-2">
        {others.map((locale) => (
          <li key={locale}>
            {/* `locale` makes next-intl's Link set NEXT_LOCALE on click and add hrefLang; SHL-12 adds the
                signed-in preference write. */}
            <Link
              href={{ pathname, query }}
              locale={locale}
              lang={locale}
              data-testid={`locale-switch-${locale}`}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-control font-semibold text-brand",
                variant === "pill"
                  ? "border border-line-strong bg-surface px-3 hover:border-brand hover:bg-brand-soft"
                  : "px-1 underline-offset-4 hover:underline",
              )}
            >
              <IconGlobe size={18} />
              <span>{LOCALE_ENDONYM[locale]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function WithQuery(props: LocaleSwitcherProps) {
  return <Links {...props} query={toQuery(useSearchParams())} />;
}

/**
 * Links to the same page in the other locale(s), keeping the query string (UI-003). `useSearchParams` needs a Suspense
 * boundary for static pages; until it resolves the links point at the bare path.
 */
export function LocaleSwitcher(props: LocaleSwitcherProps) {
  return (
    <Suspense fallback={<Links {...props} query={{}} />}>
      <WithQuery {...props} />
    </Suspense>
  );
}
