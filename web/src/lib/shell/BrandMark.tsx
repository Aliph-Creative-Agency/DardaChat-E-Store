import type { SVGProps } from "react";

/**
 * The Dardachat mark: a finger-heart hand with a small heart above it (DESIGN.md §4). PLACEHOLDER redraw as inline
 * SVG so the header is crisp at any size until the client sends the real logo files (see BACKLOG). Decorative:
 * always pair it with the brand name as text. Colours follow `currentColor` (the hand) and `--color-pink` (the heart).
 */
export function BrandMark({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 48"
      aria-hidden
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path
        d="M20 10.5c-3.4-2.4-5-4-5-6.1A2.9 2.9 0 0 1 20 2.6a2.9 2.9 0 0 1 5 1.8c0 2.1-1.6 3.7-5 6.1Z"
        fill="var(--color-pink)"
        stroke="none"
      />
      <path d="M11.5 22.5c-3.6-.8-5.2-5-2.4-7.2 2.6-2 6.2-.2 7.2 2.8" />
      <path d="M13 17.5c2.6-1.4 5.6-.6 8 .8l8.5 5c2.6 1.6 3.9 4 3.3 6.8-.9 4.2-4.8 6.6-8.8 7.4-3.7.7-7.4.2-9.8-2.4-2.2-2.4-3.3-5.6-3.6-8.6" />
      <path d="M18 33.5c1.4 1.8 3.4 2.4 5.6 2.2M22.5 28.5l3.5 2.2" />
    </svg>
  );
}
