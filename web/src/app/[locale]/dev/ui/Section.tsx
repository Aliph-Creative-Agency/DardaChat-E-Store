import type { ReactNode } from "react";

/** One block of the design-system gallery. */
export function GallerySection({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-5 py-10">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-2xl text-ink">
          {title}
        </h2>
        {note ? <p className="max-w-prose text-sm text-ink-soft">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}
