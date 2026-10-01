# Lane W3 `shell` — team PLATFORM — Phase 0

Parent brief: `ROOT/.orchestration/teams/platform/BRIEF.md` (section "W3 shell" is authoritative; this file adds the
lane's concrete decisions). Stack/layout: `ROOT/.orchestration/PLAN.md` §1–§2. Shell decisions that affect other
lanes/teams are in `ROOT/.orchestration/DECISIONS.md` (entries tagged `platform/shell`) — read them.

- **Working dir:** `D:/Personal/Projects/DardaChat-wt/platform-shell` (git worktree), app in `.../platform-shell/web`.
  **Branch `platform/shell`** (from `main` @ 827abc4). The platform leader merges it into `main`.
- **Ports:** Postgres **54331**, web **3011** (already in `web/.env.local`). Never use 3000/54320 or other lanes' ports.
- **SRS to read** (`ROOT/docs/DardaChat-SRS draft-v0.1.md`, only the rows): UI-001..006 (§3.1, ~line 192),
  NFR-USA-001..005 and NFR-LOC-001..005 (§6, ~lines 679–695). Brand facts: `ROOT/docs/HANDOFF.md` §2.
- **Next.js 16**: read `web/node_modules/next/dist/docs/` for anything routing/layout/proxy/not-found/font related —
  middleware is `proxy.ts` in this version. Use context7 for next-intl v4 docs.

## Owned paths (stay inside them — auth and contracts lanes run in parallel on the same base)
`web/src/lib/i18n/**`, `web/src/lib/nav/**`, `web/src/lib/shell/**`, `web/src/lib/cn.ts`, `web/src/proxy.ts`,
`web/src/components/**`, `web/messages/{ar,en}/common.json`, `web/messages/{ar,en}/storefront.json` (home placeholder
only), `web/src/app/globals.css`, `web/src/app/[locale]/layout.tsx`, `web/src/app/[locale]/page.tsx` (removed/moved),
`web/src/app/[locale]/(store)/**` (layout + placeholder home only), `web/src/app/[locale]/admin/layout.tsx`,
`web/src/app/[locale]/admin/page.tsx` (placeholder), `web/src/app/[locale]/admin/not-found.tsx`,
`web/src/app/[locale]/{not-found,error}.tsx`, `web/src/app/[locale]/[...rest]/page.tsx`, `web/src/app/global-error.tsx`,
`web/src/app/[locale]/dev/ui/**` (design-system gallery, dev only), `web/tests/e2e/platform/shell-*.spec.ts`,
`web/next.config.ts` (next-intl plugin + drop the placeholder redirect ONLY), `web/src/lib/smoke.test.ts` and
`web/tests/e2e/platform/smoke.spec.ts` only if a shell change makes them wrong.
**Not yours:** `web/package.json`/lockfile (NO new dependencies — axe-core is already in node_modules via
eslint-plugin-jsx-a11y; icons are inline SVG), `web/README.md`, `src/db/**`, `src/modules/**`, auth pages
(`admin/sign-in`, account sign-in), `/dev/outbox`. Need something there → `ROOT/.orchestration/CHANGE-REQUESTS.md`.

## Scope
1. next-intl routing: `/ar` default + `/en`, proxy, `[locale]` root layout with provider, `lang`/`dir`, static params,
   namespace message loader, localized navigation helpers (UI-001, UI-003 URL part).
2. Guards for everyone: messages ar/en parity test, no-JSX-literal scan (NFR-LOC-001), no-physical-direction-class scan (NFR-LOC-002).
3. Locale formatting (numbers, dates Asia/Jerusalem, currency via `src/lib/money.ts`, Latin digits per DECISIONS)
   and bidi isolation helpers + `<Bdi>` (UI-002, NFR-LOC-004/005).
4. Arabic typeface with full coverage + Latin pairing via `next/font` (NFR-LOC-003); design tokens in `globals.css`
   (`@theme`): warm, playful but premium boxed-conversation-game brand — cards, conversation, gathering; NOT generic SaaS.
   Visible focus ring everywhere (NFR-USA-003); colour never the only signal (NFR-USA-004).
5. Base components: Button, Input, Textarea, Select, Checkbox, Field(+error), Card, Table, Badge, Dialog, Toast, Tabs,
   EmptyState, Skeleton, Pagination, PriceTag, LocaleSwitcher, Bdi, icons (directional icons mirror in RTL).
   Server-renderable where possible; client components only where interaction needs it.
6. Storefront layout (header, nav, mobile menu, footer, cart-icon slot, assistant slot, skip link) from a store nav
   registry; admin layout (sidebar from an admin nav registry pre-populated with every module's section, permission
   filtering, mobile drawer for UI-005, viewer seam) — see DECISIONS.
7. Error/404 pages in both locales, plain-language "what happened + what to do" (NFR-USA-005); error-copy convention for teams.
8. Locale persistence for signed-in users (UI-003) through a seam the leader wires to auth at merge.
9. Responsive 320→1440 with no horizontal scroll (UI-004); axe WCAG 2.2 AA on shell templates (UI-006) via Playwright
   + axe-core loaded from node_modules; docs `web/src/components/README.md` for Phase 1 teams.

Out of lane (backlog or other lanes): real sign-in state (auth), outbox page (contracts), dark mode, formal audit.
