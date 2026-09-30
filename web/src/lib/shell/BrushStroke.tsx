import type { SVGProps } from "react";
import { cn } from "@/lib/cn";

export type BrushStrokeProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /**
   * `pink-on-blue`: the logo banner look, pink strokes for a blue section. `blue-on-cream`: blue strokes for a cream one.
   * `soft`: light-blue strokes for a cream section that should stay quiet.
   */
  tone?: "pink-on-blue" | "blue-on-cream" | "soft";
  /** `swash`: a wide loose horizontal stroke (section edges). `blob`: a rounded scribble (behind an illustration). */
  shape?: "swash" | "blob";
  /** Mirror horizontally in RTL so the stroke keeps pointing to the same side of the text. */
  flipInRtl?: boolean;
};

const TONE: Record<NonNullable<BrushStrokeProps["tone"]>, string> = {
  "pink-on-blue": "text-pink",
  "blue-on-cream": "text-brand",
  soft: "text-sky",
};

/**
 * Decorative brush stroke (DESIGN.md §4): the loose pink-on-blue / blue-on-cream shapes from the logo banner. Purely
 * decorative (aria-hidden, no pointer events): absolutely position it behind content, e.g.
 * `<BrushStroke className="absolute -end-10 top-0 h-40 w-auto" />`. The fill is the brand pink brush colour only
 * through `pink-on-blue`; it must never carry text.
 */
export function BrushStroke({
  tone = "pink-on-blue",
  shape = "swash",
  flipInRtl = false,
  className,
  ...rest
}: BrushStrokeProps) {
  const paths =
    shape === "swash"
      ? "M6 62c10-24 38-40 78-38 30 1.5 40-12 82-10 46 2 56 20 100 16 34-3 52-12 88-6 30 5 40 22 34 40-6 20-28 24-56 22-26-2-40 10-74 14-42 5-64-8-108-4-40 4-54 22-96 18C12 114-6 92 6 62Z"
      : "M28 52C44 14 96 2 140 14c40 11 66 4 84 34 16 28-4 58-34 72-24 11-30 34-70 38-44 4-96-14-108-54-6-20-2-38 16-52Z";
  const viewBox = shape === "swash" ? "0 0 300 132" : "0 0 250 180";
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      focusable="false"
      className={cn("pointer-events-none select-none", TONE[tone], flipInRtl && "[[dir=rtl]_&]:-scale-x-100", className)}
      fill="currentColor"
      {...rest}
    >
      <path d={paths} />
    </svg>
  );
}
