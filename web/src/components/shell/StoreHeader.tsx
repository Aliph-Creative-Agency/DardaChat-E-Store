import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { IconUser } from "@/components/ui/icons";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { STORE_PRIMARY_NAV } from "@/lib/nav/store-nav";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";
import { Wordmark } from "./Wordmark";

export type StoreHeaderProps = {
  /** Cart control (STOREFRONT fills it; the layout passes a `<CartButton>` placeholder). */
  cartSlot?: ReactNode;
  /** Assistant entry point (ASSISTANT fills it). */
  assistantSlot?: ReactNode;
};

const desktopLink =
  "inline-flex min-h-11 items-center rounded-control px-3 font-semibold text-ink-soft transition-colors duration-fast " +
  "hover:bg-paper-deep hover:text-ink";
const desktopActive = "text-brand shadow-[inset_0_-2px_0_var(--color-brand)]";

/**
 * Storefront header: wordmark + main nav at the logical start (right in Arabic), utilities at the end.
 * Below `lg` the nav moves into the mobile menu.
 */
export function StoreHeader({ cartSlot, assistantSlot }: StoreHeaderProps) {
  const t = useTranslations("common");
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-page items-center gap-2 px-4 sm:px-8">
        <MobileMenu className="lg:hidden">
          <nav aria-label={t("shell.mainNav")} data-testid="mobile-nav">
            <ul className="flex flex-col gap-1">
              {STORE_PRIMARY_NAV.map((item) => (
                <li key={item.id}>
                  <NavLink
                    href={item.href}
                    className="flex min-h-12 items-center rounded-control px-3 text-lg font-semibold text-ink hover:bg-paper-deep"
                    activeClassName="bg-brand-soft text-brand-strong"
                  >
                    {t(`nav.store.${item.labelKey}`)}
                  </NavLink>
                </li>
              ))}
              <li>
                <NavLink
                  href="/account"
                  className="flex min-h-12 items-center gap-2 rounded-control px-3 text-lg font-semibold text-ink hover:bg-paper-deep"
                  activeClassName="bg-brand-soft text-brand-strong"
                >
                  <IconUser size={20} />
                  {t("nav.store.account")}
                </NavLink>
              </li>
            </ul>
          </nav>
          <div aria-hidden className="stitch-rule-quiet" />
          <LocaleSwitcher />
        </MobileMenu>

        <Wordmark className="shrink-0" />

        <nav aria-label={t("shell.mainNav")} className="max-lg:hidden" data-testid="main-nav">
          <ul className="flex items-center gap-1">
            {STORE_PRIMARY_NAV.map((item) => (
              <li key={item.id}>
                <NavLink href={item.href} className={desktopLink} activeClassName={desktopActive}>
                  {t(`nav.store.${item.labelKey}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-1">
          {assistantSlot}
          <LocaleSwitcher variant="link" className="max-lg:hidden" />
          <NavLink
            href="/account"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control px-2 font-semibold text-ink hover:bg-paper-deep max-lg:hidden"
            activeClassName="text-brand"
          >
            <IconUser size={22} />
            <span className="sr-only">{t("nav.store.account")}</span>
          </NavLink>
          {cartSlot}
        </div>
      </div>
    </header>
  );
}
