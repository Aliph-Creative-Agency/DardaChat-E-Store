import type { ReactNode } from "react";

/** Content frame for the auth pages: title + narrow column. The surrounding layout (store / staff) owns `<main>`. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
