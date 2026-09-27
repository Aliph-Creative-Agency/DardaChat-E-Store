import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/components/shell/AdminShell";
import { routing } from "@/lib/i18n/routing";
import { getShellViewer } from "@/lib/shell/viewer";

export async function generateMetadata({ params }: LayoutProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "common.admin" });
  return { title: { default: t("backOffice"), template: `%s · ${t("backOffice")}` }, robots: { index: false, follow: false } };
}

/**
 * Back-office chrome (PLATFORM-owned). Does NOT authenticate: every admin page / handler / action calls
 * `requireStaff(permission)` from `@/modules/auth`. The viewer comes from the shell seam `getShellViewer()`.
 */
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const viewer = await getShellViewer();
  return <AdminShell viewer={viewer}>{children}</AdminShell>;
}
