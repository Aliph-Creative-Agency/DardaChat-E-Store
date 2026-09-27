import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import {
  IconBox,
  IconCard,
  IconChart,
  IconClipboard,
  IconCoins,
  IconCompass,
  IconDashboard,
  IconDocument,
  IconMegaphone,
  IconMessage,
  IconOrders,
  IconPulse,
  IconQuestion,
  IconReceipt,
  IconReturn,
  IconSettings,
  IconShield,
  IconSparkle,
  IconStack,
  IconTag,
  IconTruck,
  IconUsers,
  type IconProps,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { AdminNavGroup, AdminNavIcon, AdminNavItem } from "@/lib/nav/admin-nav";
import { NavLink } from "./NavLink";

const ICON: Record<AdminNavIcon, ComponentType<IconProps>> = {
  dashboard: IconDashboard,
  chart: IconChart,
  orders: IconOrders,
  truck: IconTruck,
  return: IconReturn,
  coins: IconCoins,
  tag: IconTag,
  stack: IconStack,
  document: IconDocument,
  question: IconQuestion,
  box: IconBox,
  clipboard: IconClipboard,
  users: IconUsers,
  card: IconCard,
  receipt: IconReceipt,
  message: IconMessage,
  megaphone: IconMegaphone,
  sparkle: IconSparkle,
  compass: IconCompass,
  settings: IconSettings,
  shield: IconShield,
  pulse: IconPulse,
};

export function AdminNavIconFor({ icon, size = 20 }: { icon: AdminNavIcon; size?: number }) {
  const Icon = ICON[icon];
  return <Icon size={size} />;
}

export type AdminSidebarProps = {
  /** Visible items grouped in display order (`groupNav(filterNav(ADMIN_NAV, viewer.permissions))`). */
  groups: { group: AdminNavGroup; items: readonly AdminNavItem[] }[];
  /** Distinguishes the ids of the two copies (inline sidebar and mobile drawer). */
  idPrefix: string;
  className?: string;
  "data-testid"?: string;
};

/**
 * Back-office navigation: grouped section links from the nav registry, filtered by the viewer's permissions.
 * Active item gets `aria-current="page"` and a bar on its logical start edge.
 */
export function AdminSidebar({ groups, idPrefix, className, ...rest }: AdminSidebarProps) {
  const t = useTranslations("common");
  return (
    <nav aria-label={t("admin.nav")} className={cn("flex flex-col gap-5", className)} data-testid={rest["data-testid"]}>
      {groups.map(({ group, items }) => {
        const headingId = `${idPrefix}-${group}`;
        return (
          <div key={group} className="flex flex-col gap-1">
            <p id={headingId} className="px-3 text-sm font-semibold text-ink-soft">
              {t(`nav.adminGroup.${group}`)}
            </p>
            <ul aria-labelledby={headingId} className="flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    href={item.href}
                    exact={item.exact ?? false}
                    data-nav-id={item.id}
                    className="flex min-h-11 items-center gap-3 rounded-control border-s-4 border-transparent px-3 font-medium text-ink transition-colors duration-fast hover:bg-surface"
                    activeClassName="border-brand bg-brand-soft font-semibold text-brand-strong hover:bg-brand-soft"
                  >
                    <AdminNavIconFor icon={item.icon} />
                    <span>{t(`nav.admin.${item.labelKey}`)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
