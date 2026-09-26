import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/** One placeholder shape. Decorative: always use inside `<Skeleton>` (which announces loading). */
export function SkeletonBlock({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block h-4 rounded-control bg-paper-deep motion-safe:animate-pulse", className)} />;
}

export type SkeletonProps = {
  /** Number of text-line placeholders when no custom `children` are given. */
  lines?: number;
  /** Custom placeholder layout built from `<SkeletonBlock>`s. */
  children?: ReactNode;
  /** Announced text; defaults to `common.ui.loading`. */
  label?: string;
  className?: string;
};

/**
 * Loading placeholder. The container is `aria-busy` with a polite status message so screen readers hear "loading"
 * once instead of a pile of empty shapes; the pulse only runs when the visitor allows motion.
 */
export function Skeleton({ lines = 3, children, label, className }: SkeletonProps) {
  const t = useTranslations("common.ui");
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={cn("flex flex-col gap-2", className)}>
      <span className="sr-only">{label ?? t("loading")}</span>
      {children ??
        Array.from({ length: lines }, (_, i) => (
          <SkeletonBlock key={i} className={i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"} />
        ))}
    </div>
  );
}
