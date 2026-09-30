# Tasks — platform / lane W3 `shell`

Worktree `D:/Personal/Projects/DardaChat-wt/platform-shell` (branch `platform/shell`), app in `web/`, PG 54331, web 3011.
Commands run from `.../platform-shell/web`. Every task: `npm run typecheck` + `npm run lint` + the tests named below
green, commit `platform(shell): SHL-xx <summary>`, paste one-line evidence under the task. UI tasks also load the page
on :3011 (dev server in background, stopped before retiring). All copy via next-intl in real Arabic + English.
Owned paths: see BRIEF.md. No new npm dependencies. Read DECISIONS.md `platform/shell` entries before starting.

Legend: `[ ]` todo · `[~]` partial (note) · `[x]` done (evidence) · `[!]` blocked (reason)

- [x] **SHL-01 Lane environment** — SRS: — · Paths: worktree, `web/.env.local` (gitignored)
  Worktree from main @ 827abc4, `npm ci`, `.env.local` with 54331/3011 + generated SESSION_SECRET, `db:start`,
  `db:setup`, `db:seed`. Accept: `npm run verify` green and `npm run test:e2e` (3 smoke) green on :3011.
  Evidence (2026-09-26 20:41, leader): `npm run verify` → 16 files / 415 tests passed; `npm run test:e2e` → 3 passed on :3011.

- [x] **SHL-02 next-intl routing + root layout** — UI-001, UI-003 (URL), UI-002 (dir)
  Paths: `src/lib/i18n/{routing,navigation,request}.ts`, `src/proxy.ts`, `next.config.ts` (createNextIntlPlugin with
  `./src/lib/i18n/request.ts`; delete the placeholder `/`→`/ar` redirect), `messages/{ar,en}/common.json`,
  `src/app/[locale]/layout.tsx` (hasLocale→notFound, `setRequestLocale`, `generateStaticParams`, `lang`/`dir`,
  `NextIntlClientProvider`, metadata from messages), request.ts namespace loader (fixed list per DECISIONS; missing file
  → `{}`; `timeZone: "Asia/Jerusalem"`), `/` → `NEXT_LOCALE` cookie or `/ar` (Accept-Language ignored),
  `localePrefix: "always"`. Keep `src/i18n-locales.ts` as the source list. Existing `[locale]/page.tsx` switches to
  `getTranslations("common")` (moved to `(store)` in SHL-09).
  Accept: new `tests/e2e/platform/shell-locale.spec.ts` passes: `/` → `/ar` even with `Accept-Language: en`; cookie
  `NEXT_LOCALE=en` → `/` → `/en`; `/ar` rtl+lang ar, `/en` ltr+lang en; `/fr` and `/xx/abc` → HTTP 404; `/api/*` not
  redirected. Existing smoke e2e still green.
  Evidence (relay #1): typecheck+lint green; `npx playwright test tests/e2e/platform` → 8 passed (5 shell-locale + 3 smoke) on :3011.

- [x] **SHL-03 i18n + RTL guard tests** — NFR-LOC-001, NFR-LOC-002
  Paths: `src/lib/i18n/messages.test.ts`, `src/lib/i18n/no-literals.test.ts`, `src/lib/i18n/logical-classes.test.ts`.
  (a) every `messages/<ns>.json` present in both locales or neither; identical flattened key sets; no empty values;
  every ar value contains Arabic script unless its key is in an explicit allow-list (brand names, ICU-only);
  ICU placeholders `{x}` identical in both. (b) scan `src/app/**/*.tsx` + `src/components/**/*.tsx` (+ `src/modules/**/ui/**`)
  for JSX text / `aria-label|title|placeholder|alt` string literals containing letters; escape hatch comment
  `// i18n-ignore` on the line. (c) scan `src/**/*.tsx` className strings for physical classes
  (`\b-?(ml|mr|pl|pr|left|right)-`, `text-(left|right)`, `rounded-(l|r|tl|tr|bl|br)-?`, `border-(l|r)-?`,
  `float-(left|right)`, `space-x-reverse`) with the same escape hatch.
  Accept: `npx vitest run --project unit src/lib/i18n` green; evidence notes that a temporary literal / `ml-2`
  made the relevant test fail (then reverted).
  Evidence (relay #1): `npx vitest run --project unit src/lib/i18n` → 11 passed; with a temp `Hello` literal + `ml-2` in page.tsx and English in ar/common.json → 3 failed (literals, physical classes, Arabic script), reverted. Scanner = TS compiler AST (`src/lib/i18n/guard-scan.ts`).

- [x] **SHL-04 Locale formatting + bidi** — UI-002, NFR-LOC-004, NFR-LOC-005
  Paths: `src/lib/i18n/format.ts` (+ `.test.ts`), `src/lib/i18n/bidi.ts` (+ `.test.ts`), `src/components/ui/Bdi.tsx`.
  `formatNumber`, `formatPercent`, `formatDate`/`formatDateTime`/`formatTime` in Asia/Jerusalem (ar month names —
  check whether `ar-PS`/Levantine names like "أيلول" are available in Node ICU and pick deliberately, record in
  handover), Latin digits in both locales (DECISIONS: `-u-nu-latn`), `formatMoney` delegates to `src/lib/money.ts`,
  `formatPhone` (display E.164 LTR-isolated), `isolate(s)` (FSI…PDI), `ltr(s)`; `<Bdi>` wraps mixed content.
  next-intl `formats` in request.ts aligned with these helpers.
  Accept: unit tests incl. `"طلب رقم DC-7K3M-9QPT (2 قطع)."` punctuation order preserved via isolation, a UTC
  timestamp 2026-09-26T21:30Z formats as 27 Sep (Jerusalem, UTC+3), money 110.00 ILS in both locales matches money.ts.
  Evidence (relay #1): `npx vitest run --project unit src/lib/i18n` → 20 passed (format 6, bidi 3 incl. DC-7K3M-9QPT sentence, 27 أيلول / 27 Sept, ₪110.00). Locales: `ar-PS-u-nu-latn` (Levantine months, Node ICU has them), `en-GB-u-nu-latn`.

- [x] **SHL-05 Typography + design tokens + dev gallery** — NFR-LOC-003, NFR-USA-003, NFR-USA-004
  Use `frontend-design` or `impeccable` skill first. Paths: `src/app/globals.css` (`@theme`: colour ramps — warm
  paper/ink/accent + semantic success/warning/danger/info, type scale, spacing, radius, shadow, motion tokens,
  `prefers-reduced-motion`), fonts via `next/font/google` in `src/lib/shell/fonts.ts` (Arabic body with full
  coverage incl. tashkeel e.g. IBM Plex Sans Arabic; a characterful display face with Arabic+Latin, e.g. El Messiri /
  Reem Kufi / Readex Pro — choose and justify), global `:focus-visible` ring (≥3:1), `src/app/[locale]/dev/ui/page.tsx`
  gallery (notFound() when NODE_ENV=production) with type specimen incl. diacritics "دَرْدَشَةٌ مَعَ الأَحِبَّةِ"
  and Latin, colour swatches, `src/components/ui/tokens.test.ts` computing WCAG contrast for text/background token
  pairs (≥4.5:1 body, ≥3:1 large/UI).
  Accept: contrast test green; Playwright/browse check on `/ar/dev/ui` + `/en/dev/ui`: computed `font-family` of
  body/h1 is the chosen faces, screenshots of both saved to `ROOT/.orchestration/teams/platform/lanes/shell/shots/` (never inside the
  worktree), no console errors.
  Evidence (relay #1): tokens.test.ts 28 passed (27 pairs); browser on :3011 `/ar/dev/ui` body="IBM Plex Sans Arabic"…, h1="Reem Kufi"…; `/en/dev/ui` body="IBM Plex Sans"…; 0 console errors; shots `shots/shl05_{ar,en}_dev_ui-1440.png`. Unit 426 passed, e2e platform 8 passed.

- [x] **SHL-06 Core primitives (server-renderable)** — NFR-USA-003/004/005, UI-006
  Paths: `src/lib/cn.ts` (clsx + tailwind-merge), `src/components/ui/{icons,Button,Input,Textarea,Select,Checkbox,Field,Card,Badge}.tsx`,
  `src/components/ui/index.ts`, render tests `src/components/ui/*.test.tsx` via `react-dom/server`
  `renderToStaticMarkup` (no new deps). Button: variants primary/secondary/ghost/danger, sizes, `loading` (aria-busy,
  label kept), works as `<a>` via `href`. Field: label, hint, error with icon+text, `aria-describedby`/`aria-invalid`
  wiring. Badge: tone + text/icon (never colour-only). Icons: `currentColor`, `aria-hidden`, directional ones take
  `rtl:-scale-x-100`. Add all to the gallery.
  Accept: unit tests assert aria wiring; gallery renders in both locales; keyboard Tab through gallery shows focus
  ring (screenshot); typecheck+lint green.
  Evidence (relay #2): `npx vitest run --project unit` → 443 passed (primitives.test.tsx 12: Field/Checkbox describedby+invalid, Button aria-busy/href, Badge icon+text, icon mirroring; cn 3; +2 contrast pairs); tsc + eslint green; Tab through `/ar|/en/dev/ui` (1440, 375): 21 focusables all `solid 3px` ring, 0 console errors, no h-scroll; shots `shots/shl06_*`.

- [x] **SHL-07 Interactive primitives I: Dialog, Toast, Tabs** — UI-006, NFR-USA-003
  Paths: `src/components/ui/{Dialog,Toast,Tabs}.tsx` (client). Dialog = native `<dialog>` + `showModal()`, labelled,
  Esc/close button, focus returns to trigger, scroll lock. Toast = provider + `useToast()`, `role="status"`
  aria-live polite (errors `alert`), auto-dismiss with pause on hover/focus, positioned at logical end. Tabs = WAI-ARIA
  tabs, roving tabindex, Arrow keys follow visual direction in RTL, Home/End. Mount `ToastProvider` in
  `[locale]/layout.tsx`. Gallery demos.
  Accept: `tests/e2e/platform/shell-components.spec.ts` (Dialog open/Esc/focus-return; Tabs ArrowLeft in `/ar`
  moves to the NEXT tab, in `/en` to the previous; toast appears in a live region) green.
  Evidence (relay #2): `npx playwright test tests/e2e/platform` → 17 passed (9 shell-components: Dialog Esc/close/focus-return/scroll-lock ar+en, Tabs arrows ar/en + Home/End + RTL order, Toast status/alert regions, logical-end position, auto-dismiss + hover pause via page.clock); unit 443, tsc + eslint green; shots `shots/shl07_*`.

- [x] **SHL-08 Interactive primitives II: Table, Pagination, EmptyState, Skeleton, PriceTag, LocaleSwitcher**
  — UI-002, UI-004, NFR-LOC-002/004
  Paths: `src/components/ui/{Table,Pagination,EmptyState,Skeleton,PriceTag,LocaleSwitcher}.tsx`. Table: caption,
  `th scope`, numeric columns end-aligned, overflow-x inside its own wrapper (page never scrolls sideways).
  Pagination: localized Link, `aria-current="page"`, mirrored chevrons, "page x of y" text. Skeleton: `aria-busy`,
  reduced-motion safe. PriceTag: `formatMoney`, compare-at price struck through + sr-only "was/now" text.
  LocaleSwitcher: links to the same path in the other locale (keeps query), `hrefLang`, sets `NEXT_LOCALE`.
  Accept: extend `shell-components.spec.ts`: switcher on `/ar/dev/ui?x=1` lands on `/en/dev/ui?x=1`; table at 320px
  does not widen the page; unit render tests for PriceTag/Pagination markup.
  Evidence (relay #2): `npx playwright test tests/e2e/platform` → 22 passed (switcher `/ar/dev/ui?x=1`→`/en/dev/ui?x=1` + NEXT_LOCALE=en, 320px table scrolls in its region ar+en with page overflow 0, pagination aria-current/query, sale now/was); unit 454 (data-display.test.tsx 11: PriceTag, Pagination window/href/markup, Table scope/region, Skeleton); tsc + eslint green; shots `shots/shl08_*`, 0 console errors. Toast e2e now scoped to the Notifications region (Skeletons add status roles).

- [x] **SHL-09 Storefront shell** — UI-001, UI-002, UI-004, UI-006, NFR-LOC-002
  Paths: `src/lib/nav/store-nav.ts` (home, shop `/products`, Ramadan collection `/collections/ramadan`, journey
  `/journey`, about `/pages/about`, FAQ `/faq`, account `/account`, cart `/cart`; label keys in `common.json` `nav.store.*`),
  `src/components/shell/{StoreHeader,StoreFooter,MobileMenu,SkipLink,CartButton,Wordmark}.tsx`,
  `src/app/[locale]/(store)/layout.tsx` (header with `cartSlot`/`assistantSlot` props filled by placeholders),
  move home to `src/app/[locale]/(store)/page.tsx` with a branded placeholder hero (copy in `messages/*/storefront.json`
  `home.*`), delete `src/app/[locale]/page.tsx`. Footer: policy links, contact/social placeholders, locale switcher.
  Accept: `tests/e2e/platform/shell-store.spec.ts`: header/nav/main/footer landmarks in both locales; first Tab = skip
  link; at 375px the menu button opens/closes the mobile menu (Esc closes, focus returns); no horizontal scroll at
  320/375/768/1024/1440 (`scrollWidth <= innerWidth`) on `/ar` and `/en`; nav sits on the start side (right in ar).
  Evidence (relay #2): `npx playwright test tests/e2e/platform` → 32 passed (shell-store 10: landmarks + skip link → focused `#main`, aria-current home, nav centre >720 in ar / <720 in en at 1440, 375px menu Enter/Esc/focus-return/close button/scroll unlock + sheet on start edge, 320..1440 no h-scroll, both locales); unit 458, tsc + eslint green; 0 console errors; shots `shots/shl09_*`. Layout owns `<main id="main">`; `(store)` pages render content only.

- [x] **SHL-10 Admin shell + nav registry** — UI-005, UI-006, UI-002
  Paths: `src/lib/nav/admin-nav.ts` (+ `.test.ts`): groups + items for EVERY module — dashboard (insights), orders,
  picking & dispatch, returns, delivery outcomes / COD remittances (orders/payments), catalog (products, collections,
  pages, FAQ, policies), inventory (stock, purchase orders, suppliers), payments (payments, invoices, refunds,
  e-invoicing), customers & messaging (customers, templates, campaigns), reports, assistant (conversations,
  escalations, knowledge), journey, settings (users & roles, delivery zones, VAT, store settings), audit log, system
  health; item = {id, href, labelKey, icon, permission, group}; `filterNav(items, permissions)` deny-by-default.
  `src/lib/shell/viewer.ts` seam (`getShellViewer`, `getShellSubject`; stub per DECISIONS).
  `src/components/shell/{AdminShell,AdminSidebar,AdminTopbar}.tsx`, `src/app/[locale]/admin/layout.tsx`,
  placeholder `src/app/[locale]/admin/page.tsx`, `src/app/[locale]/admin/not-found.tsx` ("section not built yet /
  not found"). Mobile: sidebar becomes a drawer ≤ 768px (UI-005), 44px touch targets.
  Accept: unit tests (unique ids/hrefs, every labelKey exists in ar+en common.json, every module present,
  filterNav hides items without permission and returns [] for no permissions); `tests/e2e/platform/shell-admin.spec.ts`:
  `/ar/admin` sidebar on the right (start) and `/en/admin` on the left, `aria-current` on active item, drawer toggles at
  375px, no horizontal scroll 320..1440.

- [x] **SHL-11 Error + not-found pages, error-copy convention** — NFR-USA-005, UI-001
  Paths: `src/app/[locale]/{not-found,error}.tsx`, `src/app/[locale]/[...rest]/page.tsx` (calls notFound() so unknown
  paths get the localized 404), `src/app/global-error.tsx` (bilingual, no provider), 404 for unknown locale (check
  Next 16 docs for root not-found without a root layout), `common.json` `errors.*` (each = what happened + what to
  do), `src/lib/i18n/errors.ts` helper mapping error codes → message keys (documented for teams), dev-only
  `/[locale]/dev/ui/boom` route throwing to exercise error.tsx.
  Accept: `tests/e2e/platform/shell-errors.spec.ts`: `/ar/nope` → 404 status, Arabic copy, link home; `/en/nope` English;
  `/xx/nope` → 404; `/ar/dev/ui/boom` shows localized error with a working "try again" button.
  Evidence (relay #3): `npx playwright test tests/e2e` → 48 passed (shell-errors 6: `/ar|en/nope` 404 + lang + copy + store header + home link, boom → localized error, `retry` re-fetches and recovers once the `dc_boom=off` cookie is set, `/xx/nope` → 307 `/ar/xx/nope` → 404 Arabic, `/nope.txt` → bilingual global 404); unit 473 (errors.test.ts 4); tsc + eslint green; shots `shots/shl11_*`. Catch-all lives at `(store)/[...rest]` (not `[locale]/[...rest]`) so the 404 keeps the store chrome; `app/global-not-found.tsx` + `experimental.globalNotFound` covers URLs no route matches.

- [x] **SHL-12 Locale persistence for signed-in users** — UI-003
  Paths: `src/lib/i18n/locale-preference.ts` (+ `.int.test.ts`), `src/lib/i18n/actions.ts` (server action used by
  LocaleSwitcher: sets `NEXT_LOCALE` cookie; if `getShellSubject()` returns a subject, `persistLocalePreference`),
  wire LocaleSwitcher. `persistLocalePreference({type:"staff"|"customer", id}, locale)` updates
  `staff_users.locale`/`customers.locale` inside `withActor` (journal trigger stays happy); `preferredLocale(subject)`.
  Accept: `npx vitest run --project integration src/lib/i18n` green (writes + reads both tables on the lane test DB);
  e2e: switching to English then visiting `/` lands on `/en`.
  Evidence (relay #3): `npx vitest run --project integration src/lib/i18n` → 4 passed (staff + customer write/read, journal row attributed to the customer, `fr` → RangeError, unknown id → false/null); `npx playwright test tests/e2e` → 49 passed (new: switcher on `/ar` → `/en`, then `/` → `/en`, NEXT_LOCALE=en; action POST seen in dev log); unit 473, tsc + eslint green. Action = `rememberLocale(locale)` in `src/lib/i18n/actions.ts`; the cookie stays client-side (next-intl Link) — setting it in the action would refresh the route before navigating.

- [x] **SHL-13 Accessibility + responsive sweep** — UI-004, UI-006, NFR-USA-001/003/004
  Paths: `tests/e2e/platform/shell-a11y.spec.ts` (+ fixes in owned files). Load `node_modules/axe-core/axe.min.js`
  via `page.addScriptTag({ path })`, run tags wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa on `/ar`, `/en`, `/ar/admin`,
  `/en/admin`, `/ar/dev/ui`, `/ar/nope`; viewport sweep 320/375/768/1024/1440 no horizontal scroll; keyboard-only
  pass (every focusable shows a focus ring — sample via screenshot).
  Accept: spec green with zero violations; full `npm run test:e2e` green.
  LEADER FIX (relay #3 review, do first): Reem Kufi is applied to every h1-h3 (globals.css `h1,h2,h3`), and at
  <=18px (admin card h3 `الطلبات والتوصيل` 16px/600, footer column headings `تسوّق`) its dots crowd and words read
  cramped (see `shots/leader-r3/zoom_admin_cards.png`). Keep `--font-display` for h1/h2 and the wordmark only; h3 and
  any heading rendered <20px use the body stack (Plex Arabic/Plex Sans) at semibold. Re-shoot /ar/admin + /ar footer.
  Note: leader's axe preview (same tags) was already clean on /ar, /en, /ar/admin, /en/admin, /ar/nope,
  /ar/admin/orders, /ar/dev/ui/boom at 1440 and 375 — the spec is still required as the regression guard.
  Evidence (relay #4): leader fix 52a65c5 (h3-h6 + small headings → Plex semibold; computed /ar/admin h3 = "IBM Plex Sans Arabic" 600 16px, footer h2 Plex 600 18px, h1 still Reem Kufi; shots `shots/shl13_ar_admin*`, `shl13_ar_footer-*`). `shell-a11y.spec.ts` 31 passed (axe wcag2a..22aa on 9 URLs × 1440/375 + boom error page = 0 violations; 320..1440 sweep; Tab walk on /ar, /en/admin, /ar/dev/ui: every stop outline ≥2px); mutation (ink-soft #d8d0c8 + outline:none) → color-contrast + focus-outline failures, reverted; full `npx playwright test` → 80 passed; tsc + eslint green; focus shots `shots/shl13_*focus*`.

- [x] **SHL-14 Docs + lane close-out** — all
  Paths: `web/src/components/README.md` (how to: add messages/namespace, Link/redirect, formatting + bidi, components
  catalogue with props, nav registries (read-only for teams, CR to change), error copy convention, RTL rules + the
  guard tests, icon mirroring, admin viewer seam). Update lane HANDOVER with the MERGE NOTES for the platform leader:
  seams to wire (`getShellViewer`/`getShellSubject` → auth session; permission keys ↔ auth registry; ToastProvider in
  layout; next.config plugin), and files likely to conflict.
  Accept: `npm run verify` + `npm run test:e2e` green from a fresh `db:reset`; `git status` clean; leader review in
  LEADER.md.
  Evidence (worker relay #2, 2026-09-27 03:10): `npm run db:reset` → seeded; `npm run verify` → typegen+tsc+eslint green, 28 files / 514 tests passed; `npm run test:e2e` on :3011 → 80 passed (1.2m); README `web/src/components/README.md` (10 sections, claims spot-checked against exports); drawer/mobile-menu box assertions made `expect.poll` (slide-in flake on cold server); merge notes in HANDOVER; tree clean. Leader review done: ACCEPTED (LEADER.md relay #4, 2026-09-27).
