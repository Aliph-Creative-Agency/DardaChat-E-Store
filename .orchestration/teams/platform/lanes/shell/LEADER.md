# Leader log — platform / lane W3 `shell`

## Plan rationale (relay #0, 2026-09-26)
- Order = routing first (SHL-02) so every later page is localized from birth; guard tests (SHL-03) right after so no
  literal / physical-direction class ever lands; formatting + bidi (SHL-04) before components that display numbers;
  tokens + fonts + dev gallery (SHL-05) give a single page to eyeball every component in ar and en; primitives in
  three batches (SHL-06..08); then the two layouts (SHL-09 store, SHL-10 admin), error pages (SHL-11), locale
  persistence (SHL-12), a11y/responsive sweep (SHL-13), docs + merge notes (SHL-14).
- Task ids `SHL-xx` (not PLA-) so they never collide with the auth/contracts lanes.
- Cross-lane contracts were decided up front and written to DECISIONS.md (`platform/shell` entries) so the auth and
  contracts lanes, planning in parallel, can code against them: i18n paths, proxy scope, namespace loader, component
  location, admin layout does not authenticate + viewer seam, `<module>.view` permission keys, locale-preference API.
- No new npm dependencies (package.json/lockfile conflicts across 3 lanes are expensive): icons inline SVG, render
  tests with `react-dom/server`, axe-core loaded from node_modules (present via eslint-plugin-jsx-a11y).

## Risks
- Merge conflicts on `[locale]/layout.tsx`, `next.config.ts`, `common.json` if other lanes touch them — mitigated by
  DECISIONS entries; merge notes in SHL-14.
- Next 16 + next-intl v4 API drift (proxy.ts, `hasLocale`, root not-found without root layout) — workers must read
  `node_modules/next/dist/docs` and context7 before coding.
- Google Fonts fetch at dev/build time needs network; if it fails, fall back to `next/font/local` is NOT possible
  without font files → record and use system stack temporarily.
- Nav permission keys may not match auth's registry — mapped at merge.

## How I validate each batch
Pull the worker's commits, run in `web/`: `npm run typecheck`, `npm run lint`, `npm test` (unit + integration), the
task's e2e spec on :3011, and open `/ar` + `/en` (+ `/ar/dev/ui`, `/ar/admin`) in the browser at 375 and 1440 px,
checking RTL mirroring, Arabic rendering, focus ring and no horizontal scroll. Verdict per task below.

## Review log
- relay #0: SHL-01 environment set up by the leader (see HANDOVER gotchas). Plan written. No worker output yet.
- relay #3 (leader, 2026-09-26 ~23:00): first leader validation since relay #0 → covered SHL-02..SHL-12 together.
  Branch platform/shell @ f2ecfd0 (11 commits over main 827abc4), tree clean.
  Checks: `npm run verify` (next typegen + tsc + eslint + vitest unit+integration) → 28 files / 514 tests passed;
  `npx playwright test` on :3011 → 49 passed (smoke 3 + shell-routing/locale/components/store/admin/errors);
  curl: `/`→307 `/ar`, `/xx/nope`→307→404, `/nope.txt`→404, `/ar|en|ar/admin|en/admin|ar/dev/ui`→200, `/ar/nope`→404.
  Leader axe run (wcag2a/2aa/21a/21aa/22aa) at 1440 + 375 on /ar, /en, /ar/admin, /en/admin, /ar/nope,
  /ar/admin/orders, /ar/dev/ui/boom → 0 violations, 0 horizontal overflow. Console errors only the expected 404/500s.
  Visual (shots/leader-r3/*): RTL mirroring correct (sidebar right in ar, left in en; arrows flip), Arabic is real,
  tatreez brand reads warm/premium not SaaS, mobile menu + admin drawer + 404/error pages in store chrome look right.
  Verdicts: SHL-02..SHL-12 ACCEPTED. One polish defect → added as LEADER FIX at the head of SHL-13: Reem Kufi on
  small headings (h3 16px in admin cards, footer column titles) is cramped/dots crowd — restrict display face to
  h1/h2/wordmark.
  Ownership: 4 files outside the brief's owned list — `app/[locale]/admin/[...rest]/page.tsx`,
  `app/[locale]/admin/error.tsx`, `app/global-not-found.tsx`, `lib/cn.test.ts`. All new files that are natural
  extensions of SHL-10/11 scope (in-shell admin 404/error, root 404 required by Next 16 for unmatched URLs) and the
  owned cn.ts's test; no other lane is expected to create them. Accepted; recorded retroactively in CHANGE-REQUESTS.md
  so the platform leader sees them at merge (auth's admin-page permission walker must exempt `admin/[...rest]`).
  Open concerns for merge: viewer stubs → auth session; `setSubjectLocale` vs `persistLocalePreference` dedupe;
  vitest `inline: ["next-intl"]` CR still OPEN; conflict-prone common.json/next.config.ts/icons.tsx/[locale]/layout.tsx.
- relay #4 (leader, 2026-09-27 ~03:20): validated SHL-13 + SHL-14 (commits 52a65c5, 7931987, 58b221b over f2ecfd0).
  Ownership: `git diff --stat f2ecfd0..HEAD` = 11 files, all shell-owned (globals.css, dev/ui page, shell/ui
  components, README, 3 shell e2e specs). No new CR needed.
  Checks (fresh): `db:start` → `db:reset` (seeded) → `npm run verify` EXIT 0 (typegen+tsc+eslint, 28 files / 514
  tests); dev server :3011 → `npx playwright test` 80 passed (59.6s), incl. shell-a11y 31 (axe wcag2a..22aa on 9 URLs
  × 1440/375 + boom page = 0 violations; 320..1440 sweep; Tab-walk ring ≥2px on /ar, /en/admin, /ar/dev/ui).
  Spec reviewed: real axe injection (no dep), excludes only the dev-only `nextjs-portal`, asserts on computed outline,
  not a screenshot diff — a meaningful guard. Drawer/mobile-menu `expect.poll` change keeps the same end-position
  assertion (not a weakening).
  Leader-fix check (computed styles): /ar/admin h1 Reem Kufi 36px, h2 Reem Kufi 24px, h3 cards IBM Plex Sans Arabic
  16px/600; /en/admin h3 IBM Plex Sans 600; /ar footer column h2s Plex Arabic 18px/600; hero h1 Reem Kufi 48px.
  Visual (shots/leader-r4/*): admin card titles now crisp and legible; footer headings clean; 375 admin fine.
  README: 10 sections; spot-checked 20 named exports/props (formatPhone, isolateValues, errorMessageKey,
  errorCodeFromStatus, filterNav, buttonClasses, SkeletonBlock, CardDescription/Footer, STORE_*_NAV,
  LATIN_ONLY_ALLOWED, persistLocalePreference, rememberLocale, getShellSubject, IconChevronForward/ArrowBack,
  captionHidden, dismissOnBackdrop, PAGES) — all exist. Merge notes in HANDOVER complete.
  Verdicts: SHL-13 ACCEPTED, SHL-14 ACCEPTED. All SHL-01..14 [x] and validated → lane team_done.
  Open for the platform leader (not lane tasks): vitest `inline: ["next-intl"]` CR (2026-09-26 21:58); viewer seam →
  auth; locale-preference dedupe; `admin/[...rest]` exemption in auth's page walker.
