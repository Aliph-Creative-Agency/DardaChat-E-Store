# Leader log — platform/auth (W2)

## Plan rationale (relay #0, 2026-09-26)
- 20 tasks in 6 groups after setup (PLA-A00): B pure building blocks (phone lib, crypto/config, password policy,
  permission registry) → C shared services (rate limiter, audit) → D sessions + guards/contract → E customer auth
  (email/password, OTP service + delivery port, phone sign-in, reset, routes + pages + e2e) → F staff auth (TOTP 2FA,
  pages, user management service, admin users UI/API + e2e) → G deny-by-default walker, log hygiene, close-out.
- Logic before wiring: every service is pure (db, `now`, request meta passed in) so vitest proves the SRS acceptance
  criteria (5-min expiry, single use, 11th request refused, 12 h idle, revoke → next request rejected) with a fake
  clock; Next wiring is thin and proven by 3 Playwright specs.
- The contract (`index.ts`) lands at PLA-A08, early, so the merge and Phase 1 teams have a stable API; decisions
  were posted to DECISIONS.md at planning time so W3/W4 (running in parallel) see them.
- Lane boundaries chosen to make the 3-way merge trivial: auth never edits next.config/proxy/i18n/layouts/package.json
  or other modules' index.ts. Staff auth pages at `/[locale]/staff/*` (not under `admin/`) so W3's admin layout can
  guard/wrap `admin/**` without wrapping the sign-in page. Enforcement in pages/handlers, not middleware.
- Two known shims to resolve at merge: (1) `OtpDelivery` writes to the `messages` outbox table directly → rebind
  to W4's messaging contract; (2) `src/modules/auth/ui/t.ts` reads `messages/<locale>/auth.json` → swap for
  next-intl `getTranslations("auth")` once W3's wiring lands.

## Risks
1. otplib v13 API drift vs agent memory → context7 first (PLA-A14).
2. Next 16 `forbidden()` needs an experimental flag in next.config (W3-owned) → render a 403 view / JSON instead.
3. W4 may also stub `modules/auth/index.ts` or add an audit/rate-limit helper in core → posted in DECISIONS.md;
   resolve at merge in favour of this lane's implementation.
4. Walker test importing route modules under vitest (`server-only`, `next/headers`) → `server-only` already aliased;
   keep `next/headers` access inside `auth/next.ts` and mock it in the walker.
5. Seeded staff have no TOTP → first sign-in forces enrolment; e2e must compute codes with otplib.

## How I validate each batch
- `git diff --stat main..HEAD -- . ':!web/src/modules/auth' ':!web/src/lib/phone*' ':!web/src/app/api/auth'
  ':!web/src/app/api/admin/users' ':!web/src/app/[[]locale]' ':!web/messages/*/auth.json' ':!web/tests/e2e/auth'`
  must be empty (ownership); any `[locale]` file must be one of the owned page paths.
- `npm run verify` green; targeted tests read for the SRS acceptance wording (not just "passes").
- For UI tasks: dev server on 3010, load `/ar` and `/en` pages, run the e2e specs.
- Spot checks: DB rows (no plaintext password/OTP/token), audit rows after admin mutations, `can()` for an unknown key.

## Review log
### Relay #2 review (2026-09-27, HEAD 01c11a7) — PLA-A01..A20 reviewed in one pass
- Ownership: `git diff --stat main..HEAD` minus owned paths → only the 14 owned page files under `[locale]/(store)|staff|admin/users`;
  the single edit outside new files is `auth/seed.ts` (owned). No package.json/next.config/i18n/layout touches. PASS.
- `npm run db:reset` ok; `npm run verify` → typecheck + lint clean, 35 files / 573 tests. PASS.
- `npm run test:e2e`: warm server 15/15 (×2). Cold server (fresh `.next`): 2 of 4 runs had 1 failure — Next dev
  `SyntaxError: Unexpected end of JSON input` on the first-compiled page under parallel workers (not app code; single-spec
  rerun green). Logged in CHANGE-REQUESTS (playwright warm-up / workers:1) + merge note. Not a lane defect.
- Code read vs SRS: guards/next (deny-by-default, unknown key false, 2FA gate, safe `next`), session (hash only, idle/
  absolute, subject status each request), OTP (HMAC, 5 min, single use under concurrency, 5 tries, per-target + per-IP
  10/h), staff-auth (active only, generic errors, TOTP ±1 + replay floor, enrolment refused once confirmed), routes
  (zod, 429 + Retry-After). FR-ACC-001..006/009..015, NFR-SEC-003/004/007/010 each have a test that states the SRS criterion.
- UI (Playwright screenshots, scratch only): `/ar/sign-in`, `/en/sign-up`, `/ar/staff/sign-in`, 2FA setup → 10 recovery
  codes, `/ar/admin/users` (rtl, real Arabic, 13 rows, actions, create form), `/en/admin/users/[id]` (details + audit
  history). Unstyled because brand tokens come from W3's globals.css — expected on this branch; layout/semantics sound.
- **Defect → PLA-A21 (reopened queue):** `must_change_password` is enforced only by a client redirect after 2FA; a
  temp-password user can use every granted admin page/API without changing it (NFR-SEC-003). Fix task written.
- Deliberate deferrals confirmed in BACKLOG: XFF trust for per-IP limits, QR, HIBP, WebAuthn, CAPTCHA, session list UI.
- Merge conflict to resolve: shell's CHANGE-REQUEST asks the walker to EXEMPT `admin/[...rest]/page.tsx`; auth's
  position (keep no exemptions — catch-all calls `requireStaff("dashboard.view")` then `notFound()`) is the
  deny-by-default one. Recommend auth's position at merge.
- Verdict: A00..A20 ACCEPTED; lane not done until A21 lands.

### Relay #3 review (2026-09-27, HEAD 1ff0382) — PLA-A21
- Ownership: `git diff --stat 01c11a7..1ff0382` → 9 files, all owned (`modules/auth/*`, `messages/*/auth.json`,
  `tests/e2e/auth/admin-users.spec.ts`). PASS.
- Code read: `decideStaff` order unauthenticated → two_factor_required → password_change_required → forbidden; single
  choke point used by `requireStaff`, `staffRoute` (via `STAFF_DENY_STATUS`) and `staffAction`. Exempt paths use
  `resolveStaff`/`getCurrentStaff` directly: change-password page + API (API still demands 2FA done), 2FA routes,
  sign-out → no loop. `changeOwnPassword` and staff reset both clear the flag. PASS.
- `npm run db:reset` + `npm run verify` → typecheck + lint clean, 35 files / 574 tests. PASS.
- e2e warm :3010 `tests/e2e/auth` 12/12. PASS.
- Own probe (scratch spec, deleted): Owner creates a temp-password user with role **owner** (holds users.manage);
  after 2FA: GET /api/admin/users, POST /users/{id}/suspend, POST /users → all 403 `password_change_required`;
  `/ar/admin/users` and `/ar/admin/users/{id}` → `/ar/staff/change-password?next=…` (rtl, Arabic notice renders);
  a second temp session signs out (200); wrong current password 401; correct change 200 → API 200 and page loads.
  NFR-SEC-003 ("none authorises on client-supplied state") now holds for this path. PASS.
- Nit (not a defect, no task): change-password PAGE renders its form for a 2FA-pending session (API refuses with 401)
  and its sign-in redirect drops the original `next`. Cosmetic; W3 shell styling pass can revisit.
- Verdict: PLA-A21 ACCEPTED. All tasks A00..A21 [x] and validated; deferrals in BACKLOG. **Lane auth DONE.**
