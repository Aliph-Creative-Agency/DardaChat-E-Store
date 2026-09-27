import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Checkbox,
  Field,
  ICONS,
  IconArrowForward,
  IconCheck,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

// next-intl's navigation build imports "next/navigation" without an extension, which plain-Node ESM (vitest's
// externalised deps) cannot resolve. Stand in for the locale-aware Link: prefix with the provider's locale.
// The real Link is exercised in the browser (gallery + e2e). CR filed to inline next-intl in vitest.config.ts.
vi.mock("@/lib/i18n/navigation", async () => {
  const { useLocale } = await import("next-intl");
  function Link({ href, ...rest }: { href: string } & Record<string, unknown>) {
    const locale = useLocale();
    return <a href={`/${locale}${href}`} data-testid="intl-link" {...rest} />;
  }
  return { Link };
});

/** Render + parse into a DOM-less query helper (regex on markup is enough for attribute wiring). */
function render(el: ReactElement, locale = "ar"): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}}>
      {el}
    </NextIntlClientProvider>,
  );
}

function attr(html: string, tag: string, name: string): string | null {
  const m = new RegExp(`<${tag}\\b[^>]*\\s${name}="([^"]*)"`).exec(html);
  return m?.[1] ?? null;
}

describe("icons", () => {
  it("are decorative, currentColor, and only directional ones mirror", () => {
    for (const [name, Icon] of Object.entries(ICONS)) {
      const html = render(<Icon />);
      expect(html, name).toContain('aria-hidden="true"');
      expect(html, name).toContain('stroke="currentColor"');
      expect(html, name).toContain('focusable="false"');
      const mirrors = html.includes("rtl:-scale-x-100");
      expect(mirrors, name).toBe(/Forward|Back|External|Truck|Return|Megaphone/.test(name));
    }
  });

  it("with a label become a named image", () => {
    const html = render(<IconCheck label="done" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="done"');
    expect(html).not.toMatch(/saria-hidden=/);
  });
});

describe("Button", () => {
  it("defaults to type=button with the primary variant", () => {
    const html = render(<Button>حفظ</Button>);
    expect(attr(html, "button", "type")).toBe("button");
    expect(html).toContain("bg-brand");
    expect(html).not.toMatch(/saria-busy=/);
  });

  it("loading keeps the label, sets aria-busy, disables, and shows a spinner", () => {
    const html = render(
      <Button loading variant="secondary">
        حفظ
      </Button>,
    );
    expect(attr(html, "button", "aria-busy")).toBe("true");
    expect(html).toMatch(/<button[^>]*disabled=""/);
    expect(html).toContain("<span>حفظ</span>");
    expect(html).toContain('data-icon="spinner"');
  });

  it("renders a locale-prefixed <a> for internal href and a plain <a> for external", () => {
    const internal = render(<Button href="/products">تسوق</Button>, "ar");
    expect(internal).not.toContain("<button");
    expect(attr(internal, "a", "href")).toBe("/ar/products");
    expect(internal).toContain('data-testid="intl-link"');
    const external = render(<Button href="https://example.com">x</Button>);
    expect(attr(external, "a", "href")).toBe("https://example.com");
    expect(external).not.toContain("intl-link");
  });

  it("puts directional icons at the logical end", () => {
    const html = render(<Button iconEnd={<IconArrowForward />}>التالي</Button>);
    expect(html.indexOf("<span>التالي</span>")).toBeLessThan(html.indexOf('data-icon="arrow-forward"'));
    expect(html).toContain("rtl:-scale-x-100");
  });
});

describe("Field", () => {
  it("wires label, hint, error, aria-describedby and aria-invalid", () => {
    const html = render(
      <Field id="email" label="البريد" hint="مثال" error="البريد غير صحيح" required>
        {(control) => <Input {...control} type="email" name="email" />}
      </Field>,
    );
    expect(attr(html, "label", "for")).toBe("email");
    expect(attr(html, "input", "id")).toBe("email");
    expect(attr(html, "input", "aria-describedby")).toBe("email-hint email-error");
    expect(attr(html, "input", "aria-invalid")).toBe("true");
    expect(html).toMatch(/<input[^>]*required=""/);
    expect(html).toContain('id="email-hint"');
    // error = icon + text
    expect(html).toMatch(/id="email-error"[^>]*>.*data-icon="error".*البريد غير صحيح/);
    // Latin-content types are typed LTR
    expect(attr(html, "input", "dir")).toBe("ltr");
  });

  it("without hint or error has no describedby and is not invalid", () => {
    const html = render(<Field label="الاسم">{(control) => <Input {...control} name="name" />}</Field>);
    expect(html).not.toMatch(/saria-describedby=/);
    expect(html).not.toMatch(/saria-invalid=/);
    expect(attr(html, "label", "for")).toBe(attr(html, "input", "id"));
    expect(attr(html, "input", "id")).toMatch(/^field/);
  });

  it("works for Textarea and Select", () => {
    const ta = render(<Field id="msg" label="رسالة" error="مطلوب">{(c) => <Textarea {...c} />}</Field>);
    expect(attr(ta, "textarea", "aria-describedby")).toBe("msg-error");
    expect(attr(ta, "textarea", "aria-invalid")).toBe("true");
    const sel = render(
      <Field id="city" label="المدينة" hint="للتوصيل">
        {(c) => <Select {...c} placeholder="اختر" options={[{ value: "rm", label: "رام الله" }]} />}
      </Field>,
    );
    expect(attr(sel, "select", "aria-describedby")).toBe("city-hint");
    expect(sel).toContain('<option value="">اختر</option>');
    expect(sel).toContain('data-icon="chevron-down"');
  });
});

describe("Checkbox", () => {
  it("labels the box and wires hint + error", () => {
    const html = render(<Checkbox id="terms" label="أوافق" hint="اقرأ الشروط" error="مطلوب" name="terms" />);
    expect(attr(html, "input", "type")).toBe("checkbox");
    expect(attr(html, "label", "for")).toBe("terms");
    expect(attr(html, "input", "aria-describedby")).toBe("terms-hint terms-error");
    expect(attr(html, "input", "aria-invalid")).toBe("true");
  });
});

describe("Badge", () => {
  it("semantic tones carry an icon and text (never colour alone)", () => {
    for (const tone of ["success", "warning", "danger", "info"] as const) {
      const html = render(<Badge tone={tone}>حالة</Badge>);
      expect(html, tone).toMatch(/data-icon="(success|warning|error|info)"/);
      expect(html, tone).toContain("<span>حالة</span>");
    }
    expect(render(<Badge>عادي</Badge>)).not.toContain("data-icon");
    expect(render(<Badge tone="success" icon={null}>x</Badge>)).not.toContain("data-icon");
  });
});

describe("Card", () => {
  it("renders the chosen element and heading level", () => {
    const html = render(
      <Card as="article" tone="sunken">
        <CardTitle as="h2">عنوان</CardTitle>
      </Card>,
    );
    expect(html).toMatch(/^<article class="[^"]*bg-paper-deep/);
    expect(html).toContain("<h2");
  });
});
