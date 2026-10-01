# Tasks — platform / lane merge — Phase 0 final step

Run commands from `D:/Personal/Projects/DardaChat-E-store/web` on branch `main`; DB port 54320, web port 3000.
Mark `[x]` done / `[~]` partial / `[!]` blocked and paste one line of evidence (command -> result, commit sha).
Every task leaves `main` green for what it touched (`npm run typecheck` + `npm run lint` at minimum; `npm run verify`
where the task says). Commit per task: `platform(merge): PLM-NN <summary>` + the Co-Authored-By trailer (PROTOCOL §3).
Merge commits: `git merge --no-ff platform/<lane> -m "platform(merge): PLM-NN merge platform/<lane> ..."` + trailer.
Never `reset --hard`, never delete branches. `.orchestration/` is untracked: do not `git add` it.
Long commands (`npm run verify`, `db:reset`, e2e) exceed the tool timeout: run in background, poll the log file.
Use context7 for next-intl / Next 16 APIs when rewiring. `.env.local` holds seed passwords: never cat it into chat.

## A. Merge (disjoint file sets vs merge-base 827abc4 — expect no textual conflicts; fix semantic breakage)

- [x] **PLM-01 Preflight + baseline** — (process)
  - Confirm: the three worktrees are clean (`git -C D:/Personal/Projects/DardaChat-wt/platform-<l> status --short`),
    nothing listening on 3000/3010-3012/54320/54330-54332, `main` @ 827abc4 clean apart from `.orchestration/`.
  - Start the main DB (`npm run db:start`, background) and record a baseline `npm run typecheck` + `npm run lint` on main.
  - **Accept:** statuses empty; `netstat -ano | grep LISTEN` shows none of those ports before db:start; typecheck+lint exit 0.
  - **Evidence:** worktrees 0/0/0 dirty lines; no listeners on 3000/3010-3012/54320/54330-54332; db:start ok :54320; typecheck + lint exit 0 on main @ 827abc4

- [x] **PLM-02 Merge `platform/contracts`** — CI-003, CI-004, PLAN §1 (outbox, adapters, jobs, storage, contracts)
  - `git merge --no-ff platform/contracts`. Touches `package.json` (`jobs` script only), `.env.example` (`JOBS_MODE`),
    `.gitignore` (`/storage/`), `instrumentation.ts`, `src/lib/**`, `src/modules/*/index.ts`, `/dev/*`, `/api/dev|storage`.
  - Copy any new `.env.example` vars into `web/.env.local` (append; do not print the file).
  - **Accept:** `npm run verify` green (typecheck + lint + vitest unit+int); commit = the merge commit.
  - **Evidence:** merge 4c0f01b (no conflicts); JOBS_MODE appended to .env.local; db:reset ok; npm run verify exit 0 -> 31 files / 503 tests

- [x] **PLM-03 Merge `platform/auth`** — FR-ACC-001..006, 009..015, NFR-SEC-003/004/007/010
  - `git merge --no-ff platform/auth`. If `src/modules/contracts.test.ts` (contracts manifest) lacks an `auth` entry or
    fails on the real `modules/auth/index.ts`, add/adjust the entry (keep both lanes' intent) in a follow-up commit.
  - `npm run db:reset` (auth tables/seed: Owner + Staff, roles, permissions) then `npm run verify`.
  - **Accept:** `npm run verify` green, incl. `admin-entrypoints.int.test.ts` walker and `contracts.test.ts`.
  - **Evidence:** merge 9aea4d8 (no conflicts) + manifest auth entry 845ec9f; db:reset ok; npm run verify exit 0 -> 50 files / 663 tests (walker + contracts.test incl.)

- [x] **PLM-04 Merge `platform/shell` + make the build green** — UI-001..006, NFR-LOC-001..005
  - `git merge --no-ff platform/shell`, then `npx next typegen`.
  - Fix the immediate reds (auth walker has no exemptions): `admin/page.tsx` calls
    `requireStaff("dashboard.view", { locale, next })`; `admin/[...rest]/page.tsx` guards first, then `notFound()`;
    register the `auth` namespace in `src/lib/i18n/namespaces.ts`; resolve any `no-literals` / `messages` parity
    test failures caused by auth or contracts `/dev/*` files (fix at source, or an explicit, commented allow-list for
    dev-only pages); route collisions (`(store)` pages vs auth customer pages) if any.
  - **Accept:** `npx next typegen` ok; `npm run verify` green; `npx next build` is NOT required (dev prototype).
  - **Evidence:** merge 46c72c3 (no conflicts) + fixes 1410003; auth namespace was already registered by shell; next typegen ok; rm stale .next; npm run verify exit 0 -> 62 files / 766 tests

## B. Wire the seams (each leaves `npm run verify` green)

- [x] **PLM-05 Auth UI onto shell i18n + navigation + layouts** — UI-001..003, FR-ACC-001..006 (UI), NFR-LOC-001
  - Replace `modules/auth/ui/t.ts` `authT(locale)` with next-intl (`getTranslations("auth")` server side /
    `useTranslations("auth")` client side), same dotted keys; delete or reduce the shim and its test accordingly.
  - `next/link` / `next/navigation` in auth UI → `@/lib/i18n/navigation`.
  - Customer auth pages (`(store)/sign-in|sign-up|forgot-password|reset-password|account`) render inside the store
    shell; admin users pages (`admin/users`, `admin/users/[id]`) inside the AdminShell — remove auth's own page chrome
    (`ui/shell.tsx`) where it now doubles the shell's; staff pages (`/staff/*`) keep a minimal centred shell using
    shell tokens/components. Grep `SHIM(platform-merge)` afterwards: only PLM-07's remain.
  - **Accept:** `npm run verify` green; `grep -rn "authT\|from \"next/link\"" src/modules/auth src/app` → none;
    dev server: `/ar/sign-in`, `/en/sign-in`, `/ar/staff/sign-in` return 200 with correct `dir`, one header only.
  - **Evidence:** 45f562a + 692dc15; authT shim + t.test removed (messages.test covers parity/Arabic); verify exit 0 -> 61 files / 763 tests; grep authT|next/link in auth+app -> 0; curl :3000 /ar|en/sign-in, /ar|en/staff/sign-in, /ar/forgot-password, /ar/staff/forbidden -> 200, dir rtl/ltr, 1 <header>, 1 <main>; remaining SHIM(platform-merge) only otp-delivery.ts (PLM-07)

- [x] **PLM-06 Viewer seam, locale preference, admin-nav permissions** — FR-ACC-009..012 (RBAC), UI-003, NFR-LOC
  - `src/lib/shell/viewer.ts`: `getShellViewer()` -> auth `getCurrentStaff()` + `can()` (nav filtered by real
    permissions; `mustChangePassword` users count as signed in); `getShellSubject()` -> `{type:"staff"|"customer", id}`
    from `getCurrentStaff()`/`getCurrentCustomer()`; drop the dev-Owner stub.
  - Keep ONE locale-preference implementation (auth `setSubjectLocale` vs shell `persistLocalePreference`/
    `preferredLocale`); `rememberLocale` in `src/lib/i18n/actions.ts` calls it; update tests; DECISIONS.md line.
  - `admin-nav.ts` permission keys all exist in auth's `permissions.ts` registry (add a test asserting it).
  - **Accept:** `npm run verify` green (admin-nav test + locale-preference int test + guards tests);
    Staff user sees fewer nav items than Owner (int or e2e test).
  - **Evidence:** 7839108; verify exit 0 -> 62 files / 767 tests; new admin-nav-permissions.int.test (keys in registry, Owner sees all, Staff fewer, no users.manage) + locale-preference.int green. NOTE: shell e2e (shell-admin, shell-a11y /admin pages) relied on the dev-Owner stub -> must sign in (fix in PLM-08)

- [x] **PLM-07 OTP/reset delivery through core messaging; customer dedupe** — FR-ACC-003/005, CON-05, FR-MSG (outbox)
  - `modules/auth/otp-delivery.ts`: replace the `SHIM(platform-merge)` outbox writes with core `sendMessage`
    (`src/modules/core/messaging.ts`), keeping payload keys `code` / `url` and the WhatsApp -> SMS fallback behaviour.
  - Check auth customer registration vs engagement `upsertCustomer` (guest name/phone/email): same phone/email must
    resolve to one `customers` row (both match on the unique indexes) — add an int test covering register-after-guest
    and guest-after-register.
  - **Accept:** `npm run verify` green; `grep -rn "SHIM(platform-merge)" src` → none; phone OTP request in dev shows
    the message on `/ar/dev/outbox`.
  - **Evidence:** 524736c; otp-delivery ports -> core sendMessage (one channel/call, failed -> throw -> SMS fallback), README wiring section; new customer-dedupe.int.test (4 cases: register/guest both orders, phone sign-in/guest both orders -> one row); verify exit 0 -> 63 files / 771 tests; grep SHIM(platform-merge) src -> 0; e2e customer phone OTP reads code from outbox (green). Late-duplicate WhatsApp retry -> BACKLOG

- [x] **PLM-08 Apply OPEN change requests** — (process; CHANGE-REQUESTS 2026-09-26 21:58, 2026-09-27 03:40)
  - `vitest.config.ts`: `server.deps.inline: ["next-intl"]` for unit + integration projects; remove the shell tests'
    `vi.mock("@/lib/i18n/navigation")` shims only if they are now unnecessary (keep if they still add value).
  - `playwright.config.ts`: `globalSetup` that warms `/ar`, `/en`, `/en/sign-in`, `/ar/staff/sign-in`, `/en/admin/users`
    serially before workers start (keep parallel workers); mark both CRs `status: DONE (platform merge PLM-08)`.
  - **Accept:** `npm run verify` green; cold `.next` removed then `npm run test:e2e` green on the first run.
  - **Evidence:** cdd113b; vitest server.deps.inline next-intl (unit+int) + navigation-load.test; playwright globalSetup warms every page+API route serially; tests/e2e/support/owner-session.ts (2FA-complete throwaway Owner cookie) used by shell-admin/shell-a11y; de-raced dev-tools fault toggle + shell-store scroll-lock check; rm -rf .next -> npx playwright test 95 passed first run; verify exit 0 -> 64 files / 772 tests; both CRs DONE

## C. Clean re-validation, tag, notes

- [x] **PLM-09 Clean-from-scratch validation** — (all Phase 0)
  - Stop dev server + DB; delete `web/node_modules`, `web/.next`; `npm ci`; `npm run db:reset` (or db:start +
    db:setup + db:seed); `npm run typecheck`; `npm run lint`; `npm test` (all vitest); `npm run test:e2e` (all specs).
  - **Accept:** every command exit 0; record counts (test files / tests, e2e passed) in evidence.
  - **Evidence:** db:stop; rm -rf node_modules .next test-results; npm ci (568 pkgs) exit 0; db:start + db:reset exit 0; typecheck exit 0; lint exit 0; npm test -> 64 files / 772 tests passed; npm run test:e2e (cold .next) -> 95 passed, 0 failed; HEAD cdd113b

- [x] **PLM-10 Browser acceptance on :3000** — UI-001..006, FR-ACC-009..013, CI-004 dev tooling
  - `npm run dev` (background). Check with Playwright/browser: `/ar` (rtl, Arabic) and `/en` storefront home;
    sign in at `/ar/staff/sign-in` as the seeded Owner (credentials from `.env.local`, never echoed), complete TOTP
    enrolment/challenge (generate the code with an `otplib` script reading the enrolment secret — do not print it),
    land on `/ar/admin` with the sidebar, open `/ar/admin/users`; `/ar/dev/outbox` lists messages (trigger one:
    customer phone OTP or forgot-password); `/ar/dev/services` renders. Screenshots -> `lanes/merge/shots/`.
  - **Accept:** all pages 200 and visually correct (screenshots saved); no server errors in the dev log.
  - **Evidence:** npm run dev :3000 + scratchpad accept.mjs (Playwright): /ar 200 rtl ar, /en 200 ltr en; seeded Owner /ar/staff/sign-in -> forced TOTP enrolment (otplib, secret never printed/masked in shot) -> recovery codes -> /ar/admin 200 sidebar + viewer, /ar/admin/users 200 (6 rows), /en/admin 200; customer phone OTP -> /ar/dev/outbox shows auth.otp whatsapp sent; /ar/dev/services 200 (8 services); no 5xx/page errors (dev log only the deliberate /dev/ui/boom). Fixed dev pages' invisible active tabs/pills (Tailwind palette reset) -> tokens, commit 3afe1f6. Shots: lanes/merge/shots/01..08

- [x] **PLM-11 CONTRACTS.md + FOUNDATION-NOTES.md + README** — (process)
  - `ROOT/.orchestration/CONTRACTS.md`: add/verify the auth contract section (`modules/auth/index.ts` exports:
    `requireStaff`, `staffRoute`/`staffAction`, `getCurrentStaff`, `getCurrentCustomer`, `can`, `audit`, rate limit,
    phone lib) and core messaging/`sendMessage`; every export listed actually exists (spot-check with `git grep`);
    "Stubs left for Phase 1" list accurate (`git grep -n "STUB(contracts)"`).
  - `ROOT/.orchestration/FOUNDATION-NOTES.md` (≤ 80 lines): how to run (ports per team, db scripts, verify, e2e warm-up),
    where things are (layout, contracts, i18n namespaces, nav registry, dev pages), conventions (money agorot, UTC /
    Asia/Jerusalem, messages ar+en, logical CSS, permissions + `requireStaff`, audit), the contract/stub pattern
    (`STUB(contracts)`, manifest test, CHANGE-REQUESTS), gotchas (the lanes' Gotchas sections, deduped).
  - `web/README.md`: add the merged scripts/pages (`jobs`, `/dev/outbox`, `/dev/services`, `/dev/ui`, staff sign-in + 2FA).
  - **Accept:** `wc -l FOUNDATION-NOTES.md` ≤ 80; every export named in CONTRACTS.md found by `git grep`; commit README.
  - **Evidence:** CONTRACTS.md: new ### auth section (pages/routes/actions guards, permissions, audit, rate limit, OTP ports via core.sendMessage, phone lib), Auth convention bullet points to it; git grep -w of all 29 core + 35 auth + 3 phone names -> 0 missing; STUB(contracts) list matches git grep (inventory 5, payments 4, orders 3, engagement texts). FOUNDATION-NOTES.md 68 lines. web/README.md 512bf0a (jobs, dev pages table, staff 2FA, e2e warm-up). DECISIONS + BACKLOG lines added

- [x] **PLM-12 Tag, worktrees, close-out** — (process)
  - `git tag foundation-v1` on the validated `main` HEAD; `git worktree remove` the three platform worktrees
    (`D:/Personal/Projects/DardaChat-wt/platform-auth|shell|contracts`; stop anything on their ports first; keep the
    branches); stop dev server + DB on 3000/54320; final HANDOVER/LEADER; STATUS not ours (orchestrator).
  - **Accept:** `git tag --list foundation-v1` shows it at HEAD; `git worktree list` shows only ROOT; `git branch`
    still lists platform/auth|shell|contracts; ports 3000/54320 free.

  - **Evidence:** git tag foundation-v1 -> 512bf0a (= HEAD); 3 branches ancestors of main; git worktree remove x3 (leftover dangling Turbopack junction in platform-auth removed) -> worktree list shows only ROOT; git branch lists platform/auth|contracts|shell; dev server + DB stopped, 3000/54320 free
  - **Leader relay #2:** tag moved to 74d77d0 (PLM-13) after leader validation; still local-only, Phase 1 not started.

## D. Leader validation fixes

- [x] **PLM-13 Staff default landing + table word-splitting** — FR-ACC-009..012, UI-003, NFR-LOC-001
  - `staffNext()` defaulted to `/<locale>/admin/users` (`users.manage`, Owner-only) → a Staff user signing in without
    `?next=` landed on `/staff/forbidden`. Default = `/<locale>/admin` (`dashboard.view`, every role).
  - `body { overflow-wrap:anywhere }` shrank table min-content: `/ar/admin/users` split Arabic words mid-letter
    ("نش/ط", "المال/ك"). `th, td { overflow-wrap: break-word }` in globals.css.
  - **Evidence:** 74d77d0 (leader); new staff-pages.test.ts; staff.spec expects /en/admin; npm run verify exit 0 ->
    65 files / 774 tests; npx playwright test -> 95 passed; Arabic owner sign-in + TOTP -> /ar/admin, users table
    re-screenshotted (lanes/merge/shots/L1..L7); `git tag -f foundation-v1` -> 74d77d0.
