import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, Pagination, PriceTag, Skeleton, Table, pageHref, pageWindow } from "@/components/ui";
import { agorot, formatMoney } from "@/lib/money";
import arCommon from "../../../messages/ar/common.json";
import enCommon from "../../../messages/en/common.json";

// Same stand-in for the locale-aware Link as primitives.test.tsx (next-intl navigation cannot load in plain Node).
vi.mock("@/lib/i18n/navigation", async () => {
  const { useLocale } = await import("next-intl");
  function Link({ href, ...rest }: { href: string } & Record<string, unknown>) {
    const locale = useLocale();
    return <a href={`/${locale}${href}`} {...rest} />;
  }
  return { Link };
});

const MESSAGES = { ar: { common: arCommon }, en: { common: enCommon } } as const;

function render(el: ReactElement, locale: "ar" | "en" = "ar"): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Jerusalem">
      {el}
    </NextIntlClientProvider>,
  );
}

/** Text content with tags stripped (sr-only text included, which is what a screen reader hears). */
function text(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/[ \t\r\n]+/g, " ").trim(); // keep Intl's NBSPs
}

describe("PriceTag", () => {
  it("formats agorot with the shared money formatter in both locales", () => {
    for (const locale of ["ar", "en"] as const) {
      const html = render(<PriceTag amount={agorot(11000)} />, locale);
      expect(html).toContain(formatMoney(agorot(11000), locale));
      expect(html).not.toMatch(/<s[ >]/);
      expect(html).not.toContain("sr-only");
    }
  });

  it("a sale strikes the old price and names both prices for screen readers", () => {
    const en = render(<PriceTag amount={agorot(8950)} compareAt={agorot(11000)} />, "en");
    expect(en).toMatch(/<s\b[^>]*>.*₪110\.00.*<\/s>/);
    expect(text(en)).toBe("Now ₪89.50 Was ₪110.00");
    expect(en).toContain('data-on-sale="true"');

    const ar = render(<PriceTag amount={agorot(8950)} compareAt={agorot(11000)} />, "ar");
    expect(text(ar)).toContain(`${arCommon.ui.price.now} ${formatMoney(agorot(8950), "ar")}`);
    expect(text(ar)).toContain(`${arCommon.ui.price.was} ${formatMoney(agorot(11000), "ar")}`);
    expect(ar).not.toMatch(/[٠-٩]/); // Latin digits (DECISIONS)
  });

  it("ignores a compare-at price that is not higher", () => {
    const html = render(<PriceTag amount={agorot(11000)} compareAt={agorot(11000)} />, "en");
    expect(html).not.toMatch(/<s[ >]/);
  });
});

describe("Pagination", () => {
  it("windows long page lists around the current page", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(5, 12)).toEqual([1, "gap", 4, 5, 6, "gap", 12]);
    expect(pageWindow(1, 12)).toEqual([1, 2, 3, 4, "gap", 12]);
    expect(pageWindow(12, 12)).toEqual([1, "gap", 9, 10, 11, 12]);
    expect(pageWindow(4, 12)).toEqual([1, 2, 3, 4, 5, "gap", 12]);
  });

  it("keeps other query params and drops the param on page 1", () => {
    expect(pageHref("/products", 1, { sort: "new", page: "4" })).toBe("/products?sort=new");
    expect(pageHref("/products", 3, { sort: "new" })).toBe("/products?sort=new&page=3");
    expect(pageHref("/products", 2, {}, "p")).toBe("/products?p=2");
  });

  it("renders a labelled nav with aria-current, localized links, rel prev/next and page x of y", () => {
    const html = render(<Pagination page={5} pageCount={12} pathname="/products" query={{ sort: "new" }} />, "en");
    expect(html).toMatch(/^<nav aria-label="Pagination"/);
    const current = html.match(/<a [^>]*aria-current="page"[^>]*>/g) ?? [];
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/en/products?sort=new&amp;page=5"');
    expect(current[0]).toContain('aria-label="Page 5"');
    expect(html).toMatch(/<a [^>]*href="\/en\/products\?sort=new&amp;page=4"[^>]*rel="prev"/);
    expect(html).toMatch(/<a [^>]*href="\/en\/products\?sort=new&amp;page=6"[^>]*rel="next"/);
    expect(html).toContain("Page 5 of 12");
    // chevrons are the directional (mirrored) icons
    expect(html.match(/rtl:-scale-x-100/g)).toHaveLength(2);
  });

  it("disables the edge link on the first page and uses Arabic copy in ar", () => {
    const html = render(<Pagination page={1} pageCount={3} pathname="/products" />, "ar");
    expect(html).toContain(`aria-label="${arCommon.ui.pagination.label}"`);
    expect(html).toMatch(/<span aria-disabled="true"[^>]*>.*السابقة/);
    expect(html).toContain('href="/ar/products"'); // page 1 has no ?page
    expect(html).toContain("الصفحة 1 من 3");
    expect(html).not.toContain('rel="prev"');
  });

  it("renders nothing for a single page and clamps out-of-range pages", () => {
    expect(render(<Pagination page={1} pageCount={1} pathname="/p" />)).toBe("");
    const html = render(<Pagination page={99} pageCount={3} pathname="/p" />, "en");
    expect(html).toContain("Page 3 of 3");
  });
});

describe("Table, EmptyState, Skeleton", () => {
  const rows = [{ ref: "DC-1", total: 100 }];
  const columns = [
    { id: "ref", header: "Ref", rowHeader: true, cell: (r: (typeof rows)[number]) => r.ref },
    { id: "total", header: "Total", numeric: true, cell: (r: (typeof rows)[number]) => r.total },
  ];

  it("table: captioned scroll region, scoped headers, end-aligned numeric column", () => {
    const html = render(<Table caption="Orders" columns={columns} rows={rows} rowKey={(r) => r.ref} />);
    const captionId = /<caption id="([^"]+)"/.exec(html)?.[1];
    expect(captionId).toBeTruthy();
    expect(html).toMatch(new RegExp(`<div role="region" aria-labelledby="${captionId}" tabindex="0"[^>]*overflow-x-auto`));
    expect(html.match(/<th scope="col"/g)).toHaveLength(2);
    expect(html).toMatch(/<th scope="row"[^>]*>DC-1<\/th>/);
    expect(html).toMatch(/<td class="[^"]*text-end[^"]*tabular-nums[^"]*">100<\/td>/);
  });

  it("table shows the empty slot when there are no rows", () => {
    const html = render(
      <Table caption="Orders" columns={columns} rows={[]} rowKey={(r) => r.ref} empty={<EmptyState title="None" />} />,
    );
    expect(html).toContain(`colSpan="2"`);
    expect(html).toContain("<h2");
  });

  it("skeleton announces loading once and keeps shapes decorative", () => {
    const html = render(<Skeleton lines={2} />, "en");
    expect(html).toMatch(/^<div role="status" aria-busy="true" aria-live="polite"/);
    expect(text(html)).toBe("Loading…");
    expect(html.match(/aria-hidden="true"[^>]*motion-safe:animate-pulse/g)).toHaveLength(2);
  });
});
