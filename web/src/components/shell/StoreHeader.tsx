import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { IconSearch, IconUser } from "@/components/ui/icons";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { STORE_HEADER_NAV, STORE_PRIMARY_NAV } from "@/lib/nav/store-nav";
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
  "inline-flex min-h-11 items-center whitespace-nowrap rounded-control px-2 text-[0.95rem] font-semibold text-ink transition-colors duration-fast " +
  "hover:bg-paper-deep hover:text-brand";
const desktopActive = "bg-brand-soft text-brand-strong hover:bg-brand-soft";

/**
 * Storefront header: wordmark + main nav at the logical start (right in Arabic), utilities at the end.
 * Below `xl` the nav moves into the mobile menu.
 */
export function StoreHeader({ cartSlot, assistantSlot }: StoreHeaderProps) {
  const t = useTranslations("common");
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-page items-center gap-2 px-4 sm:px-8 xl:max-w-[88rem]">
        <MobileMenu className="xl:hidden">
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

        <nav aria-label={t("shell.mainNav")} className="min-w-0 max-xl:hidden" data-testid="main-nav">
          <ul className="flex items-center gap-1">
            {STORE_HEADER_NAV.map((item) => (
              <li key={item.id}>
                <NavLink href={item.href} className={desktopLink} activeClassName={desktopActive}>
                  {t(`nav.store.${item.labelKey}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-1 whitespace-nowrap">
          {assistantSlot}
          <NavLink
            href="/search"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-ink hover:bg-paper-deep hover:text-brand"
            activeClassName="text-brand"
          >
            <IconSearch size={22} />
            <span className="sr-only">{t("nav.store.search")}</span>
          </NavLink>
          <LocaleSwitcher variant="link" className="max-xl:hidden" />
          <NavLink
            href="/account"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control px-2 font-semibold text-ink hover:bg-paper-deep max-xl:hidden"
            activeClassName="text-brand"
          >
            <IconUser size={22} />
            <span className="sr-only">{t("nav.store.account")}</span>
          </NavLink>
          {cartSlot}
        </div>
      </div>
      <div aria-hidden className="stitch-rule -mb-1.5" />
    </header>
  );
}
