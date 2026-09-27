import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconError, IconInfo, IconSuccess, IconWarning } from "./icons";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export type BadgeProps = {
  tone?: BadgeTone;
  /**
   * Leading icon. Semantic tones get a default icon so status is never conveyed by colour alone (NFR-USA-004);
   * pass another icon to override, or `null` for none (neutral/brand only make sense without).
   */
  icon?: ReactNode | null;
  /** Visible text is required: a badge is never just a coloured dot. */
  children: ReactNode;
  className?: string;
};

const tones: Record<BadgeTone, string> = {
  neutral: "bg-paper-deep text-ink",
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

const defaultIcons: Partial<Record<BadgeTone, ReactNode>> = {
  success: <IconSuccess size={16} />,
  warning: <IconWarning size={16} />,
  danger: <IconError size={16} />,
  info: <IconInfo size={16} />,
};

/** Small status label: tone + icon + text, e.g. order status, stock level. */
export function Badge({ tone = "neutral", icon, children, className }: BadgeProps) {
  const shownIcon = icon === undefined ? defaultIcons[tone] : icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-sm font-medium leading-6 whitespace-nowrap",
        tones[tone],
        className,
      )}
      data-tone={tone}
    >
      {shownIcon}
      <span>{children}</span>
    </span>
  );
}
