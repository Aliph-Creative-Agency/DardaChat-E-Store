import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNavIconFor } from "@/components/shell/AdminSidebar";
import { Card } from "@/components/ui/Card";
import { Link } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import { ADMIN_NAV, filterNav, groupNav } from "@/lib/nav/admin-nav";
import { getShellViewer } from "@/lib/shell/viewer";
import { requireStaff } from "@/modules/auth";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "common.nav.admin" });
  return { title: t("dashboard") };
}

/** Placeholder dashboard (INSIGHTS replaces it): welcome + every section the viewer may open. */
export default async function AdminHomePage({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requireStaff("dashboard.view", { locale, next: `/${locale}/admin` });
  const viewer = await getShellViewer();
  if (!viewer) notFound();
  const t = await getTranslations("common");
  const groups = groupNav(filterNav(ADMIN_NAV, viewer.permissions)).filter((g) => g.group !== "overview");

  return (
    <div className="mx-auto flex max-w-page flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="font-semibold text-brand">{t("admin.home.eyebrow")}</p>
        <h1 className="font-display text-3xl text-ink sm:text-4xl">{t("admin.home.title", { name: viewer.name })}</h1>
        <p className="max-w-prose text-ink-soft">{t("admin.home.body")}</p>
      </header>
      <section aria-labelledby="admin-sections" className="flex flex-col gap-4">
        <h2 id="admin-sections" className="font-display text-2xl text-ink">
          {t("admin.home.sections")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map(({ group, items }) => (
            <li key={group}>
              <Card as="section" tone="outline" padding="md" className="flex h-full flex-col gap-3">
                <h3 className="font-semibold text-ink">{t(`nav.adminGroup.${group}`)}</h3>
                <ul className="flex flex-col gap-1">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex min-h-11 items-center gap-3 rounded-control px-2 text-ink-soft hover:bg-paper-deep hover:text-ink"
                      >
                        <AdminNavIconFor icon={item.icon} size={18} />
                        <span>{t(`nav.admin.${item.labelKey}`)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
