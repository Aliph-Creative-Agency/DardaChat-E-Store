import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Link } from "@/lib/i18n/navigation";
import { BrandMark } from "@/lib/shell/BrandMark";

/**
 * Brand lockup as a home link: finger-heart mark + the name in the current locale (Arabic «دردشات», Latin
 * "Dardachat"). `stacked` puts the mark above the Arabic name with the thin Latin name underneath, like the logo
 * banner. Text + inline SVG, so it stays crisp at any size (the raster logo in /brand is a placeholder).
 */
export function Wordmark({
  className,
  href = "/",
  stacked = false,
  tone = "default",
}: {
  className?: string;
  href?: string;
  stacked?: boolean;
  /** `onBrand`: cream lettering for use on the blue footer. */
  tone?: "default" | "onBrand";
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  return (
    <Link
      href={href}
      className={cn(
        "rounded-control font-display leading-none",
        tone === "onBrand" ? "text-on-brand" : "text-brand",
        stacked
          ? "inline-flex flex-col items-center gap-1 py-1 text-3xl"
          : "inline-flex min-h-11 items-center gap-2 text-2xl",
        className,
      )}
    >
      <BrandMark className={stacked ? "h-12 w-10" : "h-9 w-[30px]"} />
      <span>{t("meta.title")}</span>
      {stacked && locale !== "en" ? (
        <span aria-hidden className="font-sans text-sm font-light tracking-[0.2em]" dir="ltr">
          {t("brand.nameEn")}
        </span>
      ) : null}
    </Link>
  );
}
