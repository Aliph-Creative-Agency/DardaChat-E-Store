# Dardachat web

Next.js 16 app (App Router, `src/`), Drizzle ORM on an embedded PostgreSQL, next-intl (`ar` default, `en`),
vitest + Playwright. Everything below runs from this `web/` folder.

## Prerequisites

- Node.js 24 (tested on 24.18) and npm. No Docker and no system PostgreSQL: the `embedded-postgres` package ships
  the binaries and keeps the data in `web/.pgdata` (gitignored).
- Chromium for Playwright, installed once: `npx playwright install chromium`.
- Windows, macOS and Linux all work; the commands are plain npm scripts.

## First run

```bash
npm ci
cp .env.example .env.local          # PowerShell: Copy-Item .env.example .env.local
npm run db:start                    # first run: initdb + creates dardachat and dardachat_test (~20 s)
npm run db:setup                    # schema (drizzle-kit push) + src/db/sql/*.sql triggers/functions
npm run db:seed                     # reference data, 5 placeholder games, stock, policies, FAQ
npm run dev                         # http://localhost:3000 → redirects to /ar
```

Stop the database when you are done: `npm run db:stop`. Data survives a stop/start.

## Scripts

| Script | What it does |
|---|---|
| `dev` / `start` | Next dev server / production server on `WEB_PORT` (via `scripts/next.mjs`) |
| `build` | Production build |
| `lint` | ESLint CLI over the project |
| `typecheck` | `next typegen` then `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `db:start` / `db:stop` / `db:status` | Embedded PostgreSQL lifecycle on `PG_PORT`; `db:start` twice is a no-op. Log: `.pgdata/log` |
| `db:push` | `drizzle-kit push --force` only (prefer `db:setup`) |
| `db:setup` | Push the Drizzle schema, then apply every `src/db/sql/*.sql` in name order. Idempotent. `-- --test` targets `dardachat_test` |
| `db:seed` | Run every module seed (insert-if-missing by natural key; safe to run again) |
| `db:reset` | Drop and recreate the `public` schema, then setup and seed (dev DB) |
| `test` | vitest: `unit` project (`src/**/*.test.ts`, no DB) + `integration` project (`src/**/*.int.test.ts`) |
| `test:unit` / `test:int` | One vitest project only |
| `test:e2e` | Playwright (chromium) specs in `tests/e2e/**`; starts `npm run dev` or reuses a running server; `tests/e2e/global-setup.ts` warms every route serially first |
| `jobs` | Background job runner (outbox dispatch, …) as its own process; only needed when `JOBS_MODE` is set (default: jobs run inside the Next server) |
| `verify` | `typecheck` + `lint` + `test` — must be green before every commit |

Integration tests and `verify` need the DB running (`npm run db:start`). The test database `dardachat_test` is
rebuilt by the vitest globalSetup (`src/test/global-setup-db.ts`) on every run; never point tests at `dardachat`.

## Pages for development

| URL | What |
|---|---|
| `/ar`, `/en` | Storefront (store shell); `/ar/sign-in`, `/sign-up`, `/forgot-password`, `/account` for customers (email + password or phone + OTP) |
| `/ar/staff/sign-in` | Back-office sign-in → TOTP enrolment on first sign-in (`/staff/two-factor/setup`, base32 key for any authenticator app), then the TOTP challenge on every sign-in |
| `/ar/admin` | Back office (AdminShell; sidebar filtered by the user's permissions); `/ar/admin/users` staff users (Owner) |
| `/ar/dev/outbox` | Dev only: every message the mock WhatsApp/SMS/email channels "sent" (OTP codes, reset links) + dead letters; JSON at `/api/dev/outbox?to=` |
| `/ar/dev/services` | Dev only: service health, fault injection (down/slow/flaky) per service, job locks, contract stubs hit |
| `/ar/dev/ui` | Dev only: component gallery (tokens, primitives, shell pieces) in both directions |

Dev pages return 404 when `NODE_ENV=production`. Admin e2e specs sign in with `tests/e2e/support/owner-session.ts`.

## Environment and ports

All variables are listed in `.env.example`; `.env.local` is gitignored and wins over `.env`.
Each team has its own ports (`.orchestration/PLAN.md`), so several worktrees can run side by side:

| Team | PG_PORT | WEB_PORT |
|---|---|---|
| main / platform / integration | 54320 | 3000 |
| catalog | 54321 | 3001 |
| storefront | 54322 | 3002 |
| orders | 54323 | 3003 |
| inventory | 54324 | 3004 |
| payments | 54325 | 3005 |
| engagement | 54326 | 3006 |
| insights | 54327 | 3007 |
| assistant | 54328 | 3008 |
| journey | 54329 | 3009 |

Change `PG_PORT`, `WEB_PORT`, `DATABASE_URL`, `TEST_DATABASE_URL` and `APP_URL` together.
`GEMINI_API_KEY` empty = deterministic mock assistant.

## Seed credentials

The seed creates two back-office users: `SEED_OWNER_EMAIL` (role owner) and `SEED_STAFF_EMAIL` (role staff).
If `SEED_OWNER_PASSWORD` / `SEED_STAFF_PASSWORD` are empty in `.env.local`, `scripts/seed-credentials.ts` generates
random passwords and writes them into `.env.local`. They are never printed; read them from that file. Only argon2id
hashes are stored in the DB.

## Conventions

- **Money** is integer agorot (`Agorot` in `src/lib/money.ts`); never floats. VAT is contained in prices, rates in
  basis points (1600 = 16%), rounded once per order (`src/lib/vat.ts`).
- **Digits**: Arabic UI uses Latin digits (`ar-u-nu-latn`), in formatted values and in copy alike.
- **Time**: stored as UTC `timestamptz`; business days and months are `Asia/Jerusalem` (`src/lib/time.ts`).
- **Modules** live in `src/modules/<m>/` (`schema.ts`, `seed.ts`, `index.ts`). Other modules are called only
  through their `index.ts` contract.
- **Text**: every user-facing string goes through next-intl messages in both `ar` and `en`.
- **CSS**: logical properties only (`ms-`/`me-`, `ps-`/`pe-`, `start`/`end`) so RTL and LTR both work.
- **Ledgers are append-only** (order_events, payments, stock_movements, audit_entries, invoices, credit_notes,
  cash_remittances, remittance_allocations): UPDATE/DELETE/TRUNCATE are refused by the DB (SQLSTATE `DCA01`,
  constraint `<table>_append_only`). Correct by inserting a new row. `withErasure(db, fn)` in `src/db/guards.ts` is
  the only UPDATE escape (privacy erasure).
- **Journal**: updates to orders, order_lines, customers, addresses and variants are written to `audit_entries` by a
  trigger. Wrap staff writes in `withActor(db, actor, fn)` so the entry names who did it.
- **Order states** come from `src/modules/orders/state-machine.ts` (SRS Appendix A); never hard-code transitions.
- **Seed contract**: each module exports `seed: ModuleSeed` from `src/modules/<m>/seed.ts`; insert-if-missing by
  natural key, never overwrite admin edits.

## Gotchas

- After a schema change run `npm run db:setup` twice; the second drizzle-kit push must say "No changes detected".
  drizzle-kit churns on composite primary keys, DB-side array/interval defaults, expression indexes and identifiers
  longer than 63 characters — use a surrogate `id` + unique index and put such objects in `src/db/sql/*.sql`.
- To empty an append-only table in a test, `truncateAll()` (`src/db/test-utils.ts`) sets `dardachat.test_reset`
  inside the same transaction; that setting only unlocks TRUNCATE.
- `npm run typecheck` runs `next typegen` first so route types exist; plain `npx tsc --noEmit` is fine for non-route code.
- `next dev` re-adds a block to `AGENTS.md`; commit it rather than fighting it.
- If `db:start` fails after a crash, check `.pgdata/log`; a stale `postmaster.pid` in `.pgdata/data` is the usual cause.
