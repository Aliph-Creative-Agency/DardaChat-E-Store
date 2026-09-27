import { Link } from "@/lib/i18n/navigation";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n-locales";
import { AuthShell } from "@/modules/auth/ui/shell";
import { getTranslations } from "next-intl/server";

/** Where requireStaff() sends a signed-in user who lacks the page's permission (FR-ACC-009). */
export default async function StaffForbiddenPage({ params }: PageProps<"/[locale]/staff/forbidden">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthShell title={t("staff.forbidden.title")}>
      <p>{t("staff.forbidden.body")}</p>
      <Link className="underline" href={`/admin`}>
        {t("staff.forbidden.back")}
      </Link>
    </AuthShell>
  );
}
