import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge taught our custom theme tokens (globals.css `@theme`), otherwise it would e.g. read `text-display`
 * as a colour and drop it when `text-brand` follows, or treat `rounded-card` / `shadow-lift` as unknown classes.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display"],
      radius: ["control", "card", "pill"],
      shadow: ["card", "lift", "inset"],
      ease: ["soft"],
      container: ["page"],
    },
    classGroups: {
      duration: [{ duration: ["fast", "base", "slow"] }],
    },
  },
});

/** Join class names conditionally and let later Tailwind classes win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
