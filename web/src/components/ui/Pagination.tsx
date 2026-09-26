import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/i18n/format";
import { Link } from "@/lib/i18n/navigation";
import { isLocale } from "@/lib/i18n/routing";
import { IconChevronBack, IconChevronForward } from "./icons";

export type PaginationProps = {
  /** 1-based current page. */
  page: number;
  pageCount: number;
  /** Path without the locale prefix, e.g. "/products". */
  pathname: string;
  /** Other query params to keep (filters, sort). */
  query?: Record<string, string | undefined>;
  /** Query param carrying the page number. Page 1 omits it (canonical URL). */
  param?: string;
  className?: string;
};

type Slot = number | "gap";

/** First, last, current ±1, with gaps: 1 … 4 5 6 … 12. */
export function pageWindow(page: number, pageCount: number): Slot[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => wanted.add(n));
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((n) => wanted.add(n));
  const sorted = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: Slot[] = [];
  sorted.forEach((n, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && n - prev > 1) out.push(n - prev === 2 ? n - 1 : "gap");
    out.push(n);
  });
  return out;
}

export function pageHref(pathname: string, page: number, query: PaginationProps["query"] = {}, param = "page"): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && k !== param) params.set(k, v);
  if (page > 1) params.set(param, String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const item =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-control px-3 text-sm font-semibold tabular-nums";

/**
 * Page links for lists (UI-004): a labelled `nav`, locale-aware links, `aria-current="page"`, chevrons that mirror
 * in RTL, and a visible "page x of y" status. Server-renderable; the page reads `?page=` itself.
 */
export function Pagination({ page, pageCount, pathname, query, param = "page", className }: PaginationProps) {
  const current = useLocale();
  const locale = isLocale(current) ? current : "ar";
  const t = useTranslations("common.ui.pagination");
  if (pageCount <= 1) return null;
  const clamped = Math.min(Math.max(1, Math.trunc(page)), pageCount);
  const n = (value: number) => formatNumber(value, locale);
  const href = (p: number) => pageHref(pathname, p, query, param);

  const prev = clamped > 1 ? clamped - 1 : null;
  const next = clamped < pageCount ? clamped + 1 : null;
  const edge = (target: number | null, rel: "prev" | "next") => {
    const label = t(rel === "prev" ? "previous" : "next");
    const icon = rel === "prev" ? <IconChevronBack size={18} /> : <IconChevronForward size={18} />;
    const content = (
      <>
        {rel === "prev" ? icon : null}
        <span className="max-sm:sr-only">{label}</span>
        {rel === "next" ? icon : null}
      </>
    );
    return target === null ? (
      <span aria-disabled="true" className={cn(item, "text-ink-soft opacity-60")}>
        {content}
      </span>
    ) : (
      <Link href={href(target)} rel={rel} className={cn(item, "text-brand hover:bg-brand-soft")}>
        {content}
      </Link>
    );
  };

  return (
    <nav aria-label={t("label")} className={cn("flex flex-col items-center gap-2", className)}>
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>{edge(prev, "prev")}</li>
        {pageWindow(clamped, pageCount).map((slot, i) =>
          slot === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className={cn(item, "min-w-6 px-0 text-ink-soft")}>
              …
            </li>
          ) : (
            <li key={slot}>
              <Link
                href={href(slot)}
                aria-label={t("page", { page: n(slot) })}
                aria-current={slot === clamped ? "page" : undefined}
                className={cn(
                  item,
                  slot === clamped ? "bg-brand text-on-brand" : "text-ink hover:bg-paper-deep",
                )}
              >
                {n(slot)}
              </Link>
            </li>
          ),
        )}
        <li>{edge(next, "next")}</li>
      </ul>
      <p className="text-sm text-ink-soft">{t("status", { page: n(clamped), count: n(pageCount) })}</p>
    </nav>
  );
}
