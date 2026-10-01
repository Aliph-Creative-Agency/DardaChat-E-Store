# DardaChat Prototype 1 — Build Plan

**Source of truth for scope:** `docs/DardaChat-SRS draft-v0.1.md` (v0.1 ids). Business facts: `docs/HANDOFF.md` §2.
**Goal:** a working, locally runnable prototype of the whole platform (storefront, back office, commerce core,
payments/invoicing with mock providers, messaging with mock channels, reports, AI assistant, the Journey).
Anything blocked by the client or by a third party is stubbed behind an adapter and logged in `BACKLOG.md`.
Started 2026-09-26 by the orchestrator (main Claude session). Obaida is asleep; no questions can be asked, so
every agent decides, records the decision in its handover/`DECISIONS.md`, and moves on.

---

## 1. Stack (decided — do not relitigate without a written reason in DECISIONS.md)

| Concern | Choice |
|---|---|
| App | **Next.js (latest stable, App Router) + React 19 + TypeScript strict**, one app in `web/` (SRS §1.2: single web app, one DB) |
| Package manager | **npm** (pnpm is not installed) |
| DB | **PostgreSQL** via **Drizzle ORM** (`postgres` driver). Local dev DB = **`embedded-postgres`** npm package (real Postgres, no Docker on this machine). Fallback if it fails on Windows: `@electric-sql/pglite` + `pglite-socket`. Schema applied with `drizzle-kit push` (no migration files in the prototype — avoids cross-branch migration conflicts). Raw SQL (append-only triggers, FTS indexes) in `web/src/db/sql/*.sql`, applied by `npm run db:setup` after push |
| Styling | Tailwind CSS v4, **logical properties only** (`ms-/me-/ps-/pe-/start/end`) so RTL works; design tokens in CSS vars |
| i18n | `next-intl`; locales `ar` (default) and `en`; locale in URL path `/ar/...`, `/en/...` (UI-001..003). Messages split per module: `web/messages/<locale>/<module>.json` |
| Auth | Own implementation: DB-backed sessions (no affinity, NFR-SCL-003), `@node-rs/argon2`, `otplib` TOTP for back-office 2FA, phone OTP through the mock WhatsApp→SMS channel |
| Validation | `zod` |
| Money | integer agorot everywhere; one `money`/`vat` lib (FR-CRT-007/009, FR-CUR-*) |
| External services | Adapter interface + **mock implementation** for: payment provider (hosted page + HMAC-signed webhooks), tax-authority e-invoicing, WhatsApp, SMS, email, object storage (local disk), LLM. Mocks write to an **outbox** visible at `/dev/outbox` in dev |
| LLM | `@google/genai`, Gemini 2.5 Flash when `GEMINI_API_KEY` is set; otherwise a deterministic mock that answers from retrieved snippets |
| 3D | `three` + `@react-three/fiber` + `@react-three/drei` |
| PDF | HTML → PDF via Playwright Chromium (correct Arabic shaping for free, NFR-LOC-006) |
| Jobs | in-process scheduler started from `instrumentation.ts` + `npm run jobs` standalone runner; jobs are idempotent |
| Tests | `vitest` (unit + DB integration against the worktree's own DB) and `@playwright/test` (e2e) |

## 2. Repository layout (`web/`)

```
web/src/app/[locale]/(store)/...     public storefront routes          (STOREFRONT; CATALOG/JOURNEY own their sub-routes as listed in briefs)
web/src/app/[locale]/admin/...       back office routes                 (each module owns admin/<module>/)
web/src/app/api/...                  route handlers                     (each module owns api/<module>/)
web/src/modules/<module>/            schema.ts, service.ts, index.ts (PUBLIC CONTRACT), ui/, seed.ts, *.test.ts
web/src/lib/                         shared libs (PLATFORM only)
web/src/db/                          client, schema barrel, sql/, seed runner (PLATFORM only)
web/messages/<locale>/<module>.json  per-module strings
web/tests/e2e/<module>/              Playwright specs
```

**Ownership rule:** a team edits only paths it owns (see its `BRIEF.md`). Cross-module calls go through the other
module's `index.ts` contract only. PLATFORM ships a **stub** for every contract in Phase 0 so every team can code
against it on day one; the owning team replaces the stub. Need a change in another team's files? Append to
`.orchestration/CHANGE-REQUESTS.md` and work around it with a local adapter; Integration applies it.

## 3. Phases and teams

Every team = **1 leader + a relay of workers**. The leader plans (`TASKS.md`), validates each worker batch
(typecheck, tests, runs the app, checks SRS acceptance criteria) and decides "continue / fix / done". Workers
implement. Every agent retires at ~40% context and hands over (see `PROTOCOL.md`); a fresh agent of the same role
picks up from the handover.

### Phase 0 — Foundation (team `platform`, main repo, branch `main`)
W1 scaffold + DB + full schema + libs → then W2/W3/W4 in parallel worktrees → leader merges to `main`, tags `foundation-v1`.
- W1 `core`: Next scaffold, all deps, embedded Postgres scripts, **full Drizzle schema for every §5 entity + auth tables**, append-only triggers (FR-DAT-006), money/VAT lib, Appendix A state-machine tables (pure), seed runner, vitest/playwright harness.
- W2 `auth`: sessions, customer email/password + phone OTP, back-office 2FA, Owner/Staff RBAC deny-by-default, audit log, back-office user management, admin session expiry (FR-ACC-001..006, 009..015, NFR-SEC-003/004/007/010).
- W3 `shell`: i18n/RTL shell, Arabic typeface, design system + base components, storefront & admin layouts, nav registry, error pages (UI-001..006, NFR-LOC-*, NFR-USA-003..005). Uses `frontend-design`/`impeccable` skills.
- W4 `contracts`: every module's `index.ts` contract + stubs, outbox + `/dev/outbox`, adapter base with timeout/retry/backoff/dead-letter (CI-003), degradation registry (CI-004), job scheduler, object storage adapter, `CONTRACTS.md`.

### Phase 1 — Feature teams (parallel, each in its own git worktree + branch + DB port)

| Team | Scope (SRS v0.1) | Worktree / branch | PG port | Web port |
|---|---|---|---|---|
| `catalog` | FR-CAT-001..010, FR-SRC-001, FR-CMS-001..002, media | `../DardaChat-wt/catalog` / `team/catalog` | 54321 | 3001 |
| `storefront` | public pages, cart, checkout UI, account area, customer auth UI, FR-CRT-001..006, FR-ACC-007, FR-ADR-001..005 (UI), FR-ORD-012, UI-*, NFR-USA-006 | `.../storefront` | 54322 | 3002 |
| `orders` | FR-ORD-001..017, 021, 022, 026, 027, FR-CRT-008, FR-ADR-006..009, courier CSV, delivery outcomes, returns | `.../orders` | 54323 | 3003 |
| `inventory` | FR-INV-001..011, FR-PUR-001..004 | `.../inventory` | 54324 | 3004 |
| `payments` | FR-PAY-001..016, FR-ORD-006, 018..020, 023..025, FR-CUR-001..006, CI-002, mock PSP + mock tax authority, PDFs | `.../payments` | 54325 | 3005 |
| `engagement` | FR-CRM-001..003, FR-MSG-001..008, NFR-PRV-002, templates for every transactional event | `.../engagement` | 54326 | 3006 |
| `insights` | FR-RPT-001..007, FR-DAT-001..010 (non-Journey parts), FR-ACC-008, NFR-MNT-005, NFR-PRV-003/004/007, admin dashboard home, degradation panel | `.../insights` | 54327 | 3007 |
| `assistant` | FR-AI-001..016, NFR-PERF-004, NFR-AVL-004 | `.../assistant` | 54328 | 3008 |
| `journey` | FR-JRN-001..018, FR-DAT-002/003, NFR-PRV-005, NFR-USA-002, NFR-PERF-006..008, placeholder concept content (OI-02) | `.../journey` | 54329 | 3009 |

### Phase 2 — Integration (team `integration`, main repo)
Merge order: inventory → orders → payments → catalog → storefront → engagement → insights → assistant → journey.
Resolve conflicts, delete stubs, apply `CHANGE-REQUESTS.md`, run all unit/integration tests, write and pass the
cross-module e2e journeys (card order end to end incl. invoice + e-invoice clearance; COD order to remittance
settlement; backorder at picking; failed delivery + redelivery; refund + credit note; Journey play + consent;
assistant answer + escalation). Tag `prototype-integrated`.

### Phase 3 — QA & acceptance (team `qa`)
QA leader builds `ACCEPTANCE.md` (every M/S requirement in prototype scope → check → PASS/FAIL/DEFERRED) by driving
the running app in a browser + Playwright, files defects into `TASKS.md`, workers fix, loop until no FAIL on a Must
(or cycle cap). Final: `web/README.md` run guide, `BACKLOG.md` complete, `REPORT.md` for Obaida. Tag `prototype-1`.

## 4. Out of the prototype (queued in BACKLOG.md, not built)
Real PSP (OI-01), real e-invoicing (OI-17), real WhatsApp/SMS/email providers + Meta approval (CON-06), real courier
template (OI-23), Journey real concept/content/art (OI-02), privacy regime specifics (OI-24), cloud hosting / IaC /
staging / backups+PITR / HSTS in prod / external monitoring (NFR-AVL-*, NFR-MNT-001..004, NFR-SEC-005/006 prod),
load tests and reference-device perf measurement (NFR-PERF-*, NFR-SCL-*), formal WCAG audit, pen test (NFR-SEC-002),
dependency scanning in CI (NFR-SEC-009), CAPTCHA/bot protection beyond rate limiting (NFR-SEC-008).
Built in simplified form where cheap is fine — say so in BACKLOG.md.
