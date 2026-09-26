import { useLocale, useTranslations } from "next-intl";
import { IconCart } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/i18n/format";
import { Link } from "@/lib/i18n/navigation";
import { isLocale } from "@/lib/i18n/routing";

export type CartButtonProps = {
  /** Number of items; `undefined` while unknown (the storefront team wires the real cart). */
  count?: number;
  className?: string;
};

/** Header cart link with an item count. The count is part of the accessible name, not colour or position. */
export function CartButton({ count, className }: CartButtonProps) {
  const current = useLocale();
  const locale = isLocale(current) ? current : "ar";
  const t = useTranslations("common.nav");
  const hasItems = count !== undefined && count > 0;
  return (
    <Link
      href="/cart"
      data-testid="cart-button"
      className={cn(
        "relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control px-2 font-semibold text-ink hover:bg-paper-deep",
        className,
      )}
    >
      <IconCart size={22} />
      <span className="max-md:sr-only">{t("store.cart")}</span>
      {hasItems ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-pill bg-brand px-1.5 text-xs leading-5 text-on-brand tabular-nums">
          <span className="sr-only">{t("cartCount", { count: formatNumber(count, locale) })}</span>
          <span aria-hidden>{formatNumber(count, locale)}</span>
        </span>
      ) : null}
    </Link>
  );
}
