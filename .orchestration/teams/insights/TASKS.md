# TASKS — team INSIGHTS (Phase 1)

Worktree `D:/Personal/Projects/DardaChat-wt/insights` (branch `team/insights`), DB 54327, web 3007. All paths below are
relative to `web/`. Tick `[x]` when the acceptance check passes and paste the evidence (command + one-line result).
`[~]` partial (say where it stopped), `[!]` blocked (say why).

**Ownership (leader decision D-INS-1, see LEADER.md):** the brief's `modules/reports|privacy|events` map onto the existing
contract module `src/modules/insights/**` (CONTRACTS.md: "Owner: INSIGHTS"): code lives in `src/modules/insights/`
sub-folders `reports/`, `privacy/`, `events/`, `system/`, `ui/`. Messages go in the registered namespace
`messages/<ar|en>/insights.json` (the brief's `reports.json`/`privacy.json` are not registered in
`lib/i18n/namespaces.ts`, so they would never load). Other owned paths: `app/[locale]/admin/page.tsx`,
`app/[locale]/admin/{reports,privacy,events,system}/**`, `app/[locale]/(store)/account/privacy/**`,
`app/api/{reports,privacy}/**`, `tests/e2e/insights/**`. Reports/privacy read (and erasure writes) other modules'
tables through the `@/db/schema` barrel — a cross-cutting read model, never another module's `service.ts` (D-INS-2).

Conventions every task follows: `requireStaff(perm)` first line of every admin page, `staffRoute`/`staffAction` for
admin handlers/actions, `auditedMutation` for staff writes, money = integer agorot rendered as ILS with `PriceTag`/money
lib, business days Asia/Jerusalem via `@/lib/time`, every string ar+en (real Arabic), logical CSS only, `<Bdi>` around
user data, tokens not Tailwind palette. Each task ends with `npx tsc --noEmit` clean + its tests green + a commit.

## Setup
- [x] INS-00 — Environment (leader). Worktree, `npm ci`, `.env.local` (54327/3007), `db:reset`, typecheck + tests green.
  Accept: `npm run typecheck` 0 errors; `npm test` green. Evidence: see LEADER.md "Environment".

## Reports (FR-RPT-001..007)
- [ ] INS-01 — Skeleton + period maths. SRS: FR-RPT-001, FR-RPT-005.
  Files: `src/modules/insights/reports/period.ts` (+ `.test.ts`), `messages/{ar,en}/insights.json` (base keys),
  `src/modules/insights/README.md` (layout + decisions D-INS-1..3).
  `resolvePeriod({ preset: today|yesterday|last7|last30|thisMonth|lastMonth|custom, from?, to? }, now)` → `{ from, to }`
  as UTC instants of Asia/Jerusalem business-day boundaries (half-open `[from, to)`), `priorPeriod(p)` (same length,
  immediately before), `isClosed(p, now)` (`to <= now`). DST-safe (test the March/October Jerusalem transitions).
  Accept: `npx vitest run --project unit src/modules/insights` green (≥ 10 cases incl. DST, month edges); tsc clean.
- [ ] INS-02 — Report fixtures for integration tests. SRS: FR-RPT-001/002 (test base).
  Files: `src/modules/insights/test-fixtures.ts` (int-test only), `src/modules/insights/reports/fixtures.int.test.ts`.
  Helper that inserts, with pinned timestamps, customers, products/variants/collections, orders + order_lines +
  order_events (placed, paid, cancelled-after-period-end cases) and `visit.*` business events, returning the expected
  figures. Uses the test DB (`dardachat_test`), cleans only its own rows.
  Accept: `npx vitest run --project integration src/modules/insights` green.
- [ ] INS-03 — Dashboard metrics service. SRS: FR-RPT-001, 005, 006, 007.
  Files: `src/modules/insights/reports/dashboard.ts` (+ `.int.test.ts`).
  `getDashboardMetrics(period, ctx)` → revenue (Σ `orders.total` of orders placed in period that were not cancelled
  **as of period end**, judged from `order_events` with `occurred_at < to`), order count, AOV (integer agorot,
  round half up), visits (distinct `visit.*` aggregate ids) and conversion (orders from tracked visits / visits,
  null when no visits), each with the prior-period value and delta. Currency guard: only `ILS` rows (FR-RPT-007).
  Accept: int tests reconcile all four figures with the fixture; reproducibility test: same closed period with
  `ctx.now` = +0 d and +7 d, after inserting a cancellation dated after period end → identical results.
- [ ] INS-04 — Admin dashboard home. SRS: FR-RPT-001, 006, CI-004 (banner).
  Files: `app/[locale]/admin/page.tsx`, `src/modules/insights/ui/{KpiCard,PeriodPicker,DegradedBanner}.tsx`,
  messages, `tests/e2e/insights/dashboard.spec.ts`.
  Period presets + custom range in searchParams; four KPI cards with prior value + delta arrow (RTL-correct);
  "provisional" badge when the period is open; revenue/AOV only with `reports.financial` (Owner) — Staff sees orders
  + conversion; banner when `getServiceHealth()` has any non-up service (links `/admin/system`); keep the existing
  "sections" list below the KPIs.
  Accept: e2e (owner-session fixture) loads `/ar/admin` and `/en/admin`, shows 4 KPI cards, `dir=rtl` on ar, period
  switch changes the URL + figures; a Staff session sees no revenue card; tsc + `messages`/`no-literals`/`logical-classes`
  unit tests green.
- [ ] INS-05 — Sales by product / variant / collection. SRS: FR-RPT-002, 005..007.
  Files: `src/modules/insights/reports/sales.ts` (+ `.int.test.ts`).
  `getSalesReport(period, groupBy: product|variant|collection, ctx)` → rows `{ key, nameAr, nameEn, sku?, qty,
  gross (Σ line_total), share }` + totals, same as-of-period-end cancellation rule as INS-03; a product in 2
  collections counts in both (documented, totals row = distinct order lines).
  Accept: int test — product and variant totals reconcile exactly with the fixture's order_lines; collection report
  matches hand-computed membership.
- [ ] INS-06 — Reports UI + CSV export. SRS: FR-RPT-002, 004, 006, 007.
  Files: `app/[locale]/admin/reports/page.tsx` (+ sub-routes/tabs), `app/api/reports/[report]/route.ts`,
  `src/modules/insights/reports/csv.ts` (+ `.test.ts`), messages, `tests/e2e/insights/reports.spec.ts`.
  Tabs: overview (dashboard figures), sales by product / variant / collection, funnel (filled by INS-08). Every table
  has "Export CSV" → `/api/reports/<report>?preset=…&from=…&to=…&locale=…` (`staffRoute("reports.operational")`,
  monetary reports need `reports.financial`), produced from the SAME service call as the screen; RFC 4180 quoting,
  UTF-8 BOM (Excel + Arabic), headers in the chosen locale, money as ILS major units with 2 decimals, Latin digits.
  Accept: unit tests for CSV quoting/BOM/amount formatting; int test: CSV body figures == service figures for the
  fixture; e2e downloads each CSV and compares row count with the on-screen table.
- [ ] INS-07 — Funnel tracking ingestion (first-party, consent-gated). SRS: FR-RPT-003, NFR-PRV-004.
  Files: `app/api/reports/track/route.ts`, `src/modules/insights/reports/tracking.ts` (+ `.int.test.ts`),
  `src/modules/insights/client.ts` (client-safe public entry, D-INS-3: `trackFunnel(stage, data)`, consent helpers).
  Stages → business events `visit.catalog_viewed|cart_added|checkout_started|purchased` (aggregate `visit`, id =
  `dc_vid` cookie). Route refuses (204, nothing stored) unless cookie `dc_consent` grants `analytics`; `dc_vid` is set
  only after consent; acquisition source on first event of a visit = `utm_source` → referrer host → `direct`;
  `purchased` carries `orderId`; per-IP rate limit via auth `rateLimit`. `trackFunnel` is a no-op without consent.
  Accept: int tests — no consent → 0 rows; consent → rows with source; bad stage → 400; tsc.
- [ ] INS-08 — Funnel + acquisition report. SRS: FR-RPT-003, 004.
  Files: `src/modules/insights/reports/funnel.ts` (+ `.int.test.ts`), reports funnel tab, CSV report `funnel`,
  `acquisition`.
  Distinct visits reaching each of the 4 stages in period, conversion + drop-off between consecutive stages, split by
  acquisition source; orders/revenue per source via the `purchased` event's orderId.
  Accept: int test — counts per stage equal the fixture's recorded events exactly; CSV == screen (extend the INS-06
  e2e).

## Consent (NFR-PRV-004)
- [ ] INS-09 — Cookie/consent banner + analytics gate. SRS: NFR-PRV-004, NFR-PRV-002 (cookie side).
  Files: `src/modules/insights/ui/ConsentBanner.tsx` (client), `src/modules/insights/ui/AnalyticsGate.tsx`,
  `src/modules/insights/client.ts`, messages, `tests/e2e/insights/consent.spec.ts`.
  Banner: "Accept analytics" / "Essential only" with equal weight + "Cookie settings" re-open link; writes `dc_consent`
  (`{ v:1, analytics, marketing, at }`, 180 days, SameSite=Lax); withdraw = same one click. When the visitor is a
  signed-in customer also `engagement.recordConsent({ purpose: "analytics", source: "cookie_banner" })` via
  `POST /api/privacy/consent`. `AnalyticsGate` renders its children (trackers) only after consent.
  Mount: CHANGE-REQUEST to STOREFRONT to render `<ConsentBanner/>` in `app/[locale]/(store)/layout.tsx`; in this branch
  it is mounted on our own store pages (`account/privacy/**`) for testing.
  Accept: e2e with network capture — before consent no request to `/api/reports/track`; after "Accept" one tracked
  request; after "Essential only" none; banner RTL in ar; keyboard reachable.

## Business event history (NFR-MNT-005)
- [ ] INS-10 — Order / customer story view. SRS: NFR-MNT-005, FR-RPT (support).
  Files: `src/modules/insights/events/story.ts` (+ `.int.test.ts`), `app/[locale]/admin/events/page.tsx`
  (+ `[kind]/[id]/page.tsx` if needed), `src/modules/insights/events/labels.ts`, messages,
  `tests/e2e/insights/events.spec.ts`.
  Search by order reference (`DC-XXXX-XXXX`), customer phone/email, or aggregate id; timeline (oldest → newest,
  Asia/Jerusalem display) merging `business_events` for the order, its payments/shipments/messages (payload `orderId`)
  and the customer, plus `orders.listOrderEvents` and `payments.getPaymentSummary` via contracts; filters by type
  family (order, payment, stock, message, service); `before` cursor paging; labels for known types, generic fallback.
  Permission `reports.operational`. Nav item: CHANGE-REQUEST (see LEADER.md).
  Accept: int test builds a seeded "problem order" (placed → payment failed → retried → dispatched → delivery failed →
  message sent) and `getOrderStory` returns every step in order; e2e opens the story by reference in ar + en.

## System panel (CI-004)
- [ ] INS-11 — Degraded services panel. SRS: CI-004.
  Files: `app/[locale]/admin/system/page.tsx`, `src/modules/insights/system/overview.ts` (+ `.int.test.ts`), messages,
  `tests/e2e/insights/system.spec.ts`.
  Per service (`SERVICES`): status up/degraded/down, since, last error, recent `service.degraded|recovered` events;
  job_locks (last run, status, error); open dead letters count. Permission `settings.read`.
  Accept: e2e sets `setFault("sms","down")` via `/ar/dev/services` or a direct `reportDegradation`, the panel and the
  dashboard banner show SMS down; after `reportRecovery` both clear.

## Privacy (FR-ACC-008, FR-DAT-001, 004..010, NFR-PRV-001/003/007)
- [ ] INS-12 — Data-request service + verification. SRS: FR-DAT-009, FR-DAT-010, FR-ACC-008.
  Files: `src/modules/insights/privacy/requests.ts` (+ `.int.test.ts`), `app/api/privacy/requests/**` (customerRoute).
  `createDataRequest(customerId, kind)` (one open request per kind) → `auth.issueOtp` purpose `data_request` to the
  contact channel already held (phone → WhatsApp/SMS, else email); `verifyDataRequest(id, code)` sets `verifiedAt`,
  status `verified`, `dueAt` = verifiedAt + 30 d (setting `insights.privacy.window_days`); manual route
  `recordManualRequest({ contact, customerId?, note })` + `recordManualCheck(id, note)` (staff, audited, never
  auto-actioned); business events `data_request.received|verified|completed|rejected`.
  Accept: int tests — unauthenticated POST → 401; wrong/expired code → no verification; right code → verified with
  dates; manual check recorded against the customer.
- [ ] INS-13 — Machine-readable export. SRS: FR-DAT-005, FR-ACC-008.
  Files: `src/modules/insights/privacy/export.ts` (+ `.int.test.ts`), `src/modules/insights/privacy/categories.ts`
  (THE personal-data category map: table → columns → purpose → retention category; reused by INS-14/17/18),
  `src/modules/insights/jobs.ts` (`insights.privacy.process`), `app/api/privacy/requests/[id]/export/route.ts`.
  JSON (`schemaVersion`, `generatedAt`, one key per category: profile, addresses, orders+lines, payments, invoices,
  consents, messages, assistant conversations, journey results, back-in-stock requests, carts, data requests) saved
  via `storage.put`; request → `completed` with `completedAt`; download only by the owning customer.
  Accept: int test seeds ≥ 1 row in every category for one customer → export contains each; another customer's
  export route → 404; job is idempotent (second run no new file).
- [ ] INS-14 — Erasure by de-identification. SRS: FR-DAT-004, 007, 008.
  Files: `src/modules/insights/privacy/erase.ts` (+ `.int.test.ts`).
  One transaction inside `withErasure` + `withActor`: customer → status `erased`, identifying fields → fixed
  placeholder; addresses, carts, sessions, OTPs, back-in-stock contacts removed/redacted; orders/invoices/credit notes
  keep amounts, identifying snapshot fields replaced; messages `to`/`text` redacted; consent evidence + business event
  payload PII + audit before/after redacted; journey results de-linked; run by `insights.privacy.process` for verified
  deletion requests.
  Accept: int test — after erasure a scan of EVERY text/varchar/jsonb column of every table finds none of the
  subject's name/phone/email; an order with an issued invoice keeps identical amounts; no row deleted from any
  append-only table; request `completed`.
- [ ] INS-15 — Customer privacy page. SRS: FR-ACC-008, FR-DAT-009, NFR-PRV-003 (link).
  Files: `app/[locale]/(store)/account/privacy/page.tsx` (+ client form components in `src/modules/insights/ui/`),
  messages, `tests/e2e/insights/privacy-account.spec.ts`.
  `requireCustomer`; my requests with requested/verified/completed dates + due date; "Export my data" / "Delete my
  account" (clear consequences, financial records kept de-identified) → code sent to masked contact → code entry →
  status; download link for completed exports; ConsentBanner mounted here (INS-09).
  Accept: e2e — sign up a customer, request export, read the OTP from `/api/dev/outbox?to=`, verify, run
  `npm run jobs -- --once insights.privacy.process`, download valid JSON; deletion flow ends signed out with the
  customer erased; ar RTL + en.
- [ ] INS-16 — Owner privacy admin + 30-day alert. SRS: FR-DAT-009, FR-DAT-010.
  Files: `app/[locale]/admin/privacy/page.tsx`, `app/[locale]/admin/privacy/[id]/page.tsx`,
  `src/modules/insights/privacy/window.ts` (+ `.int.test.ts`), jobs (`insights.privacy.window_alert`, hourly,
  idempotent), messages, `tests/e2e/insights/privacy-admin.spec.ts`.
  `privacy.manage` (Owner only). Table: kind, subject (masked), route (account/manual), requested / verified / due /
  completed, days left, overdue/approaching highlight; forms for manual request + manual identity check
  (`staffAction`, audited); dashboard shows "privacy requests due" count for Owners. Alert: unfulfilled request with
  ≤ 5 days left → `core.sendMessage` email to every active Owner (dedupe per request) + event
  `data_request.window_alerted`.
  Accept: int test with `ctx.now` = verified + 26 d → one alert per Owner, re-run sends nothing new; e2e page loads
  as Owner, Staff gets `/staff/forbidden`.
- [ ] INS-17 — Retention settings + purge framework. SRS: FR-DAT-001 (framework for FR-DAT-002/003).
  Files: `src/modules/insights/privacy/retention.ts` (+ `.int.test.ts`), `src/modules/insights/seed.ts`,
  jobs (`insights.retention.purge`, daily), `app/[locale]/admin/privacy/retention/page.tsx`, messages.
  Categories (seeded, editable months/days, audited, `privacy.manage`): analytics visits (`visit.*` events),
  expired sessions/OTPs/rate-limit hits, privacy export files, anonymous carts, assistant conversations,
  journey_results / journey_anonymous (purger delegated to JOURNEY: CHANGE-REQUEST for an exported purge fn; until
  then a no-op purger that reports "delegated"). Each purger idempotent, returns counts; job records
  `retention.purged` event per run.
  Accept: int tests per purger with pinned `ctx.now` (old rows gone, fresh rows kept, second run = 0); editing a period
  writes an audit entry; e2e page loads.
- [ ] INS-18 — Privacy notice facts + hosting region. SRS: NFR-PRV-001, NFR-PRV-003, NFR-PRV-007.
  Files: `src/modules/insights/ui/PrivacyNoticeFacts.tsx`, `app/[locale]/(store)/account/privacy/notice/page.tsx`
  (public, no sign-in), setting `insights.hosting_region` (ar/en text, edited on `/admin/privacy/retention`), messages.
  Renders the CMS privacy policy (`catalog.getPolicy("privacy", locale)`) followed by generated facts from
  `categories.ts`: each collected field → purpose, retention period (from `retention_settings`), rights + how to use
  them (link to `/account/privacy`), hosting region of datastore and backups. CHANGE-REQUEST to CATALOG/STOREFRONT to
  render `PrivacyNoticeFacts` on `/policies/privacy`.
  Accept: e2e — notice renders in ar and en with every category, a retention period, the rights section and the
  configured region; changing the region setting changes the page.

## Close-out
- [ ] INS-19 — Contract, docs and full verification.
  Files: `src/modules/insights/index.ts` (add any exports other teams need), `src/modules/contracts.test.ts` (insights
  entry only), `ROOT/.orchestration/CONTRACTS.md` (insights section), `src/modules/insights/README.md`.
  Accept: `npm run verify` green; `npx playwright test tests/e2e/insights` green on port 3007; `git grep -n
  "STUB(contracts)" web/src/modules/insights` empty; CHANGE-REQUESTS/BACKLOG entries present; leader sign-off in
  LEADER.md.
