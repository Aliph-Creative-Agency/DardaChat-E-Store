import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Link } from "@/lib/i18n/navigation";

/** Cross-stitch diamond (tatreez) used as the brand mark. Decorative. */
function StitchMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" />
      <path d="m9.5 9.5 5 5m0-5-5 5" />
    </svg>
  );
}

/** Brand name as a home link. The visible name is the link text (the store name in the current locale). */
export function Wordmark({ className }: { className?: string }) {
  const t = useTranslations("common.meta");
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-control font-display text-2xl leading-none text-brand",
        className,
      )}
    >
      <StitchMark className="size-7 text-saffron" />
      <span>{t("title")}</span>
    </Link>
  );
}
