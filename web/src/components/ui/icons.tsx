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

/* Back-office section icons (admin sidebar). */
export const IconDashboard = createIcon("dashboard", {
  paths: <path d="M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z" />,
});
export const IconChart = createIcon("chart", { paths: <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" /> });
export const IconOrders = createIcon("orders", {
  paths: <path d="M7 4h10l1 3v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7l1-3ZM6 7h12M9 11h6M9 15h4" />,
});
export const IconTruck = createIcon("truck", {
  paths: (
    <>
      <path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </>
  ),
  directional: true,
});
export const IconReturn = createIcon("return", { paths: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />, directional: true });
export const IconCoins = createIcon("coins", {
  paths: (
    <>
      <ellipse cx="9" cy="7" rx="5.5" ry="2.5" />
      <path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5M3.5 11v4c0 1.4 2.5 2.5 5.5 2.5" />
      <ellipse cx="15" cy="13" rx="5.5" ry="2.5" />
      <path d="M9.5 13v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" />
    </>
  ),
});
export const IconTag = createIcon("tag", {
  paths: (
    <>
      <path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5-8.5-8.5Z" />
      <circle cx="8" cy="8.5" r="1.2" />
    </>
  ),
});
export const IconStack = createIcon("stack", { paths: <path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8 12 3.5ZM3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5" /> });
export const IconDocument = createIcon("document", {
  paths: <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v4h4M8.5 12h7M8.5 16h5" />,
});
export const IconQuestion = createIcon("question", {
  paths: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.4M12 16.6v.1" />
    </>
  ),
});
export const IconBox = createIcon("box", {
  paths: <path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9L12 3ZM3.5 7.5 12 12l8.5-4.5M12 12v9M7.8 5.3l8.4 4.5" />,
});
export const IconClipboard = createIcon("clipboard", {
  paths: <path d="M9 4h6v3H9zM9 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-3M8.5 12h7M8.5 16h5" />,
});
export const IconUsers = createIcon("users", {
  paths: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 19.5c.9-3 3.4-4.8 6.5-4.8s5.6 1.8 6.5 4.8M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.8 14.9c1.8.6 3.1 2.2 3.7 4.6" />
    </>
  ),
});
export const IconCard = createIcon("card", { paths: <path d="M3 6h18v12H3zM3 10h18M6.5 14.5h4" /> });
export const IconReceipt = createIcon("receipt", {
  paths: <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21V3ZM9 8h6M9 12h6M9 16h3" />,
});
export const IconMessage = createIcon("message", {
  paths: <path d="M4 5h16v11H9l-5 4V5ZM8 9.5h8M8 12.5h5" />,
});
export const IconMegaphone = createIcon("megaphone", {
  paths: <path d="M4 10v4h3l8 4.5v-13L7 10H4ZM7 14l1.5 5.5h2.5M18.5 9.5a3.5 3.5 0 0 1 0 5" />,
  directional: true,
});
export const IconSparkle = createIcon("sparkle", {
  paths: <path d="M12 3.5 13.9 10 20.5 12 13.9 14 12 20.5 10.1 14 3.5 12 10.1 10 12 3.5ZM19 3.5v3M17.5 5h3" />,
});
export const IconCompass = createIcon("compass", {
  paths: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
});
export const IconSettings = createIcon("settings", {
  paths: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
});
export const IconShield = createIcon("shield", { paths: <path d="M12 3 19.5 6v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6L12 3Z" /> });
export const IconPulse = createIcon("pulse", { paths: <path d="M3 12h4l2.5-6 4 12 2.5-6h5" /> });
export const IconStore = createIcon("store", {
  paths: <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12v8h13v-8M10 20v-4.5h4V20" />,
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
  IconDashboard,
  IconChart,
  IconOrders,
  IconTruck,
  IconReturn,
  IconCoins,
  IconTag,
  IconStack,
  IconDocument,
  IconQuestion,
  IconBox,
  IconClipboard,
  IconUsers,
  IconCard,
  IconReceipt,
  IconMessage,
  IconMegaphone,
  IconSparkle,
  IconCompass,
  IconSettings,
  IconShield,
  IconPulse,
  IconStore,
} as const;
