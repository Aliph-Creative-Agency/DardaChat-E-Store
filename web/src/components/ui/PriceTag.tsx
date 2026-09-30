import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/i18n/format";
import { isLocale } from "@/lib/i18n/routing";
import type { Agorot } from "@/lib/money";

export type PriceTagProps = {
  /** Current price, integer agorot. */
  amount: Agorot;
  /** Previous price (agorot). Shown struck through only when it is higher than `amount`. */
  compareAt?: Agorot | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "text-sm", md: "text-lg", lg: "text-2xl" } as const;

/**
 * A price in the visitor's locale via `formatMoney` (one ILS formatter for the whole app). A sale shows the old price
 * struck through; because `<s>` is silent in most screen readers, both prices carry sr-only "now"/"was" words.
 */
export function PriceTag({ amount, compareAt, size = "md", className }: PriceTagProps) {
  const current = useLocale();
  const locale = isLocale(current) ? current : "ar";
  const t = useTranslations("common.ui.price");
  const onSale = compareAt != null && compareAt > amount;

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 font-sans", className)} data-on-sale={onSale || undefined}>
      <span className={cn("font-semibold tabular-nums", sizes[size], onSale ? "text-brand" : "text-ink")}>
        {onSale ? <span className="sr-only">{t("now")} </span> : null}
        <span data-price="current">{formatMoney(amount, locale)}</span>
      </span>
      {onSale ? " " : null}
      {onSale ? (
        <s className="text-sm tabular-nums text-ink-soft">
          <span className="sr-only">{t("was")} </span>
          <span data-price="compare-at">{formatMoney(compareAt, locale)}</span>
        </s>
      ) : null}
    </span>
  );
}
