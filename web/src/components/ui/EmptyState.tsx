import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type EmptyStateProps = {
  /** Decorative icon from `./icons` (e.g. `<IconCart size={32} />`). */
  icon?: ReactNode;
  /** What is empty, e.g. "Your cart is empty". */
  title: ReactNode;
  /** What to do next. Empty states always point somewhere. */
  description?: ReactNode;
  /** Primary way out, usually a `<Button href>`. */
  action?: ReactNode;
  /** Heading level for the title so it fits the surrounding outline. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
};

/** "Nothing here yet" block for empty lists, search results, carts (NFR-USA-005). */
export function EmptyState({ icon, title, description, action, headingLevel = 2, className }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-paper px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-14 items-center justify-center rounded-pill bg-brand-soft text-brand">{icon}</span>
      ) : null}
      <Heading className="font-display text-xl text-ink">{title}</Heading>
      {description ? <p className="max-w-prose text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}
