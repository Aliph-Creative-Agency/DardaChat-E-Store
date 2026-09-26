import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardElement = "div" | "section" | "article" | "aside" | "li";

export type CardProps = HTMLAttributes<HTMLElement> & {
  /** Semantic element; use `article`/`section` when the card has its own heading. */
  as?: CardElement;
  /** `raised` = surface with shadow (default); `sunken` = recessed paper; `outline` = hairline only; `brand` = soft madder. */
  tone?: "raised" | "sunken" | "outline" | "brand";
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
};

const tones = {
  raised: "bg-surface shadow-card",
  sunken: "bg-paper-deep",
  outline: "border border-line bg-surface",
  brand: "bg-brand-soft",
} as const;

const paddings = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" } as const;

/** A card resting on the table: the base container for grouped content. */
export function Card({ as: Tag = "div", tone = "raised", padding = "md", className, children, ...rest }: CardProps) {
  return (
    <Tag className={cn("flex flex-col gap-4 rounded-card text-ink", tones[tone], paddings[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({
  as: Tag = "h3",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement> & { as?: "h2" | "h3" | "h4" }) {
  return (
    <Tag className={cn("font-sans text-lg font-semibold text-ink", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardDescription({ className, children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-ink-soft", className)} {...rest}>
      {children}
    </p>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-auto flex flex-wrap items-center gap-3 border-t border-line pt-4", className)} {...rest}>
      {children}
    </div>
  );
}

