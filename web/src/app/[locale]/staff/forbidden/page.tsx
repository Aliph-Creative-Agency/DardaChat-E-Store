import { notFound } from "next/navigation";
import { isLocale } from "@/i18n-locales";
import { AuthShell } from "@/modules/auth/ui/shell";
import { authT } from "@/modules/auth/ui/t";

/** Where requireStaff() sends a signed-in user who lacks the page's permission (FR-ACC-009). */
export default async function StaffForbiddenPage({ params }: PageProps<"/[locale]/staff/forbidden">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = authT(locale);
  return (
    <AuthShell title={t("staff.forbidden.title")}>
      <p>{t("staff.forbidden.body")}</p>
      <a className="underline" href={`/${locale}/admin`}>
        {t("staff.forbidden.back")}
      </a>
    </AuthShell>
  );
}
