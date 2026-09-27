import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartButton } from "@/components/shell/CartButton";
import { SkipLink } from "@/components/shell/SkipLink";
import { StoreFooter } from "@/components/shell/StoreFooter";
import { StoreHeader } from "@/components/shell/StoreHeader";
import { Button } from "@/components/ui/Button";
import { routing } from "@/lib/i18n/routing";

/**
 * Storefront chrome: skip link, header, `<main id="main">`, footer. Pages inside `(store)` render their content only
 * (no `<main>` of their own). Slots are placeholders until STOREFRONT (cart) and ASSISTANT wire the real controls.
 */
export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common.shell");

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <StoreHeader
        cartSlot={<CartButton />}
        assistantSlot={
          <Button href="/faq" variant="ghost" size="sm" className="max-sm:hidden">
            {t("help")}
          </Button>
        }
      />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}
