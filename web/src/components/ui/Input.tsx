import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Shared look of text-like controls (Input, Textarea, Select). Invalid state is driven by `aria-invalid` (set by
 * `<Field>`), so the visual state can never drift from what assistive tech announces.
 */
export const controlClasses =
  "w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink shadow-inset " +
  "transition-[border-color,box-shadow] duration-fast ease-soft placeholder:text-ink-soft " +
  "hover:border-ink-soft disabled:cursor-not-allowed disabled:bg-paper-deep disabled:text-ink-soft " +
  "aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger";

/** Types whose content is Latin by nature: typed left-to-right, but aligned to the end on Arabic pages. */
const LTR_TYPES = new Set(["email", "tel", "url", "password"]);

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = "text", dir, ...rest }: InputProps) {
  const forcedLtr = dir === undefined && LTR_TYPES.has(type);
  return (
    <input
      type={type}
      dir={forcedLtr ? "ltr" : dir}
      className={cn(controlClasses, "min-h-11 py-2", forcedLtr && "rtl:text-end", className)}
      {...rest}
    />
  );
}
