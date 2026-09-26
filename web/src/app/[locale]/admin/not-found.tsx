import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconCompass } from "@/components/ui/icons";

/** Admin 404, rendered inside the admin shell: an unknown section or one a team has not built yet. */
export default async function AdminNotFound() {
  const t = await getTranslations("common.admin.notFound");
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 py-10">
      <EmptyState
        headingLevel={1}
        icon={<IconCompass size={32} />}
        title={<span data-testid="admin-not-found">{t("title")}</span>}
        description={t("body")}
        action={<Button href="/admin">{t("action")}</Button>}
      />
    </div>
  );
}
