import { useTranslations } from "next-intl";

/** First focusable element on every page: jumps past the header to `#main` (WCAG 2.4.1). */
export function SkipLink({ targetId = "main" }: { targetId?: string }) {
  const t = useTranslations("common.shell");
  return (
    <a
      href={`#${targetId}`}
      className="sr-only z-50 rounded-control bg-brand px-4 py-3 font-semibold text-on-brand shadow-lift focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
    >
      {t("skipToContent")}
    </a>
  );
}
