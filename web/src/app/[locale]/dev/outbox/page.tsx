import { and, desc, eq, isNull, type SQL } from "drizzle-orm";
import { Link } from "@/lib/i18n/navigation";
import { notFound } from "next/navigation";
import { deadLetters } from "@/modules/core/schema";
import { messages } from "@/modules/engagement/schema";
import { CHANNELS } from "@/lib/channels";
import { dbOf } from "@/lib/context";
import { assertDevOnly, Cell, DevNav, DevTable, fmtTime, StatusBadge } from "../devtools";

export const dynamic = "force-dynamic";

const STATUSES = ["queued", "sending", "sent", "failed", "dead"] as const;
type Status = (typeof STATUSES)[number];
type Channel = (typeof CHANNELS)[number];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Dev only: every mock email / WhatsApp / SMS the app has "sent" (the outbox), newest first, plus open dead letters. */
export default async function DevOutboxPage({ searchParams }: PageProps<"/[locale]/dev/outbox">) {
  if (!assertDevOnly()) notFound();
  const sp = await searchParams;
  const channel = one(sp.channel);
  const status = one(sp.status);
  const to = one(sp.to);

  const filters: SQL[] = [];
  if (channel && (CHANNELS as readonly string[]).includes(channel)) filters.push(eq(messages.channel, channel as Channel));
  if (status && (STATUSES as readonly string[]).includes(status)) filters.push(eq(messages.status, status as Status));
  if (to) filters.push(eq(messages.to, to));

  const db = dbOf();
  const rows = await db
    .select()
    .from(messages)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(messages.createdAt))
    .limit(200);
  const letters = await db
    .select()
    .from(deadLetters)
    .where(isNull(deadLetters.resolvedAt))
    .orderBy(desc(deadLetters.createdAt))
    .limit(100);

  const href = (next: { channel?: string; status?: string }) => {
    const q = new URLSearchParams();
    const c = "channel" in next ? next.channel : channel;
    const s = "status" in next ? next.status : status;
    if (c) q.set("channel", c);
    if (s) q.set("status", s);
    if (to) q.set("to", to);
    const qs = q.toString();
    return `/dev/outbox${qs ? `?${qs}` : ""}`;
  };
  const chip = (label: string, target: string, active: boolean) => (
    <Link
      key={label + target}
      href={target}
      className={`rounded-full border px-3 py-0.5 text-xs ${active ? "border-ink bg-ink text-white" : "border-line-strong"}`}
    >
      {label}
    </Link>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8" dir="ltr" lang="en">
      <DevNav current="outbox" />
      <h1 className="mb-1 text-2xl font-bold">Outbox</h1>
      <p className="mb-4 text-sm text-ink-soft">
        Newest 200 messages from <code>messages</code> (mock WhatsApp / SMS / email). Retries run in job{" "}
        <code>core.outbox.dispatch</code>. JSON: <code>/api/dev/outbox?to=…</code>
      </p>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="w-16 text-xs text-ink-soft">Channel</span>
        {chip("all", href({ channel: undefined }), !channel)}
        {CHANNELS.map((c) => chip(c, href({ channel: c }), channel === c))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="w-16 text-xs text-ink-soft">Status</span>
        {chip("all", href({ status: undefined }), !status)}
        {STATUSES.map((s) => chip(s, href({ status: s }), status === s))}
        {to ? <span className="text-xs">to = <code>{to}</code></span> : null}
      </div>

      <DevTable
        head={["Time (UTC)", "Channel", "To", "Event", "Locale", "Status", "Attempts", "Subject / text", "Provider ref", "Error"]}
        empty={rows.length === 0}
      >
        {rows.map((m) => {
          const payload = m.payload as { text?: string; subject?: string | null };
          return (
            <tr key={m.id} data-message-id={m.id}>
              <Cell mono>{fmtTime(m.createdAt)}</Cell>
              <Cell>{m.channel}</Cell>
              <Cell mono>{m.to}</Cell>
              <Cell mono>{m.eventKey}</Cell>
              <Cell>{m.locale}</Cell>
              <Cell>
                <StatusBadge status={m.status} />
              </Cell>
              <Cell>{m.attempts}</Cell>
              <Cell wrap>
                {payload.subject ? <strong className="block">{payload.subject}</strong> : null}
                <span dir="auto" className="whitespace-pre-wrap">
                  {payload.text ?? ""}
                </span>
              </Cell>
              <Cell mono>{m.providerRef ?? "—"}</Cell>
              <Cell wrap>{m.error ?? ""}</Cell>
            </tr>
          );
        })}
      </DevTable>

      <h2 className="mt-10 mb-2 text-xl font-semibold">Open dead letters</h2>
      <DevTable head={["Time (UTC)", "Source", "Reference", "Attempts", "Error"]} empty={letters.length === 0}>
        {letters.map((d) => (
          <tr key={d.id}>
            <Cell mono>{fmtTime(d.createdAt)}</Cell>
            <Cell mono>{d.source}</Cell>
            <Cell mono>{d.reference ?? "—"}</Cell>
            <Cell>{d.attempts}</Cell>
            <Cell wrap>{d.error}</Cell>
          </tr>
        ))}
      </DevTable>
    </main>
  );
}
