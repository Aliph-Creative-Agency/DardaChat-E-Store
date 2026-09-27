import { desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { jobLocks } from "@/modules/core/schema";
import { dbOf } from "@/lib/context";
import { FAULT_MODES, getFaults } from "@/lib/faults";
import { getServiceHealth } from "@/lib/health";
import { stubWarnings } from "@/lib/stub";
import { assertDevOnly, Cell, DevNav, DevTable, fmtTime, StatusBadge } from "../devtools";
import { markUpAction, setFaultAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Dev only (CI-004 QA): health of every external service, a fault toggle per service (down / slow / flaky, stored in
 * settings `dev.faults`; env FAULTS wins), recent scheduled jobs, and contract stubs hit by this server process.
 */
export default async function DevServicesPage({ params }: PageProps<"/[locale]/dev/services">) {
  if (!assertDevOnly()) notFound();
  const { locale } = await params;
  const [health, faults, jobs] = await Promise.all([
    getServiceHealth(),
    getFaults(),
    dbOf().select().from(jobLocks).orderBy(desc(jobLocks.lastRunAt)).limit(50),
  ]);
  const envFaults = process.env.FAULTS?.trim();
  const stubs = stubWarnings();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8" dir="ltr" lang="en">
      <DevNav locale={locale} current="services" />
      <h1 className="mb-1 text-2xl font-bold">Services</h1>
      <p className="mb-4 text-sm text-neutral-600">
        Degradation registry (<code>service_health</code>) and fault injection for QA. A fault applies to every call made
        through <code>callExternal()</code>; status changes after the next call fails or succeeds.
        {envFaults ? (
          <>
            {" "}
            Env <code>FAULTS={envFaults}</code> is set and overrides these toggles.
          </>
        ) : null}
      </p>

      <DevTable head={["Service", "Status", "Since (UTC)", "Last checked", "Last error", "Injected fault", ""]}>
        {health.map((h) => {
          const fault = faults[h.service] ?? "";
          return (
            <tr key={h.service} data-service={h.service}>
              <Cell mono>{h.service}</Cell>
              <Cell>
                <StatusBadge status={h.status} />
              </Cell>
              <Cell mono>{fmtTime(h.since)}</Cell>
              <Cell mono>{fmtTime(h.lastCheckedAt)}</Cell>
              <Cell wrap>{h.lastError ?? ""}</Cell>
              <Cell>
                <form action={setFaultAction} className="flex items-center gap-2">
                  <input type="hidden" name="service" value={h.service} />
                  <input type="hidden" name="locale" value={locale} />
                  <label className="sr-only" htmlFor={`fault-${h.service}`}>
                    Fault for {h.service}
                  </label>
                  <select
                    id={`fault-${h.service}`}
                    name="mode"
                    defaultValue={fault}
                    className="rounded border border-neutral-300 px-2 py-1 text-sm"
                  >
                    <option value="">none</option>
                    {FAULT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded bg-neutral-900 px-3 py-1 text-xs text-white">
                    Apply
                  </button>
                </form>
              </Cell>
              <Cell>
                {h.status !== "up" ? (
                  <form action={markUpAction}>
                    <input type="hidden" name="service" value={h.service} />
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit" className="rounded border border-neutral-300 px-3 py-1 text-xs">
                      Mark up
                    </button>
                  </form>
                ) : null}
              </Cell>
            </tr>
          );
        })}
      </DevTable>

      <h2 className="mt-10 mb-2 text-xl font-semibold">Scheduled jobs</h2>
      <p className="mb-2 text-sm text-neutral-600">
        From <code>job_locks</code>. Run one by hand: <code>npm run jobs -- --once &lt;name&gt;</code>.
      </p>
      <DevTable head={["Job", "Last run (UTC)", "Last status", "Last error", "Locked until", "Locked by"]} empty={jobs.length === 0}>
        {jobs.map((j) => (
          <tr key={j.name}>
            <Cell mono>{j.name}</Cell>
            <Cell mono>{fmtTime(j.lastRunAt)}</Cell>
            <Cell>
              <StatusBadge status={j.lastStatus} />
            </Cell>
            <Cell wrap>{j.lastError ?? ""}</Cell>
            <Cell mono>{fmtTime(j.lockedUntil)}</Cell>
            <Cell mono>{j.lockedBy ?? "—"}</Cell>
          </tr>
        ))}
      </DevTable>

      <h2 className="mt-10 mb-2 text-xl font-semibold">Contract stubs hit by this server</h2>
      {stubs.length === 0 ? (
        <p className="text-sm text-neutral-500">None yet in this process.</p>
      ) : (
        <ul className="list-disc ps-6 font-mono text-xs">
          {stubs.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
