# Team PLATFORM — Phase 0 Foundation

**Working dir:** ROOT (`D:/Personal/Projects/DardaChat-E-store`), app in `ROOT/web`. Branch `main`.
W2/W3/W4 work in worktrees `D:/Personal/Projects/DardaChat-wt/platform-auth|platform-shell|platform-contracts`
on branches `platform/auth|shell|contracts`, created by the leader from `main` after W1 lands. Leader merges them back.
**Ports:** DB 54320, web 3000 (worktrees: auth 54330/3010, shell 54331/3011, contracts 54332/3012).
**Owns:** everything under `web/` in Phase 0. After Phase 0, PLATFORM owns only `web/src/lib/**`, `web/src/db/**`,
root config files (`package.json`, `next.config.*`, `tsconfig.json`, `drizzle.config.*`, `middleware.ts`,
`instrumentation.ts`, tailwind/postcss config), `web/src/app/[locale]/layout.tsx`, the admin shell/layout,
`web/src/modules/core/**`, `web/messages/<locale>/common.json`.

SRS sections to read: §1.2, §1.3, §2.4, §2.5, §3.1, §3.4, §4.7, §5 (all), §6.3, §6.5, §6.6, Appendix A.
Also read `ROOT/.orchestration/PLAN.md` §1–§2 (stack and layout are decided there).

## Deliverables — the whole point is that 9 teams can start in parallel the moment this lands

### W1 `core` (sequential, first)
1. Scaffold Next.js (App Router, TS strict, src dir, Tailwind v4, ESLint) in `web/`. Install **every dependency the
   later teams will need** up front so they rarely touch package.json: next-intl, drizzle-orm, drizzle-kit, postgres,
   embedded-postgres, zod, @node-rs/argon2, otplib, libphonenumber-js, @google/genai, three, @react-three/fiber,
   @react-three/drei, @playwright/test, vitest, @vitest/coverage-v8, tsx, date-fns + date-fns-tz, nanoid, papaparse,
   clsx; plus anything else you judge standard. Run `npx playwright install chromium`.
2. Dev DB: `npm run db:start` (embedded-postgres, data dir `web/.pgdata`, port from `.env.local` `PG_PORT`),
   `db:stop`, `db:push` (drizzle-kit push), `db:setup` (push + `src/db/sql/*.sql`), `db:seed`, `db:reset`.
   A test DB (`<name>_test`) for vitest, reset per run. Document in `web/README.md`. `.env.example` with all vars.
3. **Full Drizzle schema** for every entity in SRS §5.1/§5.2 plus what the requirements imply: products, variants,
   media, collections, slug redirects, product components, seasonal windows, stock levels, stock movements,
   reservations, back-in-stock requests, locations (origins), delivery zones, orders, order lines (shortfall_qty),
   order events, shipments/consignments + outcomes, returns, payments, refunds, invoices, credit notes, number
   series, e-invoice submissions, cash remittances + allocations, VAT rates with effective dates, suppliers,
   purchase orders + lines + receipts, customers, addresses, consent records, segments, messages/outbox, message
   templates (+ approval state), campaigns, journey sessions/results, users, roles, sessions, OTP codes, TOTP
   secrets, audit entries, business events, policies (versioned), static pages, FAQ entries, assistant
   conversations/usage, data requests, retention settings, settings (key/value), dead letters. One file per module
   in `web/src/modules/<module>/schema.ts`, barrel in `web/src/db/schema.ts`. Money = integer agorot columns.
4. `web/src/db/sql/append-only.sql`: triggers refusing UPDATE/DELETE on OrderEvent, Payment, StockMovement,
   AuditEntry, Invoice, CreditNote, CashRemittance, RemittanceAllocation (FR-DAT-006) — with a narrowly scoped
   escape for FR-DAT-008 de-identification (e.g. a session setting only the erasure routine sets). Tested.
5. `web/src/lib/money.ts`, `vat.ts`: formatting (ar/en, ILS), VAT-inclusive maths exactly per FR-CRT-007/009
   (VAT contained, never added; discount allocated proportionally; single rounding at order level), tested with
   the SRS example (16%, 110.00 must not display as 123.79).
6. `web/src/modules/orders/state-machine.ts`: Appendix A.1–A.4 as data (states, allowed transitions, named triggers)
   + pure `canTransition` functions, exhaustively tested against the appendix tables. (ORDERS/PAYMENTS will own
   side-effects; the tables are shared truth.)
7. Seed runner `web/src/db/seed.ts` calling each module's `seed.ts` in order (stubs are fine): Owner + Staff users
   (credentials written to `web/.env.local` / README, never to chat), 2 origins (store room, household), zones for
   the governorates with flat rates and COD flags, VAT 16% effective 2020-01-01, **5 placeholder titles** (bilingual,
   2 Ramadan-seasonal) each with one variant, components, stock at both origins, 1 supplier, policies, FAQ.
8. vitest config (unit + integration using the test DB), Playwright config (baseURL from `WEB_PORT`), `npm test`,
   `npm run test:e2e`, `npm run typecheck`, `npm run lint`.

### W2 `auth` (parallel after W1)
FR-ACC-001..006, 009..015, NFR-SEC-003/004/007/010, CON-05/FR-ADR-004 phone normalisation lib.
Session library (DB sessions, httpOnly secure cookies, rotation), `requireCustomer()`, `requireStaff(permission)`,
permission registry with **deny by default** (every admin route/API must declare a permission or it 403s — build a
test that walks all admin route handlers), Owner/Staff roles, TOTP 2FA mandatory for back office (enrolment +
challenge), email+password and phone+OTP (OTP via `core` messaging contract → mock WhatsApp, fallback SMS; 5 min,
single use, rate limits per number and per IP), password reset tokens, argon2, breached-password check against a
bundled top-N list, back-office user admin (create/suspend/reinstate/revoke; revoke kills sessions), audit log
helper `audit(actor, action, target, before, after)` used by every admin mutation, rate-limit helper (DB or
memory-with-interface). Customer sign-in/up pages may be minimal — STOREFRONT will restyle them.

### W3 `shell` (parallel after W1)
UI-001..006 base, NFR-LOC-001..005, NFR-USA-003..005. next-intl routing (`/ar` default, `/en`), middleware, locale
persisted for signed-in users, `dir="rtl"` switching, Arabic typeface with full coverage (e.g. IBM Plex Sans Arabic
or Noto Kufi/Naskh Arabic via next/font) + Latin pairing, locale-aware number/date/currency formatting helpers,
bidi isolation helper for mixed strings. **Design system**: tokens (colour, type scale, spacing, radius), and base
components (Button, Input, Select, Field+error, Card, Table, Badge, Dialog, Toast, Tabs, EmptyState, Skeleton,
Pagination, PriceTag, LocaleSwitcher). Visual direction: warm, playful but premium — a boxed conversation-game brand
(cards, conversation, gathering); not generic SaaS. Storefront layout (header, nav, footer, cart icon slot, assistant
slot) and admin layout (sidebar driven by a **nav registry** pre-populated with every module's section so teams
don't edit it), error/404 pages in both locales. Use `frontend-design` or `impeccable` skill.

### W4 `contracts` (parallel after W1)
`ROOT/.orchestration/CONTRACTS.md` + `web/src/modules/<m>/index.ts` for every module in PLAN.md §3, each exporting
the functions other modules need, typed, with **working stubs** (return plausible data or throw `NotImplemented`
where a caller can handle it). At minimum: catalog (getProduct, listProducts, search), inventory (reserve, release,
commitDispatch, restoreOnReceipt, writeOff, recordShortfall, getAvailability), orders (placeOrder, transition,
getOrder, listCustomerOrders, estimateDelivery), payments (initiatePayment, handleProviderWebhook, refund,
issueInvoiceIfDue, computeTotals), engagement (notify(event, recipient, data) — transactional, recordConsent,
hasConsent), insights (recordBusinessEvent), assistant (none needed by others), journey (none). Plus: outbox table
+ `/dev/outbox` page (dev only) showing every mock email/WhatsApp/SMS; adapter base with timeout, exponential
backoff retry and dead-letter table (CI-003); service-health registry + `reportDegradation()` (CI-004); job
scheduler (register(name, intervalMs, fn), lock so one instance runs a job); object storage adapter (local disk);
`business events` helper.

## Leader duties (phase 0)
Plan W1 in TASKS.md; after W1 validate (fresh clone-like check: `npm ci`, `db:start`, `db:setup`, `db:seed`, `npm test`,
`npm run dev` renders `/ar` and `/en`). Then create the three worktrees (each `npm ci`, own `.env.local` ports, own
DB), write their task lists, and let them run. When all three return, merge `platform/auth`, `platform/shell`,
`platform/contracts` into `main` (resolve conflicts), re-validate everything, `git tag foundation-v1`, and write
`ROOT/.orchestration/FOUNDATION-NOTES.md` (≤ 80 lines): how to run, where things are, conventions, gotchas —
every Phase 1 agent will read it.
