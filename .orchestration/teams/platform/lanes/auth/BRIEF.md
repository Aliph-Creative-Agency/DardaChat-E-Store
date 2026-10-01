# Lane W2 `auth` — team PLATFORM — Phase 0

Parent brief: `ROOT/.orchestration/teams/platform/BRIEF.md` (section "W2 auth" is authoritative; this file adds the
lane's concrete decisions). Stack/layout: `ROOT/.orchestration/PLAN.md` §1–§2. How to run things: `web/README.md`
and `ROOT/.orchestration/teams/platform/lanes/core/HANDOVER.md`.

- **Working dir:** `D:/Personal/Projects/DardaChat-wt/platform-auth` (git worktree), app in `.../platform-auth/web`.
  **Branch `platform/auth`** (from `main` @ 827abc4). The platform leader merges it into `main`.
- **Ports:** Postgres **54330**, web **3010**. DB names `dardachat` / `dardachat_test` inside this worktree's own
  `web/.pgdata`. Never use 54320/3000 (main) or another lane's ports (shell 54331/3011, contracts 54332/3012).
- **SRS to read** (only what the task needs): §4.7 FR-ACC-001..006, 009..015; §6.3 NFR-SEC-003/004/007/010;
  §2.5 CON-05; §4.5 FR-ADR-004; §2.6 AS-18; §5.2 rows for Customer/User if needed.

## Paths this lane owns (stay inside them so the 3-lane merge is clean)
- `web/src/modules/auth/**` (service code, `index.ts` = PUBLIC CONTRACT, tests, `README.md`, `data/`). Also the
  auth seed (`auth/seed.ts`) — extend it (permissions, grants, auth settings). `auth/schema.ts` only if a column is
  truly missing (additive, run `db:setup` twice → "No changes detected").
- `web/src/lib/phone.ts` (+ test) — CON-05 / FR-ADR-004.
- `web/src/app/api/auth/**` (customer + staff auth route handlers), `web/src/app/api/admin/users/**`.
- Pages: `web/src/app/[locale]/(store)/{sign-in,sign-up,forgot-password,reset-password,account}/**` (minimal;
  STOREFRONT restyles later), `web/src/app/[locale]/staff/**` (back-office sign-in, 2FA, password pages — outside
  `admin/` so the admin shell layout never wraps them), `web/src/app/[locale]/admin/users/**`.
- `web/messages/ar/auth.json`, `web/messages/en/auth.json` (namespace `auth`).
- `web/tests/e2e/auth/**`.

## Do NOT touch (other lanes own them in Phase 0)
- W3 shell: `next.config.*`, `src/proxy.ts`/middleware, `src/i18n/**`, `src/app/[locale]/layout.tsx`,
  `src/app/[locale]/admin/layout.tsx` and `admin/page.tsx`, `(store)/layout.tsx`, `src/components/**`, `globals.css`,
  `messages/*/common.json`, nav registry.
- W4 contracts: every other `src/modules/<m>/index.ts`, `src/modules/core/**` (except reading its schema),
  `CONTRACTS.md`, outbox page, adapter base, scheduler, storage.
- `package.json` / lockfile: no new dependencies (W1 installed argon2, otplib, libphonenumber-js, zod, nanoid).
  If one is truly unavoidable, write it in `ROOT/.orchestration/CHANGE-REQUESTS.md` and work around it.

## Lane decisions (the leader's; recorded in ROOT/.orchestration/DECISIONS.md where cross-team)
1. **Contract:** `@/modules/auth` (`src/modules/auth/index.ts`) exports `getCurrentCustomer`, `getCurrentStaff`,
   `requireCustomer`, `requireStaff(permission)`, `staffRoute(permission, handler)`, `staffAction(permission, fn)`,
   `can`, `PERMISSIONS`/`Permission`, `audit`, `rateLimit`/`LIMITS`/`clientIp`, `issueOtp`/`verifyOtp` (used by
   insights for FR-DAT-009 data-request codes), `setSubjectLocale` (for W3's UI-003), `revokeAllSessions`.
   W4 must not create `modules/auth/index.ts`.
2. **Enforcement is server-side in every page/handler/action**, not in middleware (NFR-SEC-003; also keeps
   `proxy.ts` W3-only). Admin pages call `requireStaff(permission)`; admin route handlers are `staffRoute(...)`;
   admin server actions are `staffAction(...)`. A walker test fails the build on any admin entry point without one.
3. **Deny by default (FR-ACC-010):** permissions are a typed code registry pre-populated for every module (so Phase 1
   teams don't edit auth); the Owner gets an explicit grant per key (no wildcard); an unknown/ungranted key is denied
   for every role. The seed syncs registry → `permissions`/`role_permissions` (insert-if-missing); runtime checks
   read grants from the DB.
4. **Sessions:** one `sessions` table, two cookies (`dc_session` customer, `dc_staff_session` staff), httpOnly,
   SameSite=Lax, `Secure` when APP_URL is https, path `/`. Only SHA-256 of the token is stored. Staff: 12 h idle
   (NFR-SEC-010), 7 d absolute; customer: 30 d idle, 90 d absolute. Rotate on sign-in and on 2FA completion; a staff
   session without `second_factor_at` passes only the 2FA pages (FR-ACC-012). Suspended/revoked/disabled/erased
   subjects fail validation on the next request (FR-ACC-013/014).
5. **OTP delivery:** auth defines an `OtpDelivery` port. Lane shim = write the message into the `messages` outbox
   table (channel whatsapp, SMS when WhatsApp is disabled or fails — FR-ACC-003) so W4's `/dev/outbox` shows it.
   At merge, the leader rebinds the port to W4's messaging contract. Code format 6 digits, 5 min, single use, 5 tries.
6. **i18n shim:** until W3's next-intl wiring lands, auth pages read `messages/<locale>/auth.json` through a tiny
   local helper `src/modules/auth/ui/t.ts`; at merge it is swapped for `getTranslations("auth")`.
7. **Customer identity columns** (`customers.email`, `phone_e_164`, `password_hash`, `*_verified_at`,
   `last_login_at`, `status`) are written by auth; everything else on `customers` is ENGAGEMENT's.
8. TOTP enrolment shows the base32 key + `otpauth://` link; no QR (no QR dependency installed → BACKLOG).
