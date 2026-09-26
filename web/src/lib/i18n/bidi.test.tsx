import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { Bdi } from "@/components/ui/Bdi";
import { FSI, LRI, PDI, isolate, isolateValues, ltr, stripBidi } from "./bidi";

describe("bidi isolation (NFR-LOC-004/005)", () => {
  it("wraps values in isolates", () => {
    expect(isolate("DC-7K3M-9QPT")).toBe(`${FSI}DC-7K3M-9QPT${PDI}`);
    expect(ltr("+970 59 912 3456")).toBe(`${LRI}+970 59 912 3456${PDI}`);
    expect(stripBidi(ltr(isolate("x")))).toBe("x");
  });

  it("keeps an order reference and its punctuation in logical order inside Arabic", () => {
    const t = createTranslator({
      locale: "ar",
      messages: { orders: { placed: "طلب رقم {ref} ({count, number} قطع)." } },
      namespace: "orders",
    });
    const out = t("placed", isolateValues({ ref: "DC-7K3M-9QPT", count: 2 }));
    // The reference is sealed in FSI…PDI, so its "-" cannot bind to the Arabic run, and the closing ")." stays last.
    expect(out).toBe(`طلب رقم ${FSI}DC-7K3M-9QPT${PDI} (2 قطع).`);
    expect(stripBidi(out)).toBe("طلب رقم DC-7K3M-9QPT (2 قطع).");
    expect(out.endsWith(").")).toBe(true);
  });

  it("<Bdi> renders an isolating element", () => {
    expect(renderToStaticMarkup(<Bdi dir="ltr">DC-7K3M-9QPT</Bdi>)).toBe(
      '<bdi dir="ltr">DC-7K3M-9QPT</bdi>',
    );
    expect(renderToStaticMarkup(<Bdi>x</Bdi>)).toBe('<bdi dir="auto">x</bdi>');
  });
});
