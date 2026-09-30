# Leader log — platform/contracts (W4)

## Plan rationale (relay #0, 2026-09-26)
- 14 tasks in 3 groups: A platform services (PLC-01..07) → B module contracts (PLC-08..13) → C close-out (PLC-14).
  Services first because contracts use them (catalog uses `mediaUrl`, engagement.notify uses `sendMessage`,
  orders.placeOrder uses events/inventory/payments/engagement). Contracts ordered by dependency:
  core/insights → catalog → inventory → payments → engagement → orders.
- `sendMessage` (PLC-04) is early and its exact signature was published in DECISIONS.md during planning, because lane
  W2 (auth) sends OTPs through it in parallel and must code against it before our branch merges.
- Stub policy (BRIEF): real simple reads on the seeded DB, thin real writes where cheap, typed plausible values /
  `NotImplementedError` for owned logic, all marked `STUB(contracts)` so integration can grep leftovers. Rationale:
  9 Phase 1 teams develop against these stubs in isolated worktrees; realistic data beats constants.
- A manifest test (`src/modules/contracts.test.ts`) pins every contract's export names; tsc pins signatures. Phase 1
  teams must keep it green, which makes contract drift visible at merge time.
- File-ownership split vs W2/W3 recorded in DECISIONS.md (errors/context/settings/adapters/channels/jobs/storage/dev
  routes/instrumentation are ours; auth module + session/audit/rate-limit/phone are W2; i18n/layout/UI/messages W3).
- No `modules/auth/index.ts` from this lane (W2 owns it). No README edits (merge leader writes FOUNDATION-NOTES).
- Deliberate omissions → BACKLOG.md: durable queue, CDN storage, analytics/error-monitoring provider, active probes.

## Risks
1. W2 creates its own `src/lib/errors.ts` or messaging shim → merge conflict. Mitigation: DECISIONS.md published at
   planning time; merge leader keeps ours and adapts W2 imports (small).
2. `instrumentation.ts` starting jobs during `next build`/tests. Mitigation: nodejs-runtime + `JOBS_MODE` guard, never
   start under vitest; PLC-05 acceptance checks `npm run build` is unaffected via verify + dev check.
3. `for update skip locked` / lease SQL via drizzle — raw `sql` template is fine; must use snake_case column names.
4. Cross-module import cycles (orders ↔ payments ↔ engagement). Mitigation: functions only at module level, no
   top-level calls; types in `types.ts` imported with `import type`.
5. Schema gaps discovered while writing DTOs (e.g. a missing column). Rule: prefer app-side derivation; a schema edit
   needs a DECISIONS.md line and `db:setup` + schema-all test update (W2 may edit schema too → keep edits tiny).

## How I validate each batch
- `git diff --stat main..HEAD` → only owned paths (BRIEF). `npm run verify` green; targeted tests of the task read
  once for real assertions (not just existence); task acceptance re-run by me; for UI tasks load the page on 3012.
- Spot SRS checks: CI-003 (timeout/backoff/dead letter numbers), CI-004 (fault → degraded visible), VAT example,
  Appendix A transitions via assertTransition, Arabic text real (not placeholders), money integer agorot.

## Environment (set up by leader relay #0)
- Worktree `D:/Personal/Projects/DardaChat-wt/platform-contracts` on `platform/contracts` from main @ 827abc4.
- `web/.env.local` from `.env.example` with 54332/3012 and fresh SESSION_SECRET / PAYMENT_WEBHOOK_SECRET.

## Review log
- Relay #0 env check: npm ci ok; db:start/setup/seed ok on 54332; npm run verify → 16 files / 415 tests pass (main @ 827abc4).
- Relay #2 leader validation (2026-09-26, platform/contracts @ 59356d7), covers PLC-01..PLC-14 (no earlier batch
  review was logged, so I validated all of them). **Verdict: all 14 ACCEPTED. The lane is ready to merge.**
  - Ownership: `git diff --name-only main..HEAD` has 81 files, all owned. The only extras are allowed: lib `*.int.test.ts`,
    `modules/contracts.test.ts` (PLC-08), `modules/core/test-seed.ts` (a module helper), and the `jobs` script, the
    `JOBS_MODE` line and `.gitignore` `/storage/` (documented in PLC-06). No schema, seed or state-machine edits.
  - `npm run verify`: tsc, eslint and vitest give 31 files / 503 tests, exit 0. `db:reset` ok. `npx playwright test`: 6 passed.
  - Code read: `callExternal` (fault, timeout, backoff 200·2^n+jitter, permanent error stops, dead letter, degradation
    and recovery only on a state change), orders `placeOrder`/`transition`, `notify`, and the Arabic default texts
    (real Arabic).
  - Live on the dev DB through the public contracts: 5 products (Arabic names). COD order DC-WKS3-RXBS went to
    COD_CONFIRMED/COD_DUE with total 9900 = 7900 + 2000 and VAT 1366 contained (16/116). Replaying it returned the
    same id. Availability 22 → 21. Illegal DELIVERED → `invalid_transition`. Consent grant → true. VAT example
    11000/1517. Lookup by a spaced lowercase reference works. The estimate for a Thursday skips Friday (earliest
    Sat 26, latest Mon 28).
  - Dev 3012: `/ar` `/en` `/ar/dev/outbox` `/ar|/en/dev/services` all 200. Unknown routes 404. The `/api/dev/outbox?to=`
    JSON shows the Arabic `order.confirmation` sent by WhatsApp. The in-process scheduler dispatched it.
    `/api/storage/..%2F.env.local` → 404. `npm run jobs -- --list` and `--once core.outbox.dispatch` → ok, exit 0.
  - UI (screenshots): the outbox and services pages are clean and readable, with filters, status pills and fault
    toggles. The job table and the stubs panel render. After hydration the pages have 0 console errors.
  - Non-issues noted: Playwright's `screenshot()` hides the caret by injecting `caret-color`, and doing that before
    hydration causes a hydration-mismatch log (a test artifact, not the app). `db:stop` fast mode hung on orphan
    backends after I killed the dev server with `taskkill`; `pg_ctl stop -m immediate` stopped it cleanly.
  - Merge notes for the platform leader: see HANDOVER "Next move".
- Leader re-check after the usage-limit resume (2026-09-27, platform/contracts @ 59356d7). There are no new commits since the
  validation above, and the worker's resume changed code in nothing. Ownership diff unchanged (13 commits, owned paths only).
  `npm run typecheck` + `lint` ok. The first vitest run failed because Postgres was still in crash recovery: the earlier
  `pg_ctl -m immediate` stop left it fsyncing ~6.6k relation files for ~22 min. The next run, right after recovery
  finished, gave 502/503 (a cold-DB timeout; the failing test name wasn't captured). The following three runs were all
  503/503 (31 files). DB stopped cleanly with `npm run db:stop`. **Verdict unchanged: all 14 ACCEPTED, lane team_done.**
  Open concern for the merge leader: if a test ever fails right after a DB start, re-run it before debugging.
