import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n-locales";
import { getCurrentStaff } from "@/modules/auth";
import { AuthShell } from "@/modules/auth/ui/shell";
import { StaffSignInForm } from "@/modules/auth/ui/staff-forms";
import { staffNext } from "@/modules/auth/ui/staff-pages";
import { authT } from "@/modules/auth/ui/t";

export default async function StaffSignInPage({ params, searchParams }: PageProps<"/[locale]/staff/sign-in">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const next = staffNext(locale, await searchParams);
  if (await getCurrentStaff()) redirect(next);
  const t = authT(locale);
  return (
    <AuthShell title={t("staff.signIn.title")}>
      <p>{t("staff.signIn.intro")}</p>
      <StaffSignInForm locale={locale} next={next} />
    </AuthShell>
  );
}
