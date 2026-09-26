"use client";

import ar from "../../messages/ar/common.json";
import en from "../../messages/en/common.json";
import "./globals.css";

/**
 * Last-resort error page when the locale root layout itself fails: no layout, no next-intl provider, so it shows
 * both languages (Arabic first) straight from the message files and styles itself with the global tokens.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const copy = [
    { locale: "ar", dir: "rtl", m: ar.errors.error },
    { locale: "en", dir: "ltr", m: en.errors.error },
  ] as const;
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <title>{`${ar.errors.error.title} · ${en.errors.error.title}`}</title>
        <main className="mx-auto flex max-w-xl flex-col gap-10 px-4 py-16">
          {copy.map(({ locale, dir, m }) => (
            <section key={locale} lang={locale} dir={dir} className="flex flex-col gap-3 text-start">
              <h1 className="font-display text-3xl text-ink">{m.title}</h1>
              <p className="text-lg text-ink-soft">{m.body}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => retry()}
                  className="min-h-11 rounded-control bg-brand px-5 font-semibold text-on-brand"
                >
                  {m.retry}
                </button>
                <a href={`/${locale}`} className="inline-flex min-h-11 items-center px-2 font-semibold text-brand underline">
                  {m.home}
                </a>
              </div>
            </section>
          ))}
          {error.digest ? (
            <p dir="ltr" className="text-sm text-ink-soft">
              {en.errors.error.reference.replace("{digest}", error.digest)}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
