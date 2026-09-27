import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { controlClasses } from "./Input";
import { IconChevronDown } from "./icons";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Convenience list; alternatively pass `<option>` children. */
  options?: SelectOption[];
  /** Text of an empty first option (value ""), e.g. "Choose a city". */
  placeholder?: string;
};

/** Native `<select>` (best keyboard + mobile behaviour) with the design-system skin and a logical-end chevron. */
export function Select({ className, options, placeholder, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select className={cn(controlClasses, "min-h-11 cursor-pointer appearance-none py-2 pe-10", className)} {...rest}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
      <IconChevronDown
        size={18}
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-soft"
      />
    </div>
  );
}
