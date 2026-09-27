"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { IconClose } from "./icons";

export type DialogProps = {
  open: boolean;
  /** Called on Esc, the close button, or a click on the backdrop. The parent owns the `open` state. */
  onClose: () => void;
  /** Visible heading; also the dialog's accessible name. */
  title: ReactNode;
  /** Optional text under the title; becomes the accessible description. */
  description?: ReactNode;
  children?: ReactNode;
  /** Action row at the bottom (logical end aligned), e.g. Cancel + Confirm buttons. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Close on backdrop click (default true). Turn off for forms that would lose input. */
  dismissOnBackdrop?: boolean;
  className?: string;
};

const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

/**
 * Modal dialog on the native `<dialog>` + `showModal()`: the browser makes the page behind inert and traps focus.
 * On top of that: labelled by its title, Esc / close button / backdrop close via `onClose`, focus returns to
 * whatever opened it, and the page behind does not scroll while it is open.
 *
 *   const [open, setOpen] = useState(false);
 *   <Button onClick={() => setOpen(true)}>…</Button>
 *   <Dialog open={open} onClose={() => setOpen(false)} title={t("confirmTitle")} footer={…}>…</Dialog>
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissOnBackdrop = true,
  className,
}: DialogProps) {
  const t = useTranslations("common.ui");
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      const root = document.documentElement;
      const previousOverflow = root.style.overflow;
      root.style.overflow = "hidden";
      return () => {
        root.style.overflow = previousOverflow;
        if (dialog.open) dialog.close();
        returnFocus.current?.focus();
        returnFocus.current = null;
      };
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(event) => {
        // Esc: keep the parent in charge of `open` instead of letting the browser close it behind React's back.
        event.preventDefault();
        onCloseRef.current();
      }}
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) onCloseRef.current();
      }}
      className={cn(
        "m-auto max-h-[85dvh] w-[calc(100%-2rem)] overflow-hidden rounded-card bg-surface p-0 text-ink shadow-lift",
        "backdrop:bg-overlay open:flex open:flex-col",
        widths[size],
        className,
      )}
    >
      <div className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id={titleId} className="text-xl text-ink">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="text-sm text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onCloseRef.current()}
          aria-label={t("close")}
          className="-me-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-soft hover:bg-paper-deep hover:text-ink"
        >
          <IconClose />
        </button>
      </div>
      {children ? <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div> : null}
      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-paper px-5 py-4 sm:px-6">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
