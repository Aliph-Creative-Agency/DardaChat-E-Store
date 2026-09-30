import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { Bdi } from "@/components/ui/Bdi";
import { Link } from "@/lib/i18n/navigation";
import { BrushStroke } from "@/lib/shell/BrushStroke";
import { BRAND_CONTACT, BRAND_MAILTO_HREF, BRAND_TEL_HREF, whatsappUrl } from "@/lib/shell/contact";
import { STORE_HEADER_NAV, STORE_POLICY_NAV, STORE_SECONDARY_NAV } from "@/lib/nav/store-nav";
import { Wordmark } from "./Wordmark";

const footerLink = "inline-flex min-h-11 items-center text-on-brand underline-offset-4 hover:text-pink hover:underline";

/** Storefront footer: brand line, shop links, policies, contact block, language switch. */
export function StoreFooter() {
  const t = useTranslations("common");
  const year = new Date().getUTCFullYear();
  return (
    <footer data-tone="brand" className="relative mt-16 overflow-hidden bg-brand text-on-brand">
      <BrushStroke aria-hidden className="absolute -bottom-10 -end-16 h-44 w-auto opacity-25" />
      <div className="relative mx-auto grid w-full max-w-page gap-10 px-4 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Wordmark stacked tone="onBrand" className="self-start" />
          <p className="max-w-xs text-sm text-on-brand/90">{t("footer.tagline")}</p>
        </div>

        <nav aria-labelledby="footer-shop" className="flex flex-col gap-2">
          <h2 id="footer-shop" className="font-sans text-lg font-semibold text-pink">
            {t("footer.shop")}
          </h2>
          <ul>
            {[...STORE_HEADER_NAV, ...STORE_SECONDARY_NAV].map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={footerLink}>
                  {t(`nav.store.${item.labelKey}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-policies" className="flex flex-col gap-2">
          <h2 id="footer-policies" className="font-sans text-lg font-semibold text-pink">
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
          <h2 className="font-sans text-lg font-semibold text-pink">{t("footer.contact")}</h2>
          <address className="flex flex-col text-sm not-italic text-on-brand">
            <p className="min-h-11 py-2.5 text-on-brand">{t("footer.address")}</p>
            <a href={BRAND_TEL_HREF} className={footerLink} aria-label={`${t("footer.phoneLabel")} ${BRAND_CONTACT.phoneDisplay}`}>
              <Bdi dir="ltr">{BRAND_CONTACT.phoneDisplay}</Bdi>
            </a>
            <a href={BRAND_MAILTO_HREF} className={footerLink} aria-label={`${t("footer.emailLabel")} ${BRAND_CONTACT.email}`}>
              <Bdi dir="ltr">{BRAND_CONTACT.email}</Bdi>
            </a>
            <a
              href={BRAND_CONTACT.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={footerLink}
              aria-label={`${t("footer.instagramLabel")} ${BRAND_CONTACT.instagramHandle}`}
            >
              <Bdi dir="ltr">{BRAND_CONTACT.instagramHandle}</Bdi>
            </a>
            <a
              href={whatsappUrl(t("footer.whatsappGreeting"))}
              target="_blank"
              rel="noopener noreferrer"
              className={footerLink}
            >
              {t("footer.whatsappCta")}
            </a>
          </address>
          <p className="text-sm text-on-brand">{t("footer.language")}</p>
          <LocaleSwitcher />
        </div>
      </div>
      <div className="relative border-t border-on-brand/25">
        <p className="mx-auto w-full max-w-page px-4 py-5 text-sm text-on-brand/90 sm:px-8">
          {t("footer.copyright", { year: String(year) })}
        </p>
      </div>
    </footer>
  );
}
