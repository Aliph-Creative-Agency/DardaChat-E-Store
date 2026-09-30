# Foundation notes — read before Phase 1 work (tag `foundation-v1`)

## Run it (from `web/`, in your worktree; your ports are in PLAN.md §Phase 1 — main uses PG 54320 / web 3000)
- `.env.local`: copy `.env.example`, set `PG_PORT`, `WEB_PORT`, `DATABASE_URL`, `TEST_DATABASE_URL`, `APP_URL` to your
  ports. `db:seed` writes seed passwords into `.env.local`: never cat/print that file.
- `npm ci` (~2.5 min) → `npm run db:reset` (start + schema push + `sql/*.sql` + seed, ~1 min) → `npm run dev` (background).
  Also `db:start|stop|status|setup|seed`, `npm run jobs` (only when `JOBS_MODE` is set; default = jobs in-process).
- `npm run verify` = `next typegen` + `tsc` + `eslint` + vitest unit+integration (2–8 min: run in background, poll the log).
  Int tests use `dardachat_test`, reset once per run; never run two int runs at once.
- e2e: `npm run test:e2e` (Playwright, reuses a running dev server on `WEB_PORT`, `globalSetup` warms routes serially).
  Admin specs: `import { test, expect } from "../support/owner-session"` = a 2FA-complete throwaway Owner cookie.
- Seeded back office: Owner + Staff (`SEED_*_EMAIL` / passwords in `.env.local`), TOTP enrolment on first sign-in at
  `/ar/staff/sign-in`. Dev pages (dev only, English): `/ar/dev/outbox` (every message sent + dead letters),
  `/ar/dev/services` (health, fault injection, jobs, stubs hit), `/ar/dev/ui` (component gallery), `/api/dev/outbox`.

## Where things are (`web/src`)
- `app/[locale]/(store)/**` storefront (StoreHeader/Footer layout); `app/[locale]/admin/**` back office (AdminShell);
  `app/[locale]/staff/**` staff sign-in / 2FA / forbidden; `app/[locale]/dev/**` dev tools; `app/api/**` route handlers.
- `modules/<m>/index.ts` = the ONLY public surface of a module (CONTRACTS.md); `types.ts`, `service.ts`, `jobs.ts`,
  `schema.ts` are private. `modules/contracts.test.ts` pins every module's export names.
- `db/schema.ts` barrel of all tables; `db/seed.ts` + `modules/*/seed`; `db/sql/*.sql` triggers (append-only, journal).
- `lib/`: `money` (agorot), `vat` (basis points, VAT-inclusive), `time` (UTC / Asia/Jerusalem), `phone` (E.164),
  `settings`, `errors` (`AppError`), `context` (`ServiceContext`), `adapters/call` (`callExternal`), `channels` (mock
  WhatsApp/SMS/email), `jobs`, `storage`, `events` (business events), `stub`, `i18n/*`, `nav/*`, `shell/viewer`.
- `components/ui` primitives (Button, Field, Table, Dialog, Toast, PriceTag, Bdi, …) and `components/shell`; see
  `components/README.md`. Tokens are CSS variables in `app/globals.css`; `/dev/ui` shows everything.
- i18n: next-intl, `messages/<ar|en>/<namespace>.json`; namespaces registered in `lib/i18n/namespaces.ts` (one per
  module: catalog, orders, …). Admin sidebar = `lib/nav/admin-nav.ts` (each item has a permission key); store nav =
  `lib/nav/store-nav.ts`. Links: `Link`/`redirect` from `@/lib/i18n/navigation` with locale-less hrefs.

## Conventions (tests enforce most of them)
- Arabic is the default locale and must be real Arabic; every user-facing string goes through next-intl in ar AND en
  (`messages.test` parity, `no-literals.test` scans TSX). Latin digits for codes/prices. Logical CSS only
  (`ms-/me-/ps-/pe-/start/end`, `logical-classes.test`); wrap user data in `<Bdi>`.
- Money = integer agorot, VAT in basis points, VAT contained in prices. Timestamps UTC; business days Asia/Jerusalem.
- Admin page: first line `await requireStaff("<perm>", { locale, next })` (walker test fails otherwise). Route handler:
  `staffRoute(perm, handler)`; server action: `staffAction(perm, fn)`. Mutations by staff: `auditedMutation` / `audit`.
  New permission: add to `modules/auth/permissions.ts` registry + role grants (CHANGE-REQUEST to platform).
- Outbound messages only via `core.sendMessage` (customer transactional: `engagement.notify`). Third-party calls only
  via `callExternal({ service })` so fault injection and degradation work. Journalled writes pass `ctx.actor`.
- Contract functions take `ctx?: ServiceContext` last (`{ db: tx }` to share a transaction, `now` to pin the clock).

## The contract / stub pattern
- Code against `@/modules/<other>` even when it is a stub. Stub bodies carry `// STUB(contracts): …` + `stubWarn()`;
  `git grep -n "STUB(contracts)" web/src` = what is still fake (list in CONTRACTS.md). Replace your own module's stubs,
  remove the marker, keep the signature.
- Need a signature change / new export / a file another team owns? Append to `CHANGE-REQUESTS.md`, use a local shim
  marked `SHIM(<team>)`, and keep going. Contract changes update CONTRACTS.md + `contracts.test.ts` in the same commit.
- Unknown client/third-party detail: build the provider-neutral part + a mock, add a BACKLOG.md line.

## Brand (brand-v1, 2026-09-30; spec DESIGN.md)
- Name: Latin **Dardachat**, Arabic **دردشات** (`common.meta.title`, `common.brand.nameAr|nameEn`, TOTP issuer, OTP/reset texts).
  Contact constants in `@/lib/shell` (`BRAND_CONTACT`, `BRAND_TEL_HREF`, `BRAND_MAILTO_HREF`, `whatsappUrl(text?)` -> wa.me/972543992424).
- Tokens (`globals.css`): `paper` cream, `brand` blue (+`brand-strong|soft`, `on-brand`), `accent` red (+`accent-strong`, `on-accent`;
  white text only, or text >=24px), `pink`/`sky` soft surfaces, `ink` navy body text. `saffron`/`olive` are remapped aliases, avoid in new code.
  Contrast rule: blue/cream 7.1, white/red 4.6, ink/cream 12; red, pink or sky text on cream fails AA. Unit test: `tokens.test.ts`.
  Buttons: primary = blue, `cta` variant = red. Focus ring blue; inside `data-tone="brand"` bands it is pink.
- Fonts (`lib/shell/fonts.ts`): Baloo Bhaijaan 2 behind `--font-display` (headings only; swap Childos there when licensed);
  IBM Plex for body, prices, numerals (`PriceTag` pins `font-sans`). Never ship the Childos DEMO file.
- Logo: `Wordmark` (inline `BrandMark` finger-heart SVG + name as text; `stacked` + `tone="onBrand"` for the footer). Raster crops are
  PLACEHOLDERS in `web/public/brand/` (logo-banner, logo-mark png+webp); favicon/`icon.png`/`apple-icon.png` come from the mark (BACKLOG).
- Decoration: `BrushStroke` from `@/lib/shell` (`tone` pink-on-blue | blue-on-cream | soft, `shape` swash | blob). Decorative only, never carries text.
- Nav: `STORE_PRIMARY_NAV` (Home, Games, Workshops, Sessions, Game nights, Journey, About, Contact) / `STORE_HEADER_NAV` (no Home) /
  `STORE_SECONDARY_NAV` (FAQ, footer only). `/pages/*` routes are seeded by CATALOG and 404 until merged. Header nav shows from `xl` (1280).
- Remaining old spelling (DardaChat / دردشة) lives in module-owned files (catalog seed, engagement default texts, storefront messages);
  those teams rename their own.

## Gotchas
- Windows + Git Bash: stop a server by PID (`netstat -ano | grep ":<port> "` → `taskkill //T //F //PID <pid>`), then
  `npm run db:stop` (may print pg_ctl exit 1 while the ~60 s checkpoint runs; poll the port). Avoid
  `pg_ctl -m immediate`: the next start runs a very long recovery.
- Cold dev server: first compile ~70 s, first curl may return 000 — retry. Stale `.next/dev/types` after deleting a route
  breaks typecheck: `rm -rf web/.next`.
- Bash heredocs halve backslashes: write node/regex scripts with the Write tool. Working copy is CRLF (autocrlf).
- Tailwind's default palette is reset (`--color-*: initial` in globals.css): `bg-neutral-900` etc. render nothing —
  use the tokens (`ink`, `paper`, `surface`, `line`, `brand`, `success|warning|danger|info[-soft]`).
- Arabic-Indic digit scans: use node `/[٠-٩]/`, not grep ranges.
- e2e: passwords must not contain the user's name/email (policy); set a random `x-forwarded-for` per context to dodge
  per-IP rate limits; read OTPs/reset links from the outbox (`/api/dev/outbox?to=` or `tests/e2e/auth/db.ts`), never logs.
- Store pages have two LocaleSwitchers (header + hidden mobile menu): locate with `:visible`.
- `/[locale]/dev/ui/boom` throws on purpose unless cookie `dc_boom=off` (error-boundary test).
- drizzle correlated subqueries: qualify the outer column (`"orders"."id"`) inside `sql`. COD cap is 100 000 agorot.
- Vitest: `server.deps.inline: ["next-intl"]` is set; spy on `console`/streams only after saving the originals.
- Auth OTP: a WhatsApp send that fails is kept `failed` and retried by the outbox job even after the SMS fallback
  succeeded (possible late duplicate; BACKLOG).
