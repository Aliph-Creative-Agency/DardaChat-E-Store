import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware navigation. Use these instead of `next/link` / `next/navigation` for internal routes. */
export const { Link, redirect, usePathname, useRouter, getPathname, permanentRedirect } = createNavigation(routing);
