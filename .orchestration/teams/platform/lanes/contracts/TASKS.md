# Tasks — platform / lane contracts (W4) — Phase 0

Order matters: every task leaves `npm run verify` (typecheck + lint + vitest unit+integration) green. Run commands
from `D:/Personal/Projects/DardaChat-wt/platform-contracts/web`; DB must be up (`npm run db:start`, port 54332).
All paths below are under that `web/` unless stated. Mark `[x]` done / `[~]` partial / `[!]` blocked and paste one
line of evidence (command → result, commit sha) under the task. Owned paths: see `BRIEF.md` — nothing else.
Commit per task: `platform(contracts): PLC-NN <summary>` + the Co-Authored-By trailer (PROTOCOL §3).
Use context7 for Next 16 (`instrumentation.ts`, route handlers, server actions) and Drizzle APIs before coding.

## A. Primitives and platform services

- [x] **PLC-01 Shared primitives + contract conventions** — PLAN §2, NFR-MNT (structure)
  - `src/lib/errors.ts`: `AppError(code, message, details?)` with `code` a string union (`not_found`, `invalid_input`,
    `conflict`, `forbidden`, `unauthenticated`, `rate_limited`, `unavailable`, `not_implemented`, `invalid_transition`,
    `insufficient_stock`) + `httpStatus` map, `NotImplementedError`, `isAppError()`.
  - `src/lib/context.ts`: `ServiceContext { db?: DbOrTx; actor?: Actor; now?: Date }` (Actor from `src/db/guards.ts`),
    `dbOf(ctx)` (falls back to `@/db/client`), `nowOf(ctx)`, `systemActor`.
  - `src/lib/settings.ts`: `getSetting<T>(key, schema: ZodType<T>, fallback, ctx?)`, `setSetting(key, value, ctx?)`
    on the `settings` table (upsert). `src/lib/stub.ts`: `stubWarn(name)` (once per process per name).
  - `ROOT/.orchestration/CONTRACTS.md` skeleton: conventions section (layout index/types/service, ctx, errors, stub
    marker + policy from BRIEF, money agorot, locale, how to change a contract) and one empty heading per module.
  - **Accept:** `npx vitest run src/lib/errors src/lib/settings src/lib/stub` pass (settings = integration test on test
    DB: set→get round trip, fallback when missing, zod-invalid value → fallback + warn); `npm run verify` green.
  - Evidence: `npx vitest run src/lib/errors src/lib/settings src/lib/stub` → 3 files / 8 tests pass; `npm run verify` → 19 files / 423 tests, exit 0; commit 218a066.

- [x] **PLC-02 Business events, degradation registry, fault injection** — NFR-MNT-005, CI-004
  - `src/lib/events.ts`: `recordBusinessEvent({ type, aggregateType, aggregateId, payload? }, ctx?)` (insert into
    `business_events`, joins caller tx via ctx.db), `listBusinessEvents({ aggregateType?, aggregateId?, type?, limit?,
    before? }, ctx?)` newest first. Event type naming `<aggregate>.<verb>` documented in CONTRACTS.md.
  - `src/lib/health.ts`: `SERVICES = ["payments","einvoice","whatsapp","sms","email","llm","storage","analytics"] as const`,
    `reportDegradation(service, error, status="degraded"|"down")`, `reportRecovery(service)`, `getServiceHealth()` (all
    services, missing rows = up), `isServiceAvailable(service)`. Upserts `service_health`; also records a business
    event `service.degraded` / `service.recovered` only on a state change (no event spam).
  - `src/lib/faults.ts`: `getFault(service)` from env `FAULTS` (e.g. `whatsapp:down,llm:slow`) overriding settings key
    `dev.faults`; `setFault(service, mode|null)`; modes `down` (throw), `slow` (delay > timeout), `flaky` (fail 1st try).
    Cache settings read for ~2 s to keep adapters cheap.
  - **Accept:** integration tests: event round trip incl. inside a rolled-back tx (row gone); degradation→recovery
    produces exactly 2 events and `getServiceHealth()` reflects each step; env FAULTS beats settings. verify green.
  - Evidence: `npx vitest run src/lib/platform-services` → 7 tests pass; verify → 20 files / 430 tests exit 0; commit dc64fb4.

- [x] **PLC-03 Adapter base: timeout, backoff retry, dead letter** — CI-003, CI-004
  - `src/lib/adapters/call.ts`: `callExternal<T>({ service, operation, fn: (signal: AbortSignal) => Promise<T>,
    timeoutMs=5000, retries=3, baseDelayMs=200, maxDelayMs=5000, deadLetter?: { reference?, payload } , ctx? })`.
    Applies the fault for `service` first; aborts at `timeoutMs`; retries only `TransientError`/timeouts/unknown with
    delay `min(maxDelayMs, baseDelayMs * 2^attempt)` + jitter (injectable `sleep` for tests); `PermanentError` stops
    at once; on final failure writes `dead_letters` (source `<service>.<operation>`, attempts, error) when `deadLetter`
    given, calls `reportDegradation`, throws `AppError("unavailable")` with the cause; on success after degradation
    calls `reportRecovery`. `src/lib/adapters/errors.ts` (`TransientError`, `PermanentError`), `index.ts` barrel.
  - **Accept:** unit tests with fake sleep: delays 200/400/800 for 3 retries; permanent error = 1 attempt; `slow` fault
    returns (rejects) within timeoutMs + 50 ms; integration test: `down` fault → one `dead_letters` row with
    attempts=4 and `service_health` degraded; later success → up. verify green.
  - Evidence: `npx vitest run src/lib/adapters` → 8 tests pass (unit+int); verify → 22 files / 438 tests exit 0; commit 07aa147.

- [x] **PLC-04 Mock channels, outbox and `core.sendMessage`** — CI-003, FR-MSG-004 (transport only), FR-ACC OTP path
  - `src/lib/channels/types.ts` (`ChannelAdapter { channel; send({ to, text, subject?, locale }, signal) → { providerRef } }`),
    `src/lib/channels/mock.ts`: whatsapp/sms/email mocks (validate `to` shape: E.164 phone / email, else
    `PermanentError`; return `mock-<channel>-<nanoid>`), `getChannelAdapter(channel)` (real providers plug in here later).
  - `src/modules/core/messaging.ts`: `sendMessage(input, ctx?)` exactly per the DECISIONS.md signature: for each channel
    in order that has a matching address, insert `messages` row (payload holds `text`/`subject`), `callExternal` with
    small retries (timeout 3 s, 1 retry) → `sent` + `providerRef` + `sentAt`; on failure mark row `failed` with
    `nextAttemptAt` backoff and try the next channel; returns the first success, else the last failed row
    (`status: "failed"`). `dedupeKey` hit returns the existing message. `dispatchDueMessages({ limit, maxAttempts=5 },
    ctx?)`: picks due `queued|failed` rows (`for update skip locked`), retries, marks `dead` + dead letter at max.
  - **Accept:** integration tests: all up → whatsapp sent; `whatsapp:down` → sms sent and the whatsapp row is `failed`;
    all down → failed, then 5× dispatch → `dead` + 1 dead letter; duplicate dedupeKey → same id; invalid phone →
    permanent (no retries). verify green.
  - Evidence: `npx vitest run src/modules/core src/lib/jobs` → 2 files / 11 tests pass; verify → 25 files / 461 tests exit 0; commit 4c42536.

- [x] **PLC-05 Job scheduler + runners** — FR-DAT-001/003 (enabler), CI-003
  - `src/lib/jobs/types.ts` (`JobDefinition`, `JobContext { db, now, log }`), `lock.ts` (lease: `insert … on conflict
    do update … where locked_until is null or locked_until < now() returning` on `job_locks`; release writes
    `last_run_at/last_status/last_error`), `scheduler.ts` (`createScheduler(jobs, { db, tickMs })` with `start/stop/
    runOnce(name)`; per-job interval, timeout, errors caught + logged + recorded, never crash the loop),
    `registry.ts` importing `jobs` from every module's `jobs.ts`.
  - `src/modules/<m>/jobs.ts` for the 10 modules: `export const jobs: JobDefinition[] = []`, except core:
    `core.outbox.dispatch` (every 30 s → `dispatchDueMessages`).
  - `src/instrumentation.ts`: `register()` starts the scheduler only when `NEXT_RUNTIME === "nodejs"` and
    `JOBS_MODE !== "off"`, guarded against double start on HMR (globalThis flag). Add `JOBS_MODE` to `.env.example`
    with a comment (the only line W4 adds there).
  - `scripts/jobs.ts` + `"jobs": "tsx scripts/jobs.ts"` in package.json: runs the scheduler until SIGINT;
    `--once <name>` runs one job and exits non-zero on failure; `--list` prints names.
  - **Accept:** integration tests: two schedulers on the same DB → a job with a 60 s interval runs exactly once across
    both in one tick window; throwing job → `job_locks.last_status='error'` + message, loop continues; expired lease is
    re-acquired. `npm run jobs -- --list` prints `core.outbox.dispatch`; `npm run jobs -- --once core.outbox.dispatch`
    exits 0. verify green.
  - Evidence: `npm run jobs -- --list` → `core.outbox.dispatch every 30s`; `--once core.outbox.dispatch` → status ok; scheduler int tests pass; commit 0faf04e.

- [x] **PLC-06 Object storage adapter** — §3.3 object storage (local mock), FR-CAT media enabler
  - `src/lib/storage/types.ts` (`StorageAdapter { put(key, data: Uint8Array|Buffer, contentType), get(key) →
    { data, contentType } | null, delete(key), exists(key) }`), `local.ts` (files under `STORAGE_DIR` resolved from
    `web/`, content type in a sidecar `.meta.json`; keys validated `^[a-z0-9][a-z0-9/._-]*$`, no `..`, no leading `/`),
    `index.ts` (`storage` singleton, `newStorageKey(prefix, ext)`, `mediaUrl(storageKey)`: leading `/` → as is
    (public/ static, per DECISIONS), else `/api/storage/<key>`). Wrapped in `callExternal({ service: "storage" })`.
  - `src/app/api/storage/[...key]/route.ts`: GET streams the object with its content type,
    `cache-control: public, max-age=31536000, immutable`, 404 when missing/invalid key.
  - **Accept:** unit tests (temp dir): put/get/delete round trip, traversal keys rejected (`../x`, `/etc`, `a/../../b`);
    dev server on 3012: put a PNG via a test script then `curl -sI localhost:3012/api/storage/<key>` → 200 image/png,
    `curl … /api/storage/..%2F.env.local` → 404. verify green.
  - Evidence: `curl -sI localhost:3012/api/storage/dev/test/pixel2.png` → 200 image/png immutable; `..%2F.env.local` → 404; missing → 404; unit tests in verify (461 pass). Fixed `web/.gitignore` `storage/` → `/storage/` (it was hiding src/lib/storage + api/storage); see PLC-06 commit.

- [x] **PLC-07 Dev tools: `/dev/outbox`, `/dev/services`** — PLAN §1 (outbox visible in dev), CI-004 (QA toggles)
  - `src/app/[locale]/dev/outbox/page.tsx`: server component, newest 200 `messages` (time, channel, to, eventKey,
    locale, status, attempts, text/subject, providerRef, error) with channel/status filters via searchParams, and the
    open `dead_letters` below. `src/app/[locale]/dev/services/page.tsx`: `getServiceHealth()` table + fault toggle
    per service (server action → `setFault`) + recent jobs from `job_locks`. Plain, readable, uses logical CSS
    properties; English only; `notFound()` in production; `export const dynamic = "force-dynamic"`.
  - `src/app/api/dev/outbox/route.ts`: GET JSON of latest messages (`?to=` filter) — lets e2e/other teams read an OTP;
    POST `{ channel, to, text }` sends a test message via `sendMessage`. 404 in production.
  - `tests/e2e/core/dev-tools.spec.ts`: POST a test message → `/ar/dev/outbox` shows it; toggle `sms` down on
    `/ar/dev/services` → status reflects it after a failed send; toggle back.
  - **Accept:** `npx playwright test tests/e2e/core` pass (webServer uses WEB_PORT 3012); manual: both pages render
    at `/ar/dev/...` and `/en/dev/...` with no console errors. verify green.
  - Evidence: `npx playwright test tests/e2e/core` → 3 passed (incl. a 4-page ar/en render test asserting 0 console errors), `--repeat-each 2` stable; typecheck + lint clean. Fault cache + stub set moved to globalThis (Next splits module graphs).

## B. Module contracts (types.ts + service.ts + index.ts per module; tests against the seeded test DB)

- [x] **PLC-08 Core, insights and empty-contract modules + manifest test**
  - `modules/core/index.ts`: `sendMessage`, `dispatchDueMessages`, `getSetting`, `setSetting`, `reportDegradation`,
    `reportRecovery`, `getServiceHealth`, `isServiceAvailable`, `callExternal`, `storage`, `mediaUrl`,
    `newStorageKey`, types. `modules/insights/index.ts`: `recordBusinessEvent`, `listBusinessEvents` (real, from lib).
  - `assistant`, `journey`, `storefront` `index.ts`: documented empty contracts (`export {}` + comment on who may
    call what later; storefront: nothing — carts are private to it).
  - `src/modules/contracts.test.ts`: a manifest `{ module: [exportNames…] }` asserting every listed name is exported
    (functions are functions) — each later PLC task extends it; Phase 1 teams must keep it passing.
  - CONTRACTS.md sections for these modules. **Accept:** manifest test passes; verify green.
  - Evidence: `npx vitest run src/modules/contracts.test.ts` → 7 pass; verify → 26 files / 468 tests exit 0; commit ef587e2. CONTRACTS.md platform services filled.

- [x] **PLC-09 Catalog contract (real reads)** — FR-CAT-001..010, FR-SRC-001, FR-CMS-001..002 (read side)
  - DTOs: `ProductSummary` (id, slug, name/tagline per locale, group, status, priceFrom agorot, primary image url via
    `mediaUrl`, inSeason, available flag left to inventory), `ProductDetail` (+ description, variants, media,
    components, seasonal windows), `VariantInfo` (id, productId, sku, name ar/en, price agorot, vatRateBp or null,
    status, weight/dimensions if present).
  - Functions: `getProduct(idOrSlug, { locale, includeUnpublished? })`, `listProducts({ locale, collection?, group?,
    seasonalOnly?, page, pageSize, includeUnpublished? })` → `{ items, total }`, `search(query, { locale, limit })`
    (FTS per DECISIONS: `catalog_search_normalize`), `getVariants(ids)`, `getVariantBySku(sku)`,
    `getProductComponents(productId)`, `resolveSlugRedirect(slug)`, `isInSeason(productId, at?)`,
    `getPolicy(kind, locale)` (latest published version), `listFaq(locale)`, `getStaticPage(slug, locale)`.
  - **Accept:** integration tests on seeded test DB: 5 published products listed, Arabic query finds a seeded title,
    SKU `DC-RMD-001` resolves, a Ramadan title `isInSeason` at 2027-02-01 true and 2027-06-01 false, policy `returns`
    returns v1 in both locales; manifest updated; verify green.
  - Evidence: `npx vitest run --project integration src/modules/catalog` → 8 pass (5 listed, "رمضان" finds sahret-ramadan, DC-RMD-001, season 2027-02-01 true / 06-01 false, returns v1 ar+en); manifest 8 pass; tsc+eslint clean. Helper `modules/core/test-seed.ts` (`resetAndSeed`).

- [x] **PLC-10 Inventory contract** — FR-INV-001..011 (signatures), FR-CRT reservation enabler
  - DTOs: `Availability { variantId, available, onHand, reserved, byLocation[{ locationCode, onHand, reserved }] }`,
    `ReservationRef`, `StockLineInput { variantId, qty }`.
  - Real: `getAvailability(variantIds, ctx?)` (stock_levels minus active unexpired reservations), `reserve({ ownerType:
    "cart"|"order", ownerId, lines, ttlMinutes? (setting inventory.reservation_ttl_minutes) }, ctx?)` (throws
    `AppError("insufficient_stock", …, { variantId, available })`), `release(ownerType, ownerId, ctx?)`.
  - Stub (STUB marker, typed results): `commitDispatch({ orderId, shipmentId?, lines, locationCode }, ctx?)`,
    `restoreOnReceipt({ orderId, returnId?, lines, locationCode }, ctx?)`, `writeOff({ variantId, qty, locationCode,
    reason }, ctx?)`, `recordShortfall({ orderId, orderLineId, qty }, ctx?)`, `requestBackInStock({ variantId, contact,
    locale, customerId? }, ctx?)`, `listLocations()` (real).
  - **Accept:** integration: availability of a seeded SKU = seeded on-hand; reserve 2 → available −2; reserve more than
    available → `insufficient_stock`; release → restored; expired reservation ignored. Manifest; verify green.
  - Evidence: `npx vitest run --project integration src/modules/inventory` → 6 pass; verify → 484 tests exit 0; commit 7ac9c3c. Owner id in `reservations.order_id`, reserve replaces the owner's hold (DECISIONS).

- [x] **PLC-11 Payments contract** — FR-PAY-001..016 (signatures), CI-002, FR-CUR-*
  - Real: `getActiveVatRate(at?)` → bp from `vat_rates`, `computeTotals({ lines[{ unitPrice, qty, vatRateBp? }],
    discount?, deliveryFee }, ctx?)` wrapping `src/lib/vat.ts` (default rate from DB), `verifyWebhookSignature(rawBody,
    signature)` (HMAC-SHA256 with `PAYMENT_WEBHOOK_SECRET`, timing-safe).
  - Stub (typed): `initiatePayment({ orderId, method, returnUrl, locale }, ctx?)` → `{ paymentId, redirectUrl }`
    (redirect to a placeholder the payments team will build), `handleProviderWebhook(rawBody, signature, ctx?)` →
    `{ accepted, duplicate }` (rejects bad signature for real; processing STUB), `refund({ orderId, amount, method,
    reason }, ctx)` → NotImplementedError, `issueInvoiceIfDue(orderId, ctx?)` → `null`, `getPaymentSummary(orderId)`.
  - **Accept:** unit/integration: SRS VAT example via `computeTotals` (110.00 at 16% never 123.79), bad signature →
    rejected, good signature → accepted; manifest; verify green.
  - Evidence: `npx vitest run src/modules/payments src/modules/contracts.test.ts` → 15 pass (110.00 → total 11000, vat 1517, never 12379; bad sig rejected, good accepted); tsc+eslint clean; see PLC-11 commit.

- [x] **PLC-12 Engagement contract (notify, consent, customers)** — FR-MSG-001/002/004, FR-CRM-001 (signatures), NFR-PRV-002
  - `TransactionalEvent` union: `order.confirmation`, `payment.succeeded`, `payment.failed`, `order.dispatched`,
    `order.delivered`, `account.welcome`, `account.password_reset`, `account.email_changed`.
  - `notify(event, recipient { customerId? , phone?, email?, locale? }, data, ctx?)` → `{ messageIds }`: resolves contact
    + locale from the customer row when only customerId given, renders built-in default text per event in **real
    Arabic and English** (STUB: engagement team moves these to approved templates), sends via `core.sendMessage`
    (whatsapp→sms for phone, email when present), dedupeKey `<event>:<data.orderId|customerId>`.
  - Real: `recordConsent({ customerId, channel, purpose, granted, source }, ctx?)`, `hasConsent(customerId, channel,
    purpose="marketing")` (latest record wins), `listConsents(customerId)`, `getCustomer(id)`,
    `findCustomerByContact({ phone?, email? })`, `upsertCustomer({ name, phone?, email?, locale }, ctx?)` (match by
    phone/email), `listAddresses(customerId)`, `saveAddress(customerId, input, ctx?)`.
  - **Accept:** integration: notify order.confirmation for a seeded/created customer → 1 outbox row with Arabic text
    when locale ar; consent grant→revoke → `hasConsent` false; upsert twice same phone → one customer. Manifest; verify.
  - Evidence: `npx vitest run --project integration src/modules/engagement` → 6 pass (1 whatsapp row, Arabic text, dedupe; grant→revoke false; same phone → 1 customer); manifest 11 pass; verify → 30 files / 497 tests exit 0; see PLC-12 commit.

- [x] **PLC-13 Orders contract (thin real placeOrder/transition)** — FR-ORD-001..005, 012, FR-CRT-008, FR-ADR-006..009, Appendix A
  - DTOs: `PlaceOrderInput { customerId?, contact { name, phone, email? }, locale, lines[{ variantId, qty }], address
    { zoneId, city, line1, line2?, notes? }, paymentMethod ("card"|"cod"…per enum), idempotencyKey }`, `OrderView`
    (id, reference, fulfilmentState, paymentState, totals, lines with name snapshot, address, zone, createdAt),
    `DeliveryEstimate { zoneId, minDays, maxDays, earliest: BusinessDate, latest: BusinessDate }`, `DeliveryZoneView`.
  - Real/thin: `placeOrder(input, ctx?)` in one tx: idempotency key replay returns the same order; prices from
    catalog `getVariants`, totals via payments `computeTotals` + `quoteDeliveryFee`, reference via `src/lib/ids.ts`,
    inserts `orders` + `order_lines` + an `order_events` row, `inventory.reserve(order)`, `recordBusinessEvent
    ("order.placed")`, `engagement.notify("order.confirmation", …)` (STUB comment: the orders team owns the full rules
    — COD cap, zone checks, backorder). `transition(orderId, { machine, to, trigger }, ctx)` validates with
    `assertTransition` (state-machine.ts), updates state, appends `order_events`. Reads: `getOrder(idOrReference)`,
    `listCustomerOrders(customerId, { page })`, `listDeliveryZones({ activeOnly })`, `quoteDeliveryFee(zoneId,
    subtotal)`, `estimateDelivery(zoneId, placedAt?)` (Asia/Jerusalem business days via `src/lib/time.ts`).
  - **Accept:** integration: place a COD order for 2 seeded variants → reference `DC-XXXX-XXXX`, totals = sum incl.
    delivery, VAT contained per FR-CRT-007, availability dropped by reservation, 1 business event, 1 outbox message;
    same idempotency key → same order id; illegal transition → `AppError("invalid_transition")`; legal one appends an
    event. Manifest; verify green.
  - Evidence: `npx vitest run --project integration src/modules/orders` → 5 pass (COD 2 variants: DC-XXXX-XXXX, 24700 = 22700 + 2000, vat 3407 contained, availability −1/−2, 1 `order.placed`, 1 outbox row; replay same id; insufficient_stock rolls back; illegal → invalid_transition; legal appends event); verify → 31 files / 503 tests exit 0. `VariantInfo` gained productName*/variantName* (snapshots). See PLC-13 commit.

## C. Close-out

- [x] **PLC-14 CONTRACTS.md final + lane validation**
  - CONTRACTS.md complete: per module, every exported function with signature, real vs STUB, owning team, errors it
    throws; platform services (messaging, events, health/faults, adapters, jobs, storage, dev tools) with examples;
    list from `grep -rn "STUB(contracts)" src` pasted as the "stubs left for Phase 1" table.
  - Clean run in the worktree: `npm run db:reset`, `npm run verify`, `npx playwright test`, dev server on 3012 →
    `/ar`, `/en`, `/ar/dev/outbox`, `/ar/dev/services` render; `npm run jobs -- --once core.outbox.dispatch` ok.
    Ownership check: `git diff --stat main..HEAD` lists only owned paths. Stop servers + DB.
  - **Accept:** all of the above pass and are pasted as evidence; handover says lane ready to merge.
  - Evidence: CONTRACTS.md final (status line, orders + engagement sections, 14-row "Stubs left for Phase 1" table from `grep -rn "STUB(contracts)" src`); `npm run db:reset` → seeded; `npm run verify` → 31 files / 503 tests exit 0; `npx playwright test` → 6 passed; dev 3012: `/ar` `/en` `/ar/dev/outbox` `/ar/dev/services` → 200 ×4; `npm run jobs -- --once core.outbox.dispatch` → status ok, exit 0; `git diff --name-only main..HEAD` → only web/src/{lib,modules,app/[locale]/dev,app/api/dev,app/api/storage}, web/scripts/jobs.ts, web/tests/e2e/core, web/{package.json (jobs script), .env.example (JOBS_MODE), .gitignore (/storage/)}, web/src/instrumentation.ts. Servers + DB stopped. Docs-only task (files under ROOT/.orchestration, untracked) — no code commit.
