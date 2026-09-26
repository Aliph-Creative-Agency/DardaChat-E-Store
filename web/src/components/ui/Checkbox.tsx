import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FieldError } from "./Field";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Visible label next to the box; clicking it toggles the box. */
  label: ReactNode;
  hint?: ReactNode;
  /** Error message (icon + text); marks the box `aria-invalid`. */
  error?: ReactNode;
};

/** Native checkbox (brand accent colour) with its own label, hint and error wiring. */
export function Checkbox({ label, hint, error, id, className, ...rest }: CheckboxProps) {
  const autoId = useId();
  const boxId = id ?? `checkbox${autoId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hintId = hint ? `${boxId}-hint` : undefined;
  const errorId = error ? `${boxId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={boxId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="mt-1 size-5 shrink-0 cursor-pointer accent-brand disabled:cursor-not-allowed"
          {...rest}
        />
        <label htmlFor={boxId} className="cursor-pointer text-base text-ink">
          {label}
        </label>
      </div>
      {hint ? (
        <p id={hintId} className="ps-8 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <FieldError id={errorId} className="ps-8">
          {error}
        </FieldError>
      ) : null}
    </div>
  );
}
