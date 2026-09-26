import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n-locales";
import { getStaffContext } from "@/modules/auth";
import { hasConfirmedTotp } from "@/modules/auth/staff-auth";
import { AuthShell } from "@/modules/auth/ui/shell";
import { TwoFactorChallengeForm } from "@/modules/auth/ui/staff-forms";
import { staffNext, withNextParam } from "@/modules/auth/ui/staff-pages";
import { authT } from "@/modules/auth/ui/t";

export default async function TwoFactorPage({ params, searchParams }: PageProps<"/[locale]/staff/two-factor">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const next = staffNext(locale, await searchParams);
  const ctx = await getStaffContext();
  if (!ctx) redirect(withNextParam(`/${locale}/staff/sign-in`, next));
  if (ctx.staff.secondFactorDone) redirect(next);
  if (!(await hasConfirmedTotp(db, ctx.staff.id))) redirect(withNextParam(`/${locale}/staff/two-factor/setup`, next));
  const t = authT(locale);
  return (
    <AuthShell title={t("staff.twoFactor.title")}>
      <p>{t("staff.twoFactor.intro")}</p>
      <TwoFactorChallengeForm locale={locale} next={next} />
    </AuthShell>
  );
}
