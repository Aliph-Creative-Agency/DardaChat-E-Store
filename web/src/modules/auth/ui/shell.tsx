import type { ReactNode } from "react";

/** Plain page frame for the auth pages (W3's store/admin layouts wrap them after the merge). */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      {children}
    </main>
  );
}
