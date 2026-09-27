import type { Metadata } from "next";
import ar from "../../messages/ar/common.json";
import en from "../../messages/en/common.json";
import { fontVariables } from "@/lib/shell/fonts";
import "./globals.css";

/**
 * 404 for URLs that match no route at all, e.g. an unknown locale (`/xx/nope`), where no locale layout can render.
 * Enabled by `experimental.globalNotFound` in next.config.ts. Bilingual, Arabic first; links to both home pages.
 */
export const metadata: Metadata = {
  title: `${ar.errors.notFound.title} · ${en.errors.notFound.title}`,
  robots: { index: false },
};

export default function GlobalNotFound() {
  const copy = [
    { locale: "ar", dir: "rtl", m: ar.errors.notFound },
    { locale: "en", dir: "ltr", m: en.errors.notFound },
  ] as const;
  return (
    <html lang="ar" dir="rtl" className={fontVariables}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <main className="mx-auto flex max-w-xl flex-col gap-10 px-4 py-16">
          {copy.map(({ locale, dir, m }) => (
            <section key={locale} lang={locale} dir={dir} className="flex flex-col gap-3 text-start">
              <h1 className="font-display text-3xl text-ink">{m.title}</h1>
              <p className="text-lg text-ink-soft">{m.body}</p>
              <a
                href={`/${locale}`}
                className="inline-flex min-h-11 w-fit items-center rounded-control bg-brand px-5 font-semibold text-on-brand"
              >
                {m.home}
              </a>
            </section>
          ))}
        </main>
      </body>
    </html>
  );
}
