"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { isActiveHref } from "@/lib/nav/store-nav";

type NavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  /** Classes added when the link is the current page (or a parent of it). */
  activeClassName?: string;
};

/** Locale-aware link that marks itself `aria-current="page"` when it matches the current path. */
export function NavLink({ href, className, activeClassName, ...rest }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActiveHref(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && activeClassName)}
      {...rest}
    />
  );
}
