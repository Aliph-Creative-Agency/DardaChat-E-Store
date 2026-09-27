"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Tabs } from "@/components/ui/Tabs";
import { useToast, type ToastTone } from "@/components/ui/Toast";

/** SHL-07 gallery demos (client): Dialog, Toast, Tabs. */

export function DialogDemo() {
  const t = useTranslations("common.devUi.dialog");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen(true)} data-testid="dialog-trigger">
        {t("open")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("title")}
        description={t("description")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setOpen(false);
                toast({ title: t("confirmed"), tone: "success" });
              }}
            >
              {t("confirm")}
            </Button>
          </>
        }
      >
        <p>{t("body")}</p>
      </Dialog>
    </div>
  );
}

const TOASTS: Array<{ tone: ToastTone; title: string; body?: string }> = [
  { tone: "info", title: "infoTitle" },
  { tone: "success", title: "successTitle", body: "successBody" },
  { tone: "warning", title: "warningTitle" },
  { tone: "error", title: "errorTitle", body: "errorBody" },
];

export function ToastDemo() {
  const t = useTranslations("common.devUi.toast");
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      {TOASTS.map(({ tone, title, body }) => (
        <Button
          key={tone}
          variant={tone === "error" ? "danger" : "secondary"}
          data-testid={`toast-${tone}`}
          onClick={() => toast({ tone, title: t(title), description: body ? t(body) : undefined })}
        >
          {t(tone)}
        </Button>
      ))}
    </div>
  );
}

export function TabsDemo() {
  const t = useTranslations("common.devUi.tabs");
  return (
    <div className="rounded-card bg-surface p-5 shadow-card sm:p-6">
      <Tabs
        label={t("label")}
        tabs={[
          { id: "story", label: t("story"), content: <p>{t("storyBody")}</p> },
          { id: "contents", label: t("contents"), content: <p>{t("contentsBody")}</p> },
          { id: "delivery", label: t("delivery"), content: <p>{t("deliveryBody")}</p> },
        ]}
      />
    </div>
  );
}
