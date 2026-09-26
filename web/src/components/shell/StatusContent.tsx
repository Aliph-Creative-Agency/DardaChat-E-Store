"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { IconCompass, IconWarning } from "@/components/ui/icons";
import { ltr } from "@/lib/i18n/bidi";
import { Wordmark } from "./Wordmark";

/**
 * Bodies of the 404 and error pages (copy in `common.errors.*`: what happened + what to do). They render no `<main>`:
 * inside the store layout the layout owns it; elsewhere wrap them in `BareFrame`.
 */

function StatusBlock({ icon, title, body, actions, children }: {
  icon: ReactNode;
  title: string;
  body: string;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-16 text-center sm:py-24">
      <span className="flex size-16 items-center justify-center rounded-pill bg-brand-soft text-brand">{icon}</span>
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{title}</h1>
      <p className="max-w-prose text-lg text-ink-soft">{body}</p>
      {children}
      <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>
    </section>
  );
}

export function NotFoundContent() {
  const t = useTranslations("common.errors.notFound");
  return (
    <StatusBlock
      icon={<IconCompass size={32} />}
      title={t("title")}
      body={t("body")}
      actions={
        <>
          <Button href="/">{t("home")}</Button>
          <Button href="/products" variant="secondary">
            {t("shop")}
          </Button>
        </>
      }
    />
  );
}

export function ErrorContent({ digest, retry }: { digest?: string; retry: () => void }) {
  const t = useTranslations("common.errors.error");
  return (
    <StatusBlock
      icon={<IconWarning size={32} />}
      title={t("title")}
      body={t("body")}
      actions={
        <>
          <Button onClick={() => retry()}>{t("retry")}</Button>
          <Button href="/" variant="secondary">
            {t("home")}
          </Button>
        </>
      }
    >
      {digest ? <p className="text-sm text-ink-soft">{t("reference", { digest: ltr(digest) })}</p> : null}
    </StatusBlock>
  );
}

/** Minimal page frame (wordmark + `<main>`) for status pages outside the store and admin layouts. */
export function BareFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 pt-10">
      <Wordmark />
      <main id="main" tabIndex={-1} className="w-full flex-1 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
