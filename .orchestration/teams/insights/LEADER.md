# LEADER — team INSIGHTS — Phase 1

## Plan rationale
- Order = value + dependency: period maths → fixtures → dashboard service → dashboard page (app runs with real
  figures early, staff land on `/admin`) → sales + CSV → funnel ingestion → funnel report → consent banner → event
  history → system panel → privacy (requests → export → erasure → account page → admin + alert → retention → notice)
  → contract/docs/full verify. Each task is 1–2 h, leaves tsc + tests green, and carries its own test.
- Other modules are stubs in this branch: every report/privacy test seeds its own rows directly (INS-02 fixtures)
  into `dardachat_test`; nothing waits on another team. Funnel events that storefront will emit later are simulated
  by the fixtures + the `/api/reports/track` route.
- Decisions D-INS-1..6 are in `ROOT/.orchestration/DECISIONS.md` (module path + namespace, direct schema reads for
  read models/erasure, `@/modules/insights/client` entry, consent-gated first-party funnel, as-of-period-end figures,
  financial figures Owner-only). Change requests filed 2026-09-27 08:30 (admin nav paths + events item, banner mount
  + trackFunnel calls in storefront, notice facts on `/policies/privacy`, journey purge fn).

## Risks
1. Erasure completeness (FR-DAT-004): a personal-data column added later by another team escapes the routine.
   Mitigation: INS-14's test scans every text/jsonb column of every table, so a new PII column fails the test at
   integration; categories map is the single list.
2. Append-only triggers vs erasure: only `withErasure` may UPDATE ledger rows; never DELETE. Test asserts row counts.
3. Funnel "matches recorded events" needs storefront to emit events — until integration only our route + fixtures.
4. Reproducibility depends on `order_events` being the only source of cancellation time (ORDERS owns it; they append
   `cancelled` events — confirmed by the append-only journal design).
5. Admin nav paths belong to PLATFORM: our pages are reachable by URL; sidebar links fixed at integration (CR).
6. Windows/e2e flakiness: cold dev server compile; use the warm-up globalSetup and owner-session fixture.

## How I validate each batch
- Re-run the task's acceptance command myself (not only the worker's paste), `npx tsc --noEmit`, the insights
  unit/int tests, and for UI tasks load the page on http://localhost:3007 in ar + en (Playwright spec or browser).
- Check SRS acceptance wording for the ids the task claims; check Arabic is real, RTL correct, money shown as ILS.
- Verdicts logged below (task, verdict, evidence, open concerns).

## Environment
- (filled below after setup)

## Review log
- (none yet)
