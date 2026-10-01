# Tasks — platform / lane core (W1) — Phase 0

Order matters: each task leaves `npm run typecheck && npm run lint && npm test` green (from PLA-05 on).
All paths are under `ROOT/web/` unless stated. Mark `[x]` done / `[~]` partial / `[!]` blocked, and paste one line
of evidence (command → result) under the task when done. DB port 54320, web port 3000.

## A. Environment

- [x] **PLA-01 Scaffold the Next.js app** — SRS §1.2, NFR-MNT (structure)
  - `npx create-next-app@latest web --ts --app --src-dir --tailwind --eslint --use-npm --import-alias "@/*" --yes` from ROOT (non-interactive; keep Next's default bundler). Use context7 for current Next 16 conventions (`proxy.ts` replaces `middleware.ts`; async `params`).
  - `tsconfig.json` strict (+ `noUncheckedIndexedAccess`). `.gitignore`: `.pgdata/`, `.env.local`, `test-results/`, `playwright-report/`, `storage/`.
  - Minimal `src/app/[locale]/layout.tsx` + `page.tsx` for `ar`/`en` only (`dir="rtl"` for ar, `generateStaticParams`), `notFound()` for other locales, root `/` redirects to `/ar`. (W3 replaces this with next-intl; keep it tiny.)
  - `scripts/next.mjs` wrapper so `npm run dev` / `npm start` use `WEB_PORT` (default 3000) cross-platform. Scripts: `dev`, `build`, `start`, `lint` (eslint CLI — `next lint` is gone in Next 16), `typecheck` (`tsc --noEmit`).
  - Paths: `web/**`. **Accept:** `npm run typecheck && npm run lint && npm run build` pass; dev server in background → `curl -s -o /dev/null -w "%{http_code}" localhost:3000/ar` = 200 and `/en` = 200, `/` → 307/308 to `/ar`; stop the server.
  - Evidence: typecheck/lint/build green; dev: /ar 200 (html lang=ar dir=rtl), /en 200, / 307→/ar, /fr 404 (commit 31bc321)

- [x] **PLA-02 Install every shared dependency** — PLAN §1
  - deps: next-intl, drizzle-orm, postgres, zod, @node-rs/argon2, otplib, libphonenumber-js, @google/genai, three, @react-three/fiber, @react-three/drei, date-fns, date-fns-tz (or `@date-fns/tz` if date-fns v4 — pick one, record it), nanoid, papaparse, clsx, tailwind-merge, server-only.
  - devDeps: drizzle-kit, embedded-postgres, @playwright/test, vitest, @vitest/coverage-v8, tsx, dotenv, @types/three, @types/papaparse, cross-env (if needed).
  - `npx playwright install chromium`. `.env.example` with every var (PG_PORT, WEB_PORT, DATABASE_URL, TEST_DATABASE_URL, APP_URL, SESSION_SECRET, GEMINI_API_KEY (empty), STORAGE_DIR, PAYMENT_WEBHOOK_SECRET, SEED_OWNER_EMAIL/SEED_STAFF_EMAIL) and a copy to `.env.local` with ports 54320/3000.
  - **Accept:** `npm ls --depth=0` shows no missing/invalid; `npx playwright --version` ok; `npm run typecheck && npm run build` still pass; `node -e "require('@node-rs/argon2')"` ok (native binary on Windows).
  - Evidence: npm ls --depth=0: 0 missing/invalid; playwright 1.63.0 + chromium installed; argon2 require ok; typecheck+build green. date-fns v4 + @date-fns/tz chosen; vitest 5.0.2 needs @types/node 24

- [x] **PLA-03 Embedded Postgres lifecycle scripts** — PLAN §1 (DB), CON-10 (server TZ UTC)
  - `scripts/db.ts` (run with `tsx`): `start` (initdb into `web/.pgdata` on first run, start detached so the command returns — prefer the package's `pg_ctl` binary for start/stop because embedded-postgres' child dies with the node process; log to `.pgdata/log`), `stop`, `status`; creates DBs `dardachat` and `dardachat_test` if missing; `timezone=UTC`. Reads `PG_PORT` from `.env.local`.
  - npm scripts `db:start`, `db:stop`, `db:status`.
  - **Accept:** `npm run db:start` returns within 60 s; `node -e` with `postgres` driver runs `select 1` against both DBs; `npm run db:stop` then `db:start` again keeps data (create a temp table before, see it after); `db:start` twice is a no-op, not an error.
  - Fallback if embedded-postgres cannot run on this Windows box: `@electric-sql/pglite` + `pglite-socket` (record in DECISIONS.md).
  - Evidence: db:start first run 19s (initdb+create dardachat/dardachat_test), select 1 ok on both (TimeZone=UTC); 2nd db:start = 'already running' 1s; stop→start kept tmp_persist row 42

- [x] **PLA-04 Drizzle wiring + setup/reset scripts** — PLAN §1
  - `drizzle.config.ts` (schema = `src/db/schema.ts`, url from env), `src/db/client.ts` (singleton on `globalThis` for HMR, `server-only`), `src/db/schema.ts` barrel, `src/modules/core/schema.ts` with `settings` only for now.
  - `scripts/db-setup.ts`: `drizzle-kit push --force` (non-interactive) then every `src/db/sql/*.sql` in name order (idempotent SQL: `create or replace`, `drop trigger if exists`). Scripts `db:push`, `db:setup`, `db:reset` (drop+recreate `public` schema → setup → seed), accept `--test` to target `dardachat_test`.
  - **Accept:** `npm run db:setup` twice in a row succeeds; `npm run db:reset` succeeds; `settings` table exists in both DBs after `db:setup` and `db:setup -- --test`.
  - Evidence: db:setup x2 ok, db:setup -- --test ok, db:reset ok; settings(key,value,updated_at) in both DBs. drizzle casing=snake_case (config+client); schema files use relative imports

- [x] **PLA-05 Test harness (vitest + Playwright)** — NFR-MNT
  - `vitest.config.ts` with projects `unit` (`src/**/*.test.ts`, no DB) and `integration` (`src/**/*.int.test.ts`, globalSetup resets `dardachat_test` via the setup script, runs serially). Helper `src/db/test-utils.ts` (test db client, `truncateAll()`).
  - `playwright.config.ts`: baseURL `http://localhost:${WEB_PORT}`, `webServer` runs `npm run dev`, specs in `tests/e2e/**`, chromium only.
  - Scripts: `test` (unit+integration), `test:unit`, `test:int`, `test:e2e`, `verify` (typecheck+lint+test).
  - Smoke tests: `src/lib/smoke.test.ts`, `src/db/smoke.int.test.ts` (`select 1` + settings round trip), `tests/e2e/platform/smoke.spec.ts` (`/ar` has `dir=rtl`, `/en` has `dir=ltr`).
  - **Accept:** `npm test` and `npm run test:e2e` pass (DB running).
  - Evidence: npm test → 2 files/3 tests pass (int globalSetup rebuilds dardachat_test: dropped settings table was recreated); npm run test:e2e → 3 passed (ar rtl, en ltr, / → /ar). Config is vitest.config.mts; server-only aliased to empty module in vitest

## B. Libraries and pure logic (no DB) — can be done in any order after PLA-05

- [x] **PLA-06 Money + VAT library (TDD)** — FR-CRT-007, FR-CRT-009, FR-CUR-001..005, CON-01
  - `src/lib/money.ts`: `Agorot` branded int type, `agorot()` guard (integer, safe), `formatMoney(a, locale)` ILS only (ar uses Arabic locale formatting — decide Latin vs Arabic-Indic digits, record it; en `₪1,234.50`), `parseMoneyInput()`, sum/multiply without floats.
  - `src/lib/vat.ts`: `vatContained(gross, rateBp)` (rate as basis points, 1600 = 16%), `allocateDiscount(lines, discount)` proportional with largest-remainder so it sums exactly, `computeOrderTotals({lines, discount, delivery, rateBp})` → `{subtotal, discount, delivery, total, vat, lines[{lineTotal, lineVatUnrounded}]}` with VAT = Σ post-discount line VAT + delivery VAT **rounded once at order level**; delivery VAT at goods rate.
  - Tests: SRS example (total 110.00 at 16% → VAT 15.17, display must never be 123.79; `subtotal − discount + delivery === total` for random cases — property test with a loop is fine), rounding edge cases, discount > subtotal refused, zero-rate.
  - **Accept:** `npx vitest run src/lib/money.test.ts src/lib/vat.test.ts` green, ≥ 20 assertions.
  - Evidence: npx vitest run src/lib/money.test.ts src/lib/vat.test.ts → 34 tests pass (incl. SRS 110.00→VAT 15.17, 500-case property loop). Decision: ar uses Latin digits (ar-u-nu-latn)

- [x] **PLA-07 Time + reference-code helpers** — CON-10, FR-ORD-024 (order ref), CON-05 (E.164 note only)
  - `src/lib/time.ts`: `BUSINESS_TZ='Asia/Jerusalem'`, `businessDate(utc)`, `startOfBusinessDay(date)`/`endOf…` returning UTC instants, `businessMonthRange(y,m)`, correct across DST (tests on 2026 DST dates).
  - `src/lib/ids.ts`: `newOrderReference()` — non-sequential, communicable aloud (e.g. `DC-` + 8 chars Crockford base32 without I/L/O/U, grouped `DC-7KQ4-M2XP`), `isOrderReference()`; `newToken(bytes)` for opaque secrets.
  - **Accept:** `npx vitest run src/lib/time.test.ts src/lib/ids.test.ts` green (incl. a DST-boundary test and 10k references with no collision and no ambiguous chars).
  - Evidence: npx vitest run src/lib/time.test.ts src/lib/ids.test.ts → 14 pass (2026-03-27 = 23h, 2026-10-25 = 25h, 365-day round trip; 10k refs unique, no I/L/O/U). endOfBusinessDay is an EXCLUSIVE bound

- [x] **PLA-08 Order + payment state machines** — Appendix A.1–A.4, FR-ORD-003 (event per transition), FR-PAY-013
  - `src/modules/orders/state-machine.ts`: `FULFILMENT_STATES`, `PAYMENT_STATES` (as const + TS union types), `FULFILMENT_TRANSITIONS` / `PAYMENT_TRANSITIONS` arrays of `{from, to, trigger, sideEffects: string[]}` transcribed row by row from A.2/A.4 (PENDING→CANCELLED appears twice with two triggers; PART_REFUNDED→PART_REFUNDED self-loop), terminal sets, `canTransition(machine, from, to, trigger?)`, `allowedTransitions(machine, from)`, `assertTransition()` throwing a typed error. Pure — no DB, no side effects.
  - Tests: table-driven — every listed row allowed; every other (from,to) pair refused (exhaustive N×N); terminals (LOST_IN_TRANSIT, CANCELLED, COMPLETED, COD_CANCELLED, REFUNDED, WRITTEN_OFF) have no outgoing; the DELIVERED→COMPLETED guard (payment_state in PAID/COD_SETTLED/PART_REFUNDED/REFUNDED/COD_CANCELLED/WRITTEN_OFF) is exposed as a pure `completionAllowed(paymentState)` and tested; REFUNDED is not a fulfilment state; trigger mismatch refused.
  - **Accept:** `npx vitest run src/modules/orders/state-machine.test.ts` green; row counts asserted (A.2 = 30 rows, A.4 = 14 rows — leader counted them in SRS v0.1).
  - Evidence: npx vitest run src/modules/orders/state-machine.test.ts → 329 pass (A.2=30, A.4=14 asserted; 15x15 + 9x9 exhaustive; completion guard per payment state). 4 PARTIALLY_DISPATCHED rows flagged splitShipment (SRS §1.6 descope item 6) but permitted

## C. Schema (one module family per task; each ends with `npm run db:setup` clean + an int test)

- [x] **PLA-09 Schema: core + auth + engagement customer records** — §5.1 (Customer, Address, ConsentRecord, User/Role/Permission, AuditEntry), FR-ACC-*, CON-05, FR-DAT-006
  - `modules/core/schema.ts`: settings, audit_entries (actor_type/actor_id, action, target_type/target_id, before/after jsonb, occurred_at), business_events, dead_letters, job_locks, service_health.
  - `modules/auth/schema.ts`: staff_users (email unique, password_hash, status active/suspended/revoked, locale), roles, permissions, role_permissions, user_roles, sessions (token_hash, subject_type, subject_id, expires_at, last_seen_at, rotated_from), otp_codes (phone_e164/email, code_hash, purpose, expires_at, consumed_at, attempts), totp_secrets, password_reset_tokens, rate_limit_hits.
  - `modules/engagement/schema.ts` (records part): customers (email nullable unique, phone_e164 nullable unique, password_hash nullable, name, locale, status, erased_at), addresses (free-form lines, governorate, locality, landmark, no postal code — CON-04), consent_records (purpose, granted, source, policy_version, recorded_at).
  - **Accept:** `npm run db:setup` clean; `src/db/schema-core.int.test.ts` inserts a staff user + role + session + customer + address + consent and reads them back; typecheck green.
  - Evidence: db:setup clean (2nd drizzle-kit push: 'No changes detected'); npm run test:int → schema-core.int.test.ts 4 tests pass (staff+role+session, customer+address+consent, contact check, dup phone/email refused); typecheck+lint green

- [x] **PLA-10 Schema: catalog + CMS** — FR-CAT-001..010, FR-CMS-001..002, FR-SRC-001
  - products (slug unique, status draft/published/archived, name/description/play_instructions/seo_title/seo_description `_ar`/`_en`, group, occasion, tags text[], player_min/max, min_age, duration_min, search tsvector generated/maintained), variants (sku unique, price, cost (Owner-only — comment), weight_g, status), media_assets (ordered, kind image/video, storage_key, alt_ar/alt_en), collections + collection_products (position), slug_redirects, product_components, seasonal_windows (starts_on/ends_on dates, returns_note_ar/en), static_pages, faq_entries, policies (kind, version, body_ar/en, effective_at; unique(kind,version)).
  - FTS: `src/db/sql/020-catalog-fts.sql` (tsvector over ar+en name/description with `simple` config + GIN index).
  - **Accept:** `db:setup` clean; int test creates a product with 3 variants and finds it by an Arabic word and an English word via the FTS column.
  - Evidence: 2nd drizzle-kit push 'No changes detected'; schema-catalog.int.test.ts 3 pass (ar 'الإفطار'/'الافطار', en 'iftar', tag 'عائله', vector follows edits); verify 387 pass. FTS = trigger + catalog_search_normalize() (commit below)

- [x] **PLA-11 Schema: inventory + purchasing + storefront carts** — FR-INV-001..011, FR-PUR-001..004, FR-CRT-001..002, CON-09
  - locations (code, name_ar/en, kind store_room/household/other, is_origin), stock_levels (variant×location unique: on_hand, reserved, safety_threshold), stock_movements (per §5.2 incl. reason enum), reservations (order_id, variant_id, location_id, qty, expires_at, released_at), back_in_stock_requests, suppliers, purchase_orders (status), po_lines, po_receipts, po_receipt_lines.
  - `modules/storefront/schema.ts`: carts (customer_id nullable, anon_token, expires_at ≥ 30 days, merged_into), cart_lines (unique cart×variant).
  - **Accept:** `db:setup` clean; int test: stock_level unique constraint enforced; check constraint `reserved <= on_hand` (or documented reason not to); cart line uniqueness enforced.
  - Evidence: push x3 → 2nd/3rd 'No changes detected'; schema-inventory.int.test.ts 5 pass (stock_levels uq, reserved<=on_hand + on_hand>=0 checks by name, PO partial receipt, cart_lines uq, 30-day cart); verify 392 pass. auth join tables moved to id+unique (PK churn)

- [x] **PLA-12 Schema: orders + delivery** — §5.2 Order/OrderLine, FR-ORD-*, FR-ADR-006..009, FR-CRT-008
  - delivery_zones (governorate, locality nullable, name_ar/en, flat_rate, cod_eligible, cod_max_total, active), orders (exactly the §5.2 columns + contact snapshot, delivery address snapshot jsonb, zone_id, idempotency_key unique, locale), check `subtotal - discount + delivery = total`, order_lines (§5.2 incl. shortfall_qty ≥ 0, product/variant name snapshots), order_events (order_id, machine fulfilment/payment, from_state, to_state, trigger, actor, data jsonb, occurred_at), idempotency_keys, shipments (consignment_ref, courier, status, dispatched_at), shipment_lines, delivery_outcomes (outcome delivered/failed/refused, reason, recorded_by), returns + return_lines. State columns use the enums exported from `state-machine.ts` values.
  - **Accept:** `db:setup` clean; int test: an order violating the total identity is rejected by the DB; duplicate idempotency_key rejected.
  - Evidence: push x2 → 'No changes detected'; schema-orders.int.test.ts 4 pass (orders_total_ck on 123.79 total, orders_amounts_ck, orders_idempotency_key_unique, orders_reference_unique, shortfall/outcome-reason checks, REFUNDED refused as fulfilment state); verify 396 pass. Added order_notes (FR-ORD-010); vat_rate stored as vat_rate_bp

- [x] **PLA-13 Schema: payments + invoicing** — §5.2 Invoice/CreditNote/CashRemittance, FR-PAY-*, FR-ORD-018..020/023/024, FR-CUR-006
  - vat_rates (rate_bp, effective_from date, unique effective_from), payments (order_id, method, provider, provider_ref, kind authorisation/capture/cash, amount, status, raw jsonb, occurred_at), refunds (method, receiving_party, amount, provider_ref, status), number_series (key invoice/credit_note, prefix, next_value) — gapless allocation is PAYMENTS' job but add `src/db/sql/030-number-series.sql` function `next_series_number(key)` using row lock, invoices (§5.2), credit_notes (§5.2 + reason enum), einvoice_submissions (document_type, document_id, attempt, request/response jsonb, status), cash_remittances (§5.2), remittance_allocations.
  - **Accept:** `db:setup` clean; int test: 50 concurrent `next_series_number('invoice')` calls return 1..50 with no gap/duplicate.
  - Evidence: push x2 → 'No changes detected'; schema-payments.int.test.ts 3 pass (50 concurrent txns → 1..50, rollback returns the number, INV-000051 formatting, invoices_amounts_ck, vat_rates_effective_from_unique, payments_provider_event_uq); verify 399 pass

- [x] **PLA-14 Schema: messaging, insights, assistant, journey** — FR-MSG-001..008, FR-CRM-001..003, FR-DAT-001..010, FR-AI-*, FR-JRN-* / §5.2 JourneyResult
  - engagement: segments, segment_memberships, message_templates (event_key, channel whatsapp/sms/email, locale, body, meta_approval_state), messages (outbox: channel, to, template, payload, status queued/sent/failed/dead, attempts, provider_ref, error), campaigns, campaign_recipients.
  - insights: data_requests (kind export/delete, customer_id, requested_at, verified_at, completed_at, manual_check_note), retention_settings (category, months).
  - assistant: assistant_documents (source_type, source_id, locale, chunk, tsvector), assistant_conversations, assistant_messages, assistant_usage (day, tokens_in/out, cost_estimate), assistant_escalations.
  - journey: journey_sessions (session_token, started_at, last_activity_at, linked_customer_id), journey_results (§5.2 exactly; check: customer_id not null ⇒ consent_record_id not null), journey_aggregates.
  - **Accept:** `db:setup` clean; int test: journey_result with customer_id but no consent is rejected; every table in the barrel exists in `information_schema.tables` (test lists expected names).
  - Evidence: push x3 → 'No changes detected'; schema-all.int.test.ts 3 pass (barrel == 75 expected tables, all present in information_schema; journey_results_consent_ck; message template uq + messages_dedupe_key_unique); verify 402 pass

## D. Database guarantees

- [x] **PLA-15 Append-only triggers + erasure escape** — FR-DAT-006, FR-DAT-008
  - `src/db/sql/010-append-only.sql`: one trigger function refusing UPDATE and DELETE (and TRUNCATE via statement trigger) on order_events, payments, stock_movements, audit_entries, invoices, credit_notes, cash_remittances, remittance_allocations. Escape: UPDATE (never DELETE) allowed only when `current_setting('dardachat.erasure', true) = 'on'` (set with `SET LOCAL` inside the erasure transaction). Export `withErasure(tx, fn)` helper in `src/db/guards.ts`.
  - Test-reset path: `truncateAll()` must still work for tests — use a separate `dardachat.test_reset` setting honoured only for TRUNCATE, or drop/recreate schema; document which.
  - **Accept:** `src/db/append-only.int.test.ts`: for each of the 8 tables, insert ok, update refused, delete refused; update inside `withErasure` succeeds, delete inside it still refused.
  - Evidence: append-only.int.test.ts 6 pass (8 tables: update+delete refused as `<table>_append_only`, SQLSTATE DCA01; erasure update ok, delete refused; erasure reset after savepoint; TRUNCATE refused w/o test_reset; invoices/credit_notes e-invoice fields updatable, other cols refused); verify 408 pass; db:setup x2 ok (commit e5b9fc5)

- [x] **PLA-16 Mutable-row journal triggers** — FR-DAT-006 (journal half)
  - `src/db/sql/015-journal.sql`: AFTER UPDATE trigger on orders, order_lines, customers, addresses, variants writing to audit_entries (action `row.update`, target table/id, before/after jsonb of changed columns only, actor from `current_setting('dardachat.actor_id', true)` / `dardachat.actor_type`). `withActor(tx, actor, fn)` helper in `src/db/guards.ts`.
  - **Accept:** int test: status change on an order and an address correction each produce exactly one audit entry with before/after and actor.
  - Evidence: journal.int.test.ts 3 pass (order PENDING→COD_CONFIRMED + address line1 each 1 entry, staff actor, changed cols only; system actor default; no-op/ignored-col updates not journalled; password_hash redacted; erasure → row.erase w/ column names, no PII); verify 411 pass

## E. Seed + finish

- [x] **PLA-17 Seed runner + reference data** — FR-ACC (seed users), FR-ADR-006, FR-CUR-006, FR-INV (origins), FR-ORD-024 (series)
  - `src/db/seed.ts` runs `src/modules/<m>/seed.ts` in dependency order (every module gets a `seed.ts`, empty stubs allowed). Idempotent (upserts by natural key) so `db:seed` twice is safe.
  - Data: roles Owner/Staff; Owner + Staff staff_users with random passwords argon2-hashed — the plaintext written only to `web/.env.local` (`SEED_OWNER_PASSWORD`, `SEED_STAFF_PASSWORD`), never printed; 2 origins (store room, household); delivery zones for the 16 Palestinian governorates (11 West Bank + 5 Gaza) with flat rates and COD flags (placeholder values, configurable); VAT 1600 bp from 2020-01-01; number series invoice/credit_note; retention_settings defaults (Journey 60 months, anon Journey 90 days); settings defaults (reservation TTL 30 min, COD max).
  - **Accept:** `npm run db:reset` succeeds; int test `seed.int.test.ts` runs seed twice and asserts counts unchanged (2 users, 2 origins, 16 zones, 1 VAT rate).
  - Evidence: db:reset ok + db:seed again ok (SEED_*_PASSWORD written to .env.local, 24 chars, not printed); seed.int.test.ts 3 pass (2 users/2 roles/2 origins/16 zones (11 active)/1 VAT/2 series, identical after 2nd run; argon2id hash verifies; INV-000001); verify 414 pass

- [x] **PLA-18 Seed: catalogue, stock, supplier, content** — FR-CAT-003/009, AS-04 (5 titles), FR-CMS
  - 5 placeholder titles, real Arabic + English names/descriptions/play instructions, 2 tied to Ramadan with seasonal_windows (next Ramadan window), one variant each (sku, price, cost, weight), components list, placeholder media rows (local SVG/PNG in `public/seed/`), one collection; stock via stock_movements (reason `adjustment`) + stock_levels at both origins; 1 supplier; policies v1 (terms, privacy, returns, delivery — short bilingual placeholders); 6+ FAQ entries ar/en; 1 static page (about).
  - **Accept:** `npm run db:reset` then a query/test shows 5 published products, 2 with seasonal windows, stock rows = 10, `sum(stock_movements.delta) = sum(stock_levels.on_hand)` per variant×location.
  - Evidence: db:reset + db:seed → {"published":5,"seasonal":2,"stock_rows":10,"movements":10,"mismatches":0}; seed.int.test.ts 4 pass (catalogue/stock/content counts, ledger invariant, FTS finds 'رمضان', idempotent incl. products/movements/faq); verify 415 pass. Data in catalog/seed-data.ts, SVGs in public/seed/

- [x] **PLA-18a (leader fix, do first) Latin digits in seed copy** — DECISIONS 2026-09-26 (Latin digits in ar)
  - `src/modules/catalog/seed-data.ts` has 6 Arabic-Indic digit runs (e.g. `٧ أيام` in the seasonal returns note, `١٠`, `١٤`, `١`, `٣`). Replace each with Latin digits so seed copy matches the recorded convention (`ar-u-nu-latn`: prices, phones, refs and copy read the same in both locales). Leave `src/lib/money.ts`/`money.test.ts` alone (they intentionally reference Arabic-Indic digits for parsing).
  - **Accept:** `node -e` scan of `src/modules/**` finds no `[٠-٩]`; `npm run db:reset` ok; `npx vitest run src/db/seed.int.test.ts` green. Fold into the PLA-19 commit or its own.
  - Evidence: 6 runs (7, 10, 14, 1–3, 14) → Latin; node scan of src/modules for [٠-٩] → 0 hits; db:reset ok; npx vitest run src/db/seed.int.test.ts → 4 pass

- [x] **PLA-19 README, env, full clean-run check** — PLAN §1, parent brief W1.2/W1.8
  - `web/README.md`: prerequisites, first run (`npm ci`, copy env, `db:start`, `db:setup`, `db:seed`, `dev`), every script, ports per team, test DB, where seed credentials live, conventions (money in agorot, UTC, module contracts, logical CSS properties), known gotchas.
  - Clean-run: stop DB, delete `web/.pgdata`, then run the README sequence verbatim + `npm run verify` + `npm run test:e2e`.
  - **Accept:** the whole sequence passes from an empty `.pgdata`; evidence line per command under this task. Then W1 is ready for leader validation.
  - Evidence (clean run 2026-09-26, README sequence verbatim):
    - `npm run db:stop` + `rm -rf web/.pgdata` → stopped, .pgdata absent
    - `npm ci` → added 568 packages (~2.5 min; npm 11.16 allow-scripts warning for 9 pkgs is informational, everything worked)
    - `cp .env.example .env.local` → ok
    - `npm run db:start` → initdb, created databases dardachat + dardachat_test
    - `npm run db:setup` → push + applied 010/015/020/030 sql
    - `npm run db:seed` → "seed ok (staff passwords: web/.env.local)"; 2 non-empty SEED_*_PASSWORD lines in .env.local
    - `npm run verify` → typecheck + lint clean, 16 files / 415 tests passed
    - `npm run test:e2e` → 3 passed (ar rtl, en ltr, / → /ar), Playwright stopped its dev server
