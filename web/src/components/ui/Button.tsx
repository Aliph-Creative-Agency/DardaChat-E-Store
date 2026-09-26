import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Link } from "@/lib/i18n/navigation";
import { IconSpinner } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and sets `aria-busy`; the label stays visible and readable. A `<button>` is also disabled. */
  loading?: boolean;
  /** Icon before the label (logical start). Pass an icon from `./icons`; it is decorative. */
  iconStart?: ReactNode;
  /** Icon after the label (logical end). Use a directional icon (e.g. IconArrowForward) for "next" actions. */
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

type AsButton = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };
type AsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | "href"> & {
    /** Internal paths go through the locale-aware Link; `http(s):`, `mailto:`, `tel:` render a plain `<a>`. */
    href: string;
  };

export type ButtonProps = AsButton | AsLink;

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-soft " +
  "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed " +
  "aria-disabled:opacity-55 aria-busy:cursor-progress";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-on-brand shadow-card hover:bg-brand-strong",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink-soft hover:bg-paper-deep",
  ghost: "text-brand hover:bg-brand-soft hover:text-brand-strong",
  danger: "bg-danger text-white shadow-card hover:brightness-90",
};

/** Heights: md/lg meet the 44px touch target (NFR-USA-003); sm is for dense admin tables. */
const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-5 text-base",
  lg: "min-h-13 px-7 text-lg",
};

const EXTERNAL = /^(https?:|mailto:|tel:|\/\/)/i;

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: Pick<CommonProps, "variant" | "size" | "fullWidth" | "className"> = {}): string {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

export function Button(props: ButtonProps) {
  const { variant, size, loading = false, iconStart, iconEnd, fullWidth, className, children, ...rest } = props;
  const classes = buttonClasses({ variant, size, fullWidth, className });
  const content = (
    <>
      {loading ? <IconSpinner size={size === "lg" ? 22 : 18} /> : iconStart}
      <span>{children}</span>
      {iconEnd}
    </>
  );

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchor } = rest as Omit<AsLink, keyof CommonProps>;
    const busy = loading ? { "aria-busy": true as const } : {};
    if (EXTERNAL.test(href)) {
      return (
        <a href={href} className={classes} {...busy} {...anchor}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...busy} {...anchor}>
        {content}
      </Link>
    );
  }

  const { type = "button", disabled, ...button } = rest as Omit<AsButton, keyof CommonProps>;
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...button}
    >
      {content}
    </button>
  );
}
