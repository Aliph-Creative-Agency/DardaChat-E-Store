import type { ReactNode } from "react";

export type BdiProps = {
  children: ReactNode;
  /** "auto" (default) takes direction from the content; force "ltr" for refs, SKUs, phones, emails, URLs. */
  dir?: "auto" | "ltr" | "rtl";
  className?: string;
};

/**
 * Isolates mixed-direction content inside a sentence (NFR-LOC-004/005) so e.g. an order reference inside Arabic text
 * keeps its punctuation in place. Server component. For plain strings passed to `t()`, use `isolate()`/`ltr()`.
 */
export function Bdi({ children, dir = "auto", className }: BdiProps) {
  return (
    <bdi dir={dir} className={className}>
      {children}
    </bdi>
  );
}
