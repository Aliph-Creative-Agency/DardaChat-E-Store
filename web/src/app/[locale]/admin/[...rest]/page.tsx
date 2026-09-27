import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/lib/i18n/routing";
import { requireStaff } from "@/modules/auth";

/**
 * Any admin path no team has built yet renders the admin not-found inside the shell (not the site 404).
 * Guarded first (deny-by-default walker): an anonymous visitor is sent to staff sign-in, not told the path is unknown.
 */
export default async function AdminUnknownSection({ params }: PageProps<"/[locale]/admin/[...rest]">): Promise<never> {
  const { locale, rest } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  await requireStaff("dashboard.view", { locale, next: `/${locale}/admin/${rest.join("/")}` });
  notFound();
}
