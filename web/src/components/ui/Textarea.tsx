import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { controlClasses } from "./Input";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Multi-line text. `dir="auto"` by default so a message typed in either script lines up naturally. */
export function Textarea({ className, rows = 4, dir = "auto", ...rest }: TextareaProps) {
  return <textarea rows={rows} dir={dir} className={cn(controlClasses, "min-h-24 py-2.5", className)} {...rest} />;
}
