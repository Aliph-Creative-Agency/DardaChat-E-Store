import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { Link } from "@/lib/i18n/navigation";
import { STORE_POLICY_NAV, STORE_PRIMARY_NAV } from "@/lib/nav/store-nav";
import { Wordmark } from "./Wordmark";

const footerLink = "inline-flex min-h-11 items-center text-ink-soft underline-offset-4 hover:text-brand hover:underline";

/** Storefront footer: brand line, shop links, policies, contact placeholder, language switch. */
export function StoreFooter() {
  const t = useTranslations("common");
  const year = new Date().getUTCFullYear();
  return (
    <footer className="mt-16 border-t border-line bg-paper-deep">
      <div aria-hidden className="stitch-rule" />
      <div className="mx-auto grid w-full max-w-page gap-10 px-4 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Wordmark />
          <p className="max-w-xs text-sm text-ink-soft">{t("footer.tagline")}</p>
        </div>

        <nav aria-labelledby="footer-shop" className="flex flex-col gap-2">
          <h2 id="footer-shop" className="font-display text-lg text-ink">
            {t("footer.shop")}
          </h2>
          <ul>
            {STORE_PRIMARY_NAV.filter((i) => i.id !== "home").map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={footerLink}>
                  {t(`nav.store.${item.labelKey}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-policies" className="flex flex-col gap-2">
          <h2 id="footer-policies" className="font-display text-lg text-ink">
            {t("footer.policies")}
          </h2>
          <ul>
            {STORE_POLICY_NAV.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={footerLink}>
                  {t(`nav.footer.${item.labelKey}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-ink">{t("footer.contact")}</h2>
          <p className="text-sm text-ink-soft">{t("footer.contactSoon")}</p>
          <p className="text-sm text-ink-soft">{t("footer.language")}</p>
          <LocaleSwitcher />
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-page px-4 py-5 text-sm text-ink-soft sm:px-8">
          {t("footer.copyright", { year: String(year) })}
        </p>
      </div>
    </footer>
  );
}
