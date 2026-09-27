"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { IconClose, IconMenu } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type MobileMenuProps = {
  /** Menu body (nav links, locale switcher). Clicking any link inside closes the menu. */
  children: ReactNode;
  /** Classes for the trigger (e.g. `lg:hidden`). */
  className?: string;
};

/**
 * Small-screen menu: a button that opens a modal sheet sliding in from the logical start (right in Arabic).
 * Native `<dialog>` gives the focus trap, inert page and Esc; focus returns to the button on close; page scroll is
 * locked while open; following a link inside closes it.
 */
export function MobileMenu({ children, className }: MobileMenuProps) {
  const t = useTranslations("common.shell");
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleClose() {
    setOpen(false);
    document.documentElement.style.overflow = "";
    buttonRef.current?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        data-testid="menu-button"
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control px-2 font-semibold text-ink hover:bg-paper-deep",
          className,
        )}
      >
        <IconMenu size={24} />
        <span className="sr-only">{t("openMenu")}</span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={handleClose}
        onClick={(e) => {
          // backdrop click (the dialog element itself, outside the panel) or any link inside closes
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        data-testid="mobile-menu"
        className="fixed inset-y-0 start-0 m-0 h-dvh max-h-dvh w-[min(22rem,88vw)] max-w-none bg-paper p-0 text-ink shadow-lift backdrop:bg-ink/40"
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-5">
          <div className="flex items-center justify-between gap-4">
            <p id={titleId} className="font-display text-xl text-brand">
              {t("menu")}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-ink hover:bg-paper-deep"
            >
              <IconClose size={22} />
              <span className="sr-only">{t("closeMenu")}</span>
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
