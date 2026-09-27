import { notFound } from "next/navigation";
import { isLocale } from "@/i18n-locales";
import { formatPhoneForDisplay } from "@/lib/phone";
import { requireCustomer } from "@/modules/auth";
import { SignOutButton } from "@/modules/auth/ui/forms";
import { AuthShell } from "@/modules/auth/ui/shell";
import { getTranslations } from "next-intl/server";

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const customer = await requireCustomer({ locale, next: `/${locale}/account` });
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthShell title={t("account.title")}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2" data-testid="account-identity">
        <dt className="font-medium">{t("account.signedInAs")}</dt>
        <dd>{customer.name ?? ""}</dd>
        <dt className="font-medium">{t("common.email")}</dt>
        <dd>
          <bdi dir="ltr">{customer.email ?? t("account.noEmail")}</bdi>
        </dd>
        <dt className="font-medium">{t("common.phone")}</dt>
        <dd>
          <bdi dir="ltr">{customer.phoneE164 ? formatPhoneForDisplay(customer.phoneE164) : t("account.noPhone")}</bdi>
        </dd>
      </dl>
      <SignOutButton endpoint="/api/auth/customer/sign-out" redirectTo={`/${locale}/sign-in`} />
    </AuthShell>
  );
}
