# Leader log — platform/merge

## Plan rationale (relay #0, 2026-09-27)
- No lane BRIEF existed; wrote `BRIEF.md` from the orchestrator prompt + parent brief "Leader duties (phase 0)".
- Pre-check: `git diff --name-only main...platform/<l>` for the three lanes → 89/94/81 files, **zero overlap**.
  So textual conflicts are unlikely; the risk is semantic. The plan is organised around the seams the lanes
  documented in their HANDOVER merge notes and the two OPEN change requests.
- Merge order contracts → auth → shell: contracts supplies platform services (core `sendMessage`, errors, context)
  that auth's shim rebinds to; auth supplies the guards and permission registry that shell's admin pages and
  viewer need; shell last because its admin pages will immediately trip the auth walker (no exemptions) and its
  i18n tests (namespaces, no-literals) will see auth + dev pages — PLM-04 fixes those in the same task so main
  never stays red.
- Seam wiring split into three small tasks (PLM-05 UI/i18n/layout, PLM-06 viewer/locale/nav permissions,
  PLM-07 OTP delivery + customer dedupe), then CRs (PLM-08), then clean validation (PLM-09), browser acceptance
  (PLM-10), docs (PLM-11), tag + worktree removal (PLM-12). Tag only after PLM-09/10 pass on the final HEAD.
- Nothing deliberately left out of the brief, so no BACKLOG additions at planning time.

## Risks
- Double page chrome / layout mismatch when auth pages render inside shell layouts (PLM-05, check visually).
- `no-literals` / messages-parity tests from shell may flag contracts' `/dev/*` pages (dev-only English strings):
  decide between messages or a documented dev-only allow-list; record in DECISIONS.md.
- Two locale-preference implementations; two customer-creation paths (auth register vs engagement upsertCustomer).
- Cold Turbopack e2e flake (CR 03:40) — fixed by a warm-up globalSetup in PLM-08; verify on a deleted `.next`.
- Long-running commands vs tool timeouts; embedded Postgres slow stop on this disk.
- Worktree removal on Windows can fail on locked files (running DB/node): stop their ports first.

## How I will validate
- Each worker batch: re-run `npm run verify` myself (background + poll), read the diff of seam files, grep
  `SHIM(platform-merge)` / `STUB(` leftovers, and for UI tasks load the pages on :3000 and look at screenshots.
- Final: PLM-09 clean-from-scratch run and PLM-10 browser run are re-done by me before `git tag foundation-v1`.

## Review log
### Leader relay #2 (2026-09-27) — validated PLM-01..12 (worker relays #1-#2), all on main
- Repo: main clean (only untracked .orchestration/), 79 commits ahead of origin (nothing pushed); worktree list =
  ROOT only; branches platform/auth|contracts|shell kept; no OPEN change requests; SHIM(platform-merge) -> 0.
- Ownership: every non-merge commit 845ec9f..512bf0a touches only `web/` -> inside lane ownership. PASS.
- db:start + db:reset exit 0; `npm run verify` exit 0 (64 files / 772 tests); dev :3000 curl /ar /en /ar/sign-in
  /ar/staff/sign-in /ar/dev/outbox /ar/dev/services 200, /ar/admin 307 -> staff sign-in, html lang=ar dir=rtl;
  `npx playwright test` 95/95. PASS.
- Own Arabic acceptance spec (temporary, deleted): /ar + /en store, seeded Owner sign-in in Arabic -> forced TOTP
  enrolment (otplib, key masked) -> recovery codes -> admin, /ar/admin/users, customer phone OTP -> row on
  /ar/dev/outbox, /ar/dev/services; no page errors. Shots L1..L7 in shots/.
- FOUND + FIXED (PLM-13, 74d77d0): (1) staff default landing was /admin/users (Owner-only) -> Staff role would hit
  /staff/forbidden after sign-in; now /admin. (2) /ar/admin/users table split Arabic words mid-letter (global
  overflow-wrap:anywhere) -> th/td break-word. Re-verify: verify 65/774, e2e 95/95, re-screenshot OK.
- Dev-log hydration warnings (`caret-color: transparent`) come from Playwright screenshots, not the app.
- Docs: FOUNDATION-NOTES 68 lines, accurate; CONTRACTS auth section matches index.ts exports. PASS.
- Tag: `git tag -f foundation-v1` -> 74d77d0 (local only, no Phase 1 worktree yet); DECISIONS line.
- BACKLOG: OTP late duplicate (worker), e2e rows pollute dev DB, duplicate sign-out on /admin/users.
- Verdict: lane DONE. Dev server + DB stopped, 3000/54320 free.
