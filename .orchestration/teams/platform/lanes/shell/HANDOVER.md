# Handover — platform/shell (W3) — leader — relay #4
Updated: 2026-09-27T03:20:08+03:00   Branch/HEAD: platform/shell @ 58b221b
## Task
Lane W3 "shell" of Phase 0: i18n/RTL routing, tokens, primitives, store + admin shells, errors, locale persistence,
a11y, docs (SHL-01..14). All 14 tasks are [x] and leader-validated (LEADER.md relay #3 + #4). Lane is DONE.
## State
- Done: SHL-13 + SHL-14 validated by the leader this relay: fresh `db:reset` → `npm run verify` green (514 tests),
  `npx playwright test` 80 passed on :3011, heading-font fix confirmed by computed styles, README exports spot-checked.
  Shots `shots/leader-r4/*`.
- In progress: nothing. Worktree clean; dev server and DB on :54331 stopped, ports free.
- Broken/known issues: none. CR (2026-09-26 21:58) vitest `inline: ["next-intl"]` still OPEN (platform leader's call).
## Next move
Platform leader: merge branch `platform/shell` (@ 58b221b) with auth (W2) and contracts (W4) using the MERGE NOTES
below; after merge run `npx next typegen`, `npm run verify`, `npm run test:e2e`, then wire the viewer seam to auth and
dedupe the locale-preference functions.
## MERGE NOTES (for the platform leader)
- Seams to wire: `src/lib/shell/viewer.ts` `getShellViewer` (stub: dev Owner with every `ADMIN_NAV_PERMISSIONS` key
  outside production, null in production) → auth `getCurrentStaff`; `getShellSubject` (stub null) →
  auth `getCurrentStaff`/`getCurrentCustomer` as `{type, id}`.
- Permission keys: `admin-nav.ts` uses auth's registry keys (DECISIONS SHL-10 entry); re-run `admin-nav.test.ts`
  against auth's real registry after merge.
- Admin auth: admin layout does not authenticate (DECISIONS). Auth's admin-page `requireStaff` walker must exempt
  `app/[locale]/admin/[...rest]/page.tsx` (notFound only); `admin/page.tsx` needs `requireStaff("dashboard.view")`.
- Locale persistence: auth's `setSubjectLocale` vs shell's `persistLocalePreference`/`preferredLocale`
  (`src/lib/i18n/locale-preference.ts`) — keep one; `rememberLocale` action in `src/lib/i18n/actions.ts` calls it.
- `ToastProvider` is mounted in `src/app/[locale]/layout.tsx`; `NextIntlClientProvider` there too.
- `next.config.ts`: `createNextIntlPlugin("./src/lib/i18n/request.ts")`, placeholder `/`→`/ar` redirect removed,
  `experimental.globalNotFound: true`. Proxy is `src/proxy.ts` (next-intl middleware, `/api` excluded).
- Files outside the brief's list (CHANGE-REQUESTS 2026-09-26 23:00, accepted): `admin/[...rest]/page.tsx`,
  `admin/error.tsx`, `app/global-not-found.tsx`, `lib/cn.test.ts`.
- Conflict-prone: `messages/{ar,en}/common.json`, `src/app/[locale]/layout.tsx`, `next.config.ts`,
  `src/components/ui/icons.tsx`, `src/lib/i18n/namespaces.ts` (namespace list), `(store)` home moved from
  `[locale]/page.tsx` (deleted). After merge: `npx next typegen` then `npm run verify` + `npm run test:e2e`.
## Gotchas
- `npm run verify` + `db:reset` together exceed a 10-min tool timeout; run in background and poll the output file.
- Dev server first compile ~70s; first `curl /ar` may return 000 — retry, then run Playwright (reuses the server).
- `npm run db:stop` reports pg_ctl exit 1 (shutdown checkpoint sync ~65s on this disk); it still stops — poll
  `netstat` for :54331. Stop the server via `netstat -ano | grep ":3011 "` → `taskkill //T //F //PID <pid>`.
- Unknown locale `/xx/nope` → 307 `/ar/xx/nope` → 404; only unmatched URLs (e.g. `/nope.txt`) hit global-not-found.
- Error boundaries use the Next 16.3 `retry` prop; `/[locale]/dev/ui/boom` throws unless cookie `dc_boom=off`.
- Two LocaleSwitchers on store pages (header + hidden mobile menu): locate with `:visible`. `.env.local` holds seed
  passwords: never cat it.
