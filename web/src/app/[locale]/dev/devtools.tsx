/**
 * Shared bits for the dev-only pages under /[locale]/dev (outbox, services). English only, plain and readable;
 * these pages 404 in production. Logical CSS properties only (ps/pe/text-start) so they work in rtl and ltr.
 */
import { Link } from "@/lib/i18n/navigation";
import type { ReactNode } from "react";

export function assertDevOnly(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function DevNav({ current }: { current: "outbox" | "services" }) {
  const item = (key: "outbox" | "services", label: string) => (
    <Link
      href={`/dev/${key}`}
      className={`rounded px-3 py-1 text-sm ${current === key ? "bg-ink text-white" : "bg-paper-deep hover:bg-line"}`}
      aria-current={current === key ? "page" : undefined}
    >
      {label}
    </Link>
  );
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2" aria-label="Dev tools">
      <span className="pe-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Dev tools</span>
      {item("outbox", "Outbox")}
      {item("services", "Services")}
      <Link href="/" className="ms-auto text-sm underline">
        Back to site
      </Link>
    </nav>
  );
}

export function DevTable({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded border border-line-strong">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-paper-deep">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="border-b border-line-strong px-3 py-2 text-start font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-3 py-4 text-ink-soft">
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
      className={`border-b border-line-strong px-3 py-2 align-top ${mono ? "font-mono text-xs" : ""} ${wrap ? "max-w-md break-words" : "whitespace-nowrap"}`}
    >
      {children}
    </td>
  );
}

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-success-soft text-success",
  up: "bg-success-soft text-success",
  ok: "bg-success-soft text-success",
  queued: "bg-info-soft text-info",
  sending: "bg-info-soft text-info",
  failed: "bg-warning-soft text-warning",
  degraded: "bg-warning-soft text-warning",
  dead: "bg-danger-soft text-danger",
  down: "bg-danger-soft text-danger",
  error: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "—";
  return (
    <span data-status={s} className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s] ?? "bg-paper-deep"}`}>
      {s}
    </span>
  );
}

export function fmtTime(d: Date | null | undefined): string {
  return d ? d.toISOString().replace("T", " ").slice(0, 19) + "Z" : "—";
}
