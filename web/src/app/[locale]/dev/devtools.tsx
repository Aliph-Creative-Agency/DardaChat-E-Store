/**
 * Shared bits for the dev-only pages under /[locale]/dev (outbox, services). English only, plain and readable;
 * these pages 404 in production. Logical CSS properties only (ps/pe/text-start) so they work in rtl and ltr.
 */
import Link from "next/link";
import type { ReactNode } from "react";

export function assertDevOnly(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function DevNav({ locale, current }: { locale: string; current: "outbox" | "services" }) {
  const item = (key: "outbox" | "services", label: string) => (
    <Link
      href={`/${locale}/dev/${key}`}
      className={`rounded px-3 py-1 text-sm ${current === key ? "bg-neutral-900 text-white" : "bg-neutral-100 hover:bg-neutral-200"}`}
      aria-current={current === key ? "page" : undefined}
    >
      {label}
    </Link>
  );
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2" aria-label="Dev tools">
      <span className="pe-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Dev tools</span>
      {item("outbox", "Outbox")}
      {item("services", "Services")}
      <Link href={`/${locale}`} className="ms-auto text-sm underline">
        Back to site
      </Link>
    </nav>
  );
}

export function DevTable({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded border border-neutral-200">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-neutral-50">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="border-b border-neutral-200 px-3 py-2 text-start font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-3 py-4 text-neutral-500">
                Nothing here yet.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Cell({ children, mono, wrap }: { children: ReactNode; mono?: boolean; wrap?: boolean }) {
  return (
    <td
      className={`border-b border-neutral-100 px-3 py-2 align-top ${mono ? "font-mono text-xs" : ""} ${wrap ? "max-w-md break-words" : "whitespace-nowrap"}`}
    >
      {children}
    </td>
  );
}

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-green-100 text-green-900",
  up: "bg-green-100 text-green-900",
  ok: "bg-green-100 text-green-900",
  queued: "bg-sky-100 text-sky-900",
  sending: "bg-sky-100 text-sky-900",
  failed: "bg-amber-100 text-amber-900",
  degraded: "bg-amber-100 text-amber-900",
  dead: "bg-red-100 text-red-900",
  down: "bg-red-100 text-red-900",
  error: "bg-red-100 text-red-900",
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "—";
  return (
    <span data-status={s} className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s] ?? "bg-neutral-100"}`}>
      {s}
    </span>
  );
}

export function fmtTime(d: Date | null | undefined): string {
  return d ? d.toISOString().replace("T", " ").slice(0, 19) + "Z" : "—";
}
