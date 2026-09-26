import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n-locales";
import { getStaffContext } from "@/modules/auth";
import { hasConfirmedTotp } from "@/modules/auth/staff-auth";
import { AuthShell } from "@/modules/auth/ui/shell";
import { TotpSetup } from "@/modules/auth/ui/staff-forms";
import { staffNext, withNextParam } from "@/modules/auth/ui/staff-pages";
import { authT } from "@/modules/auth/ui/t";

/** Mandatory first-time enrolment (FR-ACC-012): key + otpauth link, then the recovery codes once. */
export default async function TwoFactorSetupPage({
  params,
  searchParams,
}: PageProps<"/[locale]/staff/two-factor/setup">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const next = staffNext(locale, await searchParams);
  const ctx = await getStaffContext();
  if (!ctx) redirect(withNextParam(`/${locale}/staff/sign-in`, next));
  if (ctx.staff.secondFactorDone) redirect(next);
  if (await hasConfirmedTotp(db, ctx.staff.id)) redirect(withNextParam(`/${locale}/staff/two-factor`, next));
  const t = authT(locale);
  return (
    <AuthShell title={t("staff.setup.title")}>
      <TotpSetup locale={locale} next={next} />
    </AuthShell>
  );
}
