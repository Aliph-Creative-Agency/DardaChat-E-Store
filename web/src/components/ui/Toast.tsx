"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { IconClose, IconError, IconInfo, IconSuccess, IconWarning } from "./icons";

export type ToastTone = "info" | "success" | "warning" | "error";

export type ToastOptions = {
  title: ReactNode;
  description?: ReactNode;
  /** `error` toasts are announced assertively (role="alert"); all others politely (role="status"). */
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss (paused while hovered or focused). Default 5000, errors 8000. */
  duration?: number;
};

type ToastItem = ToastOptions & { id: number; tone: ToastTone; duration: number };

type ToastApi = {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Show transient feedback: `const { toast } = useToast(); toast({ title: t("saved"), tone: "success" })`. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast() must be used inside <ToastProvider> (mounted in app/[locale]/layout.tsx)");
  return api;
}

const tones: Record<ToastTone, { box: string; icon: ReactNode }> = {
  info: { box: "border-info", icon: <IconInfo className="text-info" /> },
  success: { box: "border-success", icon: <IconSuccess className="text-success" /> },
  warning: { box: "border-warning", icon: <IconWarning className="text-warning" /> },
  error: { box: "border-danger", icon: <IconError className="text-danger" /> },
};

/**
 * Holds the toast queue and the two live regions (polite + assertive). The regions are in the DOM from the first
 * render, which is what makes screen readers announce content added to them later. Toasts stack at the logical
 * end (bottom-left on Arabic pages, bottom-right on English ones).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common.ui");
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((item) => item.id !== id)), []);
  const toast = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    const tone = options.tone ?? "info";
    const duration = options.duration ?? (tone === "error" ? 8000 : 5000);
    setItems((list) => [...list.slice(-4), { ...options, id, tone, duration }]);
    return id;
  }, []);
  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  const polite = items.filter((item) => item.tone !== "error");
  const assertive = items.filter((item) => item.tone === "error");

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section
        aria-label={t("notifications")}
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:end-4 sm:w-96"
      >
        <div role="alert" className="flex flex-col gap-2">
          {assertive.map((item) => (
            <Toast key={item.id} item={item} onDismiss={dismiss} dismissLabel={t("dismiss")} />
          ))}
        </div>
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {polite.map((item) => (
            <Toast key={item.id} item={item} onDismiss={dismiss} dismissLabel={t("dismiss")} />
          ))}
        </div>
      </section>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss, dismissLabel }: { item: ToastItem; onDismiss: (id: number) => void; dismissLabel: string }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const remaining = useRef(item.duration);

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(1000, remaining.current - (Date.now() - started));
    };
  }, [paused, item.id, onDismiss]);

  const tone = tones[item.tone];
  return (
    <div
      data-toast={item.tone}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-control border-s-4 bg-surface py-3 pe-2 ps-4 text-ink shadow-lift",
        tone.box,
      )}
    >
      <span className="mt-0.5">{tone.icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-semibold">{item.title}</p>
        {item.description ? <p className="text-sm text-ink-soft">{item.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label={dismissLabel}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-control text-ink-soft hover:bg-paper-deep hover:text-ink"
      >
        <IconClose size={18} />
      </button>
    </div>
  );
}
