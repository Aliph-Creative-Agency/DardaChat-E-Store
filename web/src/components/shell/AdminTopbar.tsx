import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { IconStore, IconUser } from "@/components/ui/icons";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { Link } from "@/lib/i18n/navigation";
import type { ShellViewer } from "@/lib/shell/viewer";
import { MobileMenu } from "./MobileMenu";

export type AdminTopbarProps = {
  viewer: ShellViewer;
  /** Navigation shown in the drawer below `lg` (the same sidebar the wide layout shows inline). */
  drawer: ReactNode;
};

/** Back-office top bar: drawer button (small screens), section title, store link, language and the viewer. */
export function AdminTopbar({ viewer, drawer }: AdminTopbarProps) {
  const t = useTranslations("common");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="flex min-h-16 items-center gap-2 px-4 sm:px-6">
        <MobileMenu className="lg:hidden">
          {drawer}
          <div aria-hidden className="stitch-rule-quiet" />
          <LocaleSwitcher />
        </MobileMenu>
        <p className="text-lg font-semibold text-brand lg:hidden">{t("admin.backOffice")}</p>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control px-2 font-semibold text-ink-soft hover:bg-paper-deep hover:text-ink"
          >
            <IconStore size={20} />
            <span className="max-sm:sr-only">{t("admin.viewStore")}</span>
          </Link>
          <LocaleSwitcher variant="link" className="max-lg:hidden" />
          <div
            className="flex min-h-11 items-center gap-2 rounded-control px-2"
            aria-label={t("admin.account")}
            role="group"
            data-testid="admin-viewer"
          >
            <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand-strong">
              <IconUser size={18} />
            </span>
            <span className="flex flex-col leading-tight max-md:sr-only">
              <span className="font-semibold text-ink">{viewer.name}</span>
              <span className="text-sm text-ink-soft">{t(`admin.roles.${viewer.role}`)}</span>
            </span>
            {viewer.isDevStub ? (
              <Badge tone="warning" className="max-md:hidden">
                {t("admin.devViewer")}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
