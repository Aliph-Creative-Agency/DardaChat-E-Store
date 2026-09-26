import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Inline SVG icons (no icon package). 24px grid, 1.75 stroke, `currentColor`, decorative by default (`aria-hidden`).
 * Pass `label` only when the icon is the sole content of its control AND the control has no other accessible name.
 * Directional icons (arrows, chevrons pointing along the reading direction) are drawn for LTR and mirror in RTL
 * via `rtl:-scale-x-100`; they are named by meaning (Forward/Back), not by screen side.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Rendered size in px (width = height). Default 20. */
  size?: number;
  /** Accessible name; when omitted the icon is hidden from assistive tech. */
  label?: string;
};

type IconDef = { paths: ReactNode; directional?: boolean; spin?: boolean };

function createIcon(name: string, { paths, directional, spin }: IconDef) {
  function Icon({ size = 20, label, className, ...rest }: IconProps) {
    const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        data-icon={name}
        className={cn("shrink-0", directional && "rtl:-scale-x-100", spin && "animate-spin", className)}
        {...a11y}
        {...rest}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = `Icon${name}`;
  return Icon;
}

export const IconChevronForward = createIcon("chevron-forward", { paths: <path d="m9 5 7 7-7 7" />, directional: true });
export const IconChevronBack = createIcon("chevron-back", { paths: <path d="m15 5-7 7 7 7" />, directional: true });
export const IconArrowForward = createIcon("arrow-forward", {
  paths: <path d="M4 12h15m-6-6 6 6-6 6" />,
  directional: true,
});
export const IconArrowBack = createIcon("arrow-back", { paths: <path d="M20 12H5m6-6-6 6 6 6" />, directional: true });
export const IconChevronDown = createIcon("chevron-down", { paths: <path d="m5 9 7 7 7-7" /> });
export const IconCheck = createIcon("check", { paths: <path d="m4.5 12.5 5 5 10-11" /> });
export const IconClose = createIcon("close", { paths: <path d="M6 6l12 12M18 6 6 18" /> });
export const IconPlus = createIcon("plus", { paths: <path d="M12 5v14M5 12h14" /> });
export const IconMinus = createIcon("minus", { paths: <path d="M5 12h14" /> });
export const IconMenu = createIcon("menu", { paths: <path d="M4 7h16M4 12h16M4 17h16" /> });
export const IconSearch = createIcon("search", {
  paths: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
});
export const IconCart = createIcon("cart", {
  paths: (
    <>
      <path d="M3 4h2.2l2.1 11h10.9l2-8H6.3" />
      <circle cx="9" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </>
  ),
});
export const IconUser = createIcon("user", {
  paths: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </>
  ),
});
export const IconGlobe = createIcon("globe", {
  paths: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5Z" />
    </>
  ),
});
export const IconInfo = createIcon("info", {
  paths: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.1" />
    </>
  ),
});
export const IconSuccess = createIcon("success", {
  paths: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.3 2.6 2.6 5-5.4" />
    </>
  ),
});
export const IconWarning = createIcon("warning", {
  paths: (
    <>
      <path d="M10.3 4.2 2.9 17.3A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.7L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 16.8v.1" />
    </>
  ),
});
export const IconError = createIcon("error", {
  paths: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.4v.1" />
    </>
  ),
});
export const IconExternal = createIcon("external", {
  paths: <path d="M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  directional: true,
});
export const IconSpinner = createIcon("spinner", {
  paths: (
    <>
      <circle cx="12" cy="12" r="8" opacity="0.25" />
      <path d="M20 12a8 8 0 0 0-8-8" />
    </>
  ),
  spin: true,
});

/** Every icon, for the gallery and for tests. */
export const ICONS = {
  IconChevronForward,
  IconChevronBack,
  IconArrowForward,
  IconArrowBack,
  IconChevronDown,
  IconCheck,
  IconClose,
  IconPlus,
  IconMinus,
  IconMenu,
  IconSearch,
  IconCart,
  IconUser,
  IconGlobe,
  IconInfo,
  IconSuccess,
  IconWarning,
  IconError,
  IconExternal,
  IconSpinner,
} as const;
