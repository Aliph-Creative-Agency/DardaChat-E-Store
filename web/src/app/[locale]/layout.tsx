import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale, localeDir } from "@/i18n-locales";
import "../globals.css";

export const metadata: Metadata = {
  title: "DardaChat",
  description: "DardaChat — دردشة",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={localeDir(locale)}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
