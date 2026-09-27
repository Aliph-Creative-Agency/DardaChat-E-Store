import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconError } from "./icons";

/** Props `<Field>` hands to its control: spread them onto Input / Textarea / Select (or any native control). */
export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required?: boolean;
};

export type FieldProps = {
  /** Visible label (always required: placeholders are not labels). */
  label: ReactNode;
  /** Helper text under the label, e.g. the expected format. */
  hint?: ReactNode;
  /** Error message: what went wrong + how to fix it (NFR-USA-005). Its presence marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  /** Control id; generated when omitted. */
  id?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * Label + hint + control + error with the ARIA wiring done once: `for`/`id`, `aria-describedby` (hint then error),
 * `aria-invalid` when an error is shown. The error carries an icon and text, never colour alone (NFR-USA-004).
 *
 *   <Field label={t("email")} hint={t("emailHint")} error={errors.email}>
 *     {(control) => <Input {...control} type="email" name="email" autoComplete="email" />}
 *   </Field>
 */
export function Field({ label, hint, error, required, id, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? `field${autoId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={controlId} className="text-sm font-semibold text-ink">
        {label}
        {required ? (
          <span aria-hidden className="ms-1 text-brand">
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
      {children({
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required: required || undefined,
      })}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

/** Inline error line: icon + text in the danger colour. Also usable on its own (e.g. under a radio group). */
export function FieldError({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} className={cn("flex items-start gap-1.5 text-sm font-medium text-danger", className)}>
      <IconError size={18} className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}
