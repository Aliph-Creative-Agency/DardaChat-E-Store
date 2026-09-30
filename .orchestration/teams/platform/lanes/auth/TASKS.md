# Tasks — platform / lane auth (W2) — Phase 0

Worktree `D:/Personal/Projects/DardaChat-wt/platform-auth`, branch `platform/auth`, app in `web/`. DB 54330, web 3010.
All paths are under `web/` unless stated. Every task leaves `npm run verify` (typecheck + lint + vitest) green and is
committed on `platform/auth`. Mark `[x]` done / `[~]` partial / `[!]` blocked and paste one line of evidence
(command → result) under the task. Stay inside the owned paths in `BRIEF.md`. Use context7 for otplib v13,
@node-rs/argon2, libphonenumber-js and Next 16 (`cookies()`/`headers()` are async; route handler signatures).
Testing pattern: keep pure logic free of `next/headers` (pass a `now`, a cookie jar and request meta in), then wrap it
thinly for Next — so vitest covers the logic and Playwright covers the wiring.

## A. Environment

- [x] **PLA-A00 Worktree + lane environment** — (setup)
  - Worktree on `platform/auth` from main @ 827abc4; `npm ci`; `.env.local` from `.env.example` with 54330/3010
    (+ own random `SESSION_SECRET`); `db:start`, `db:setup`, `db:seed`; `npm run verify`.
  - **Accept:** `npm run verify` green on the untouched main code at the lane ports.
  - Evidence: npm ci exit 0; db:start/setup/seed ok on 54330; `npm run verify` → 16 files / 415 tests pass (leader, relay #0).

## B. Pure building blocks (unit-tested, no Next wiring)

- [x] **PLA-A01 Phone number library** — CON-05, FR-ADR-004 (lib part)
  - `src/lib/phone.ts` on libphonenumber-js (`/max` metadata if needed): `normalizePhone(input, defaultRegion = "PS")`
    → `{ ok: true, e164, region } | { ok: false, reason: "empty"|"invalid"|"too_short"|"too_long" }`; accepts any
    international format (`+`, `00`, spaces, dashes, brackets), Arabic-Indic and Persian digits, local PS numbers
    (`059…`, `056…`); `formatPhoneForDisplay(e164)` → national format in the number's own region style
    (e.g. `059-123-4567` pattern for PS, `+44 20 …` international for foreign), always Latin digits, wrapped
    for bidi only by callers; `maskPhone(e164)` (`+970 59•••4567`) for UIs and logs.
  - `src/lib/phone.test.ts`: PS (+970 59/56), IL (+972 5x), JO (+962 7x), EG, SA, AE, US, UK, Arabic-Indic input,
    `00970…`, invalid/short/letters.
  - **Accept:** `npx vitest run src/lib/phone.test.ts` green (≥ 15 cases); `npm run verify` green.
  - Evidence: npx vitest run src/lib/phone.test.ts → 32 passed (PS/IL/JO/EG/SA/AE/US/GB, Arabic-Indic, Persian, 00970, invalid/short/long); commit 7b9020b

- [x] **PLA-A02 Auth config + crypto primitives** — FR-ACC-005, NFR-SEC-007
  - `src/modules/auth/config.ts`: reads `SESSION_SECRET` (≥ 32 chars; in production refuse the `.env.example`
    placeholder), `APP_URL`, cookie `secure` flag, TTL constants (staff idle 12 h / absolute 7 d; customer idle 30 d /
    absolute 90 d; OTP 5 min; reset token 60 min).
  - `src/modules/auth/crypto.ts`: `randomToken()` (32 bytes base64url), `hashToken()` (SHA-256 hex),
    `safeEqual()`, `generateOtpCode()` (6 digits via `crypto.randomInt`), `hashOtp(code, targetKey)` (HMAC-SHA256
    keyed from SESSION_SECRET), `encryptSecret`/`decryptSecret` (AES-256-GCM, key = HKDF(SESSION_SECRET, "totp")),
    `hashPassword`/`verifyPassword`/`needsRehash` (argon2id, OWASP params m=19456 KiB, t=2, p=1).
  - Tests: round trips, tamper detection on GCM, hash is `$argon2id$`, wrong password false, token uniqueness.
  - **Accept:** `npx vitest run src/modules/auth` green; `npm run verify` green.
  - Evidence: npx vitest run src/modules/auth → 13 passed (GCM tamper, argon2id m=19456,t=2,p=1, token uniqueness); commit d590a2d

- [x] **PLA-A03 Password policy + bundled breached list** — FR-ACC-015 (and customer passwords)
  - `src/modules/auth/data/common-passwords.txt`: ≥ 1,000 well-known breached/common passwords (lower-case, one per
    line) written from knowledge — no downloads. Loaded once into a `Set`.
  - `src/modules/auth/password-policy.ts`: `checkPassword(pw, { kind: "staff"|"customer", minLength, identity: [email,
    name] })` → list of reason codes `too_short | too_long (>256) | breached | contains_identity`; comparison
    case-insensitive and also after stripping trailing digits/symbols (`Password123!` → breached).
    Min lengths from settings keys `auth.staff_password_min_length` (default 12) and
    `auth.customer_password_min_length` (default 8) via `getPasswordMinLength(db, kind)`.
  - Extend `src/modules/auth/seed.ts` to insert those two settings (insert-if-missing).
  - Tests: below minimum refused, breached refused (`password`, `123456`, `Qwerty123`), good passphrase accepted,
    configurable minimum honoured (int test changes the setting).
  - **Accept:** targeted vitest green; `npm run db:seed` twice ok; `npm run verify` green.
  - Evidence: password-policy.test 13 passed (7,831-entry list; Password123!/Qwerty123 breached) + seed.int setting honoured; db:seed ×2 ok; verify 21 files/481 tests; commit 1eb555e

- [x] **PLA-A04 Permission registry + role grants (deny by default)** — FR-ACC-009, FR-ACC-010
  - `src/modules/auth/permissions.ts`: `PERMISSIONS` const registry pre-populated for EVERY module so Phase 1 teams
    never edit auth — each entry `{ key, owner: true, staff: boolean, descAr, descEn }`, `type Permission`.
    Minimum keys: `dashboard.view`; `catalog.read|write`; `inventory.read|write`, `inventory.cost.read` (owner only,
    FR-INV unit cost), `purchasing.read|write`; `orders.read|write`, `orders.close_lost` (owner), `returns.write`;
    `payments.read`, `payments.refund`, `payments.cod_writeoff` (owner), `invoices.read`, `einvoice.manage` (owner);
    `customers.read|write`, `privacy.manage` (owner, FR-DAT-009 manual checks); `messaging.templates.write`,
    `campaigns.write`, `campaigns.send` (owner); `reports.operational`, `reports.financial` (owner);
    `assistant.manage`; `journey.manage`; `content.write`; `settings.read`, `settings.write` (owner);
    `users.manage` (owner), `audit.read` (owner). Staff = operational read/write only.
  - `grantsFor(roleKey)`, `isKnownPermission(key)`. Extend auth seed: upsert-if-missing every permission row and the
    default role grants (never removes a grant an Owner changed).
  - Tests: owner has every key explicitly (no wildcard), staff lacks every owner-only key, unknown key → denied for
    both roles; int test: seed produces permission/grant rows matching the registry, seed twice idempotent.
  - **Accept:** targeted vitest (unit + int) green; `npm run verify` green.
  - Evidence: permissions.test 5 + seed.int 3 passed (registry = rows, owner explicit, staff lacks 10 owner-only keys, reseed idempotent, removed grant not re-added); npm run verify → 481 passed; commit 83c6d83

## C. Shared services: rate limiting + audit

- [x] **PLA-A05 Rate limiter** — FR-ACC-004, NFR-SEC-004
  - `src/modules/auth/rate-limit.ts`: `RateLimitStore` interface (`hit(key, windowMs, now) → count in window`);
    DB store on `rate_limit_hits` (insert + count, prune rows older than the largest window opportunistically) and a
    memory store for unit tests. `rateLimit(store, { key, limit, windowMs }, now?) → { ok, remaining, retryAfterMs }`.
    `LIMITS` table: OTP per phone/email 10/h and per IP 10/h (11th refused — FR-ACC-004), sign-in per identity
    10/15 min and per IP 50/15 min, password reset per identity 5/h and per IP 20/h, TOTP challenge per user
    5/15 min, assistant per session 30/10 min and per IP 60/10 min (exported for ASSISTANT).
    `clientIp(headers)` (first `x-forwarded-for` hop, else `x-real-ip`, else `"unknown"`); keys never contain raw
    secrets.
  - Tests: 10 pass / 11th refused within the hour, window slides (fake `now`), per-IP limit across different
    phones, DB store int test.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: rate-limit.test 6 + rate-limit.int 2 passed (11th OTP refused, window slides, per-IP across numbers, 15 concurrent → 10 allowed); commit 022b372

- [x] **PLA-A06 Audit helper** — FR-ACC-011, FR-ACC-014 (retention of history)
  - `src/modules/auth/audit.ts`: `audit(dbOrTx, { actor, action, target: { type, id }, before?, after?, ip? })` →
    inserts `audit_entries`; recursively redacts keys matching /password|token|secret|code|hash|otp/i to
    `"[redacted]"`; diff helper `changed(before, after)` keeps only changed fields. `listAuditEntries(db, { targetType?,
    targetId?, actorId?, limit, before? })` for viewers. `auditedMutation(db, actor, meta, fn)` = `withActor`
    (src/db/guards.ts) + `audit` in one transaction so the row journal and the action entry agree.
  - Int tests: entry has actor/action/target/before/after/timestamp; redaction; entries remain after the actor is
    revoked; append-only (UPDATE refused, DCA01).
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: audit.int 6 passed (fields+timestamp, recursive redaction, changed(), same-tx rollback, survives revoke, UPDATE → DCA01)

## D. Sessions and guards

- [x] **PLA-A07 Session service** — NFR-SEC-010, FR-ACC-012/013/014, NFR-SCL-003
  - `src/modules/auth/session.ts` (pure, takes `db`, `now`): `createSession(subject, meta)` → `{ token, session }`,
    `validateSession(token, subjectType, now)` (exists, not revoked, not past absolute expiry, idle ≤ limit, subject
    still active: staff `active`, customer `active`), touches `last_seen_at` at most once a minute,
    `rotateSession(old)` (new token, old revoked, `rotated_from`), `markSecondFactor(session)` (rotates),
    `revokeSession`, `revokeAllSessions(subjectType, subjectId)`, `purgeExpiredSessions(now)`.
    Cookie descriptors (`dc_session`, `dc_staff_session`; httpOnly, SameSite=Lax, Secure per config, path `/`).
  - Int tests with fake clock: staff idle 11h59m ok / 12h01m rejected; absolute expiry; rotation invalidates old
    token; suspended staff and disabled customer rejected on next validate; token never stored in plaintext.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: session.int 10 passed (hash only, 11h59 ok/12h01 idle rejected, 7 d absolute, rotation, suspended/disabled rejected, revoke-all, purge); commit d4ca1f3

- [x] **PLA-A08 Guards + public contract** — FR-ACC-009/010/012, NFR-SEC-003, UI-003 support
  - `src/modules/auth/guards.ts` (logic) + `src/modules/auth/next.ts` (thin `cookies()`/`headers()` adapter,
    `server-only`): `getCurrentCustomer()`, `getCurrentStaff()` (null unless 2FA done), `requireCustomer()`
    (redirect `/{locale}/sign-in?next=`), `requireStaff(permission)` (no session → `/{locale}/staff/sign-in`,
    2FA pending → `/{locale}/staff/two-factor`, missing permission → render/throw 403 without editing next.config),
    `staffRoute(permission, handler)` (401/403 JSON; attaches `permission` metadata to the returned function for the
    walker), `staffAction(permission, fn)`, `customerRoute(handler)`, `can(db, staffId, permission)` (DB grants,
    unknown key false). `setSubjectLocale(subject, locale)`.
  - `src/modules/auth/index.ts` exports the contract listed in BRIEF decision 1 (types included).
  - Append the contract summary to `ROOT/.orchestration/DECISIONS.md` (one line) so W3/W4 and Phase 1 code to it.
  - Tests: guard logic with fake cookie jar: no cookie, customer cookie on staff guard, staff without 2FA, staff
    without permission, owner with permission, unknown permission denied for owner.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: guards.int 9 passed (no cookie, customer cookie on staff guard, 2FA pending owner, staff forbidden, owner ok, unknown key denied for owner, DB grant removal, staffRoute 401/401/403/200 + meta); tsc+eslint clean; commit b5dcf4e

## E. Customer authentication

- [x] **PLA-A09 Customer email + password** — FR-ACC-001, FR-ACC-005, NFR-SEC-004
  - `src/modules/auth/customer-auth.ts`: `registerCustomer({ email, password, name?, locale }, meta)` (email
    lower-cased, zod-validated, policy `customer`, duplicate → generic `email_taken`), `signInCustomer(email,
    password, meta)` (rate limits per identity + IP, generic `invalid_credentials`, dummy argon2 verify when the email
    is unknown, rehash if `needsRehash`, `last_login_at`), `signOut(token)`. Only identity columns on `customers`.
  - Int tests: register → session valid; wrong password → generic error; 11th attempt → `rate_limited`; stored hash
    is argon2id; console spy sees no password.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: customer-auth.int 7 passed (register→session, argon2id, email_taken any case, breached refused, generic invalid_credentials, disabled refused, 11th → rate_limited, console spy clean); verify 27 files/521 tests

- [x] **PLA-A10 OTP service + delivery port (WhatsApp → SMS)** — FR-ACC-003, FR-ACC-004, AS-18, NFR-SEC-007
  - `src/modules/auth/otp.ts`: `issueOtp({ phoneE164? | email?, purpose, locale, ip }, deps)` → rate limits (10/h per
    target, 10/h per IP), invalidates older unconsumed codes for target+purpose, stores HMAC only, expires in 5 min,
    delivers; `verifyOtp({ target, purpose, code })` → max 5 attempts, single use, expiry, constant-time compare.
  - `src/modules/auth/otp-delivery.ts`: `OtpDelivery` port `send({ channel, to, locale, code, purpose })`; policy:
    phone → WhatsApp first, SMS if WhatsApp disabled (setting `auth.otp_whatsapp_enabled`, default true, seeded) or if
    the WhatsApp send throws; email → email. Lane SHIM implementation inserts into the `messages` outbox
    (`event_key` `auth.otp`, payload `{ code, purpose }`, bilingual text) — header comment
    `// SHIM(platform-merge): rebind to the core messaging contract`. Record `otp_codes.channel`.
  - Int tests: code expires at 5:00 (fake clock), second use fails, wrong code ×5 locks, 11th request per number
    refused, 11th per IP across numbers refused, WhatsApp disabled → `sms` message, WhatsApp throwing → `sms`.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: otp.int 11 passed (HMAC only, 4:59 ok/5:00 expired, single use, 5 wrong → locked, supersede, 11th per number + per IP refused, WA disabled → sms, WA throws → sms, email); verify 28 files/532 tests

- [x] **PLA-A11 Customer phone + OTP sign-in** — FR-ACC-002, CON-05
  - `requestPhoneSignIn(phoneInput, meta)` (normalise via `src/lib/phone.ts`; always the same response shape),
    `verifyPhoneSignIn(phoneInput, code, meta)` → find or create the customer by `phone_e_164`
    (`phone_verified_at`, no password), `disabled`/`erased` refused, session created.
  - Int test: brand-new number signs in with no password set; `+970 59…`, `0097059…` and `059…` hit the same account.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: phone-sign-in.int 4 passed (new number → passwordless account + verified phone; +970/00970/059/Arabic-Indic → 1 account; disabled+erased → account_disabled); verify 29 files/536 tests

- [x] **PLA-A12 Password reset (customer + staff)** — FR-ACC-006, FR-ACC-015, NFR-SEC-004
  - `src/modules/auth/password-reset.ts`: `requestPasswordReset(email, subjectType, meta)` (always same response;
    rate limits; 32-byte token, only hash stored, 60 min, older tokens for the subject invalidated; email via the
    delivery port with link `${APP_URL}/{locale}/reset-password?token=` (customer) or `/{locale}/staff/reset-password`
    (staff)); `resetPassword(token, newPassword)` (policy by kind; single use; expired/used refused; revokes all
    sessions of the subject; staff: `must_change_password=false`, audit `auth.password_reset`).
  - Int tests: token works once, used token refused, expired refused, breached password refused, sessions revoked.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: password-reset.int 7 passed (unknown email same answer, hash only, once, used/expired/superseded refused, breached refused w/o consuming, sessions revoked, staff must_change cleared + audit, 6th → rate_limited); verify 30 files/543 tests

- [x] **PLA-A13 Customer auth routes + minimal pages + messages** — FR-ACC-001/002/006 (UI), NFR-LOC
  - Route handlers (zod input, JSON out, 429 + `Retry-After` on rate limit, cookie set/cleared):
    `src/app/api/auth/customer/{register,sign-in,sign-out,otp/request,otp/verify,password/forgot,password/reset}/route.ts`.
    (Or server actions in the pages — pick one, record it; route handlers preferred for the e2e and assistant.)
  - Minimal pages `src/app/[locale]/(store)/{sign-in,sign-up,forgot-password,reset-password,account}/page.tsx`
    (email/password tab + phone/OTP tab; account shows who is signed in + sign out). Plain accessible forms,
    logical CSS only. `messages/{ar,en}/auth.json` (real Arabic) via the `src/modules/auth/ui/t.ts` shim.
  - `tests/e2e/auth/customer.spec.ts`: register → account → sign out → sign in; phone OTP sign-in reading the code
    from the `messages` outbox via a DB helper in the spec (never from logs).
  - **Accept:** `npm run verify` green; `npx playwright test tests/e2e/auth/customer.spec.ts` green on :3010; `/ar`
    pages render rtl with Arabic copy, `/en` ltr.
  - Evidence: chose route handlers (JSON, 429+Retry-After) + client forms in `auth/ui/forms.tsx`; `npx playwright test tests/e2e/auth/customer.spec.ts` → 6 passed on :3010 (ar rtl/en ltr, register→account→sign out→sign in, phone OTP from outbox, forgot→reset link, 429); verify 31 files/546 tests

## F. Back-office authentication and user management

- [x] **PLA-A14 Staff sign-in + TOTP 2FA service** — FR-ACC-012, FR-ACC-005, NFR-SEC-004
  - `src/modules/auth/staff-auth.ts`: `signInStaff(email, password, meta)` (active only; rate limits; generic errors)
    → session with `second_factor_at` null; `beginTotpEnrolment(userId)` (otplib v13 secret, stored encrypted,
    unconfirmed; returns `otpauth://` URI + grouped base32 key); `confirmTotpEnrolment(session, code)` → confirmed,
    10 recovery codes (returned once, argon2/sha256-hashed), session rotated with second factor;
    `challengeTotp(session, codeOrRecovery)` (±1 step window, rate limit 5/15 min, recovery code single use,
    reject reuse of the last accepted time-step via a `rate_limit_hits` key or equivalent); `changeOwnPassword`
    (policy `staff`; clears `must_change_password`). Audit `auth.staff_sign_in`, `auth.2fa_enrolled`.
  - Int tests: password-only staff session is rejected by `requireStaff` logic for BOTH roles; enrol + confirm;
    challenge ok / wrong / replay / recovery code once; suspended user cannot sign in.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: staff-auth.int 11 passed (password-only session → two_factor_required for owner+staff, suspended refused, enrol+confirm → 10 recovery codes + rotation, re-enrol from pending refused, ok/wrong/replay/±1/2-steps-old, recovery once, 6th → rate_limited, changeOwnPassword); verify 32 files/557 tests

- [x] **PLA-A15 Staff auth pages + routes** — FR-ACC-012 (UI), NFR-SEC-010
  - Routes `src/app/api/auth/staff/{sign-in,sign-out,two-factor/enrol,two-factor/confirm,two-factor/challenge,
    password/change,password/forgot,password/reset}/route.ts`. Pages `src/app/[locale]/staff/{sign-in,two-factor,
    two-factor/setup,change-password,forgot-password,reset-password}/page.tsx` (setup shows key + otpauth link +
    recovery codes once). After 2FA: redirect to `next` or `/{locale}/admin` (W3 owns that page; in this lane go to
    `/{locale}/admin/users`). Strings in `auth.json`.
  - `tests/e2e/auth/staff.spec.ts`: seeded owner (password from `.env.local`) signs in → forced enrolment (code from
    otplib in the spec) → recovery codes shown → lands on admin; sign out; sign in again → challenge required;
    a password-only session cookie gets 401 from an admin API.
  - **Accept:** `npm run verify` green; staff e2e green on :3010.
  - Evidence: `npx playwright test tests/e2e/auth` → 10 passed on :3010 (staff 4: ar rtl, admin→sign-in?next, sign-in→forced enrol→10 recovery codes→/en/admin/users→sign out→challenge (wrong then next-step code), pending cookie → 401 two_factor_required); verify 32 files/557 tests. Minimal GET /api/admin/users + admin/users page added here (A17 extends)

- [x] **PLA-A16 Back-office user management service** — FR-ACC-013, FR-ACC-014, FR-ACC-011, FR-ACC-015
  - `src/modules/auth/staff-users.ts`: `listStaffUsers`, `createStaffUser({ email, name, role, password? })`
    (policy; generated temp password returned once when omitted; `must_change_password=true`), `suspendStaffUser`,
    `reinstateStaffUser` (not for revoked), `revokeStaffUser` (permanent; revokes all sessions immediately; deletes
    TOTP secret; keeps row + audit), `changeStaffRole`, `resetStaffTwoFactor`. Guards: no action on self, never
    leave zero active owners. Each mutation via `auditedMutation` with before/after.
  - Int tests: create/suspend/reinstate/revoke each take effect on the next `validateSession`; revoked cannot be
    reinstated; last-owner guard; audit entries (actor, action, target, before, after, timestamp) remain queryable
    after revoke.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: staff-users.int 6 passed (temp pw once + must change + audit w/o secret, weak/dupe/unknown role/empty name refused, suspend/reinstate/revoke effective on next validateSession, revoked not reinstatable, TOTP deleted, self_action, last_owner ×3, refusals unaudited, role change → can(), reset 2FA → enrol); verify 33 files/563 tests

- [x] **PLA-A17 Admin users UI + API** — FR-ACC-013/014 (UI), FR-ACC-009
  - `src/app/api/admin/users/route.ts` (GET list, POST create) and `.../[id]/{suspend,reinstate,revoke,role,
    reset-2fa}/route.ts`, all `staffRoute("users.manage", …)`. Pages `src/app/[locale]/admin/users/page.tsx` (table,
    status badges, create form, action buttons with confirm for revoke) and `admin/users/[id]/page.tsx` (details +
    that user's audit history via `listAuditEntries`), both `requireStaff("users.manage")`. Plain markup; W3's
    admin layout wraps it after the merge.
  - `tests/e2e/auth/admin-users.spec.ts`: owner creates a staff user; the staff session hitting
    `/api/admin/users` directly gets 403 (FR-ACC-009); owner suspends a signed-in staff user → that user's next
    request is rejected; revoke → rejected and audit history still listed.
  - **Accept:** `npm run verify` green; admin-users e2e green on :3010.
  - Evidence: `npx playwright test tests/e2e/auth` → 12 passed on :3010 (admin-users 2: create → temp pw once, staff 403 API+page→/staff/forbidden, suspend → 401 + sign-in redirect, reinstate, revoke → 401, self_action 409, audit history kept, /ar rtl); verify 33 files/563 tests. Action routes share `admin-users-route.ts` factory; staff.create audit now targets the new user id

## R. Leader review fixes (relay #2 review) — DO THESE FIRST

- [x] **PLA-A21 Enforce `must_change_password` server-side** — NFR-SEC-003, FR-ACC-015, FR-ACC-013
  - Found in review: a user created by the Owner with a generated temp password (`must_change_password=true`) is only
    sent to the change-password page by a CLIENT redirect (`staff-forms.tsx` `afterSecondFactor`); after 2FA they can
    use every admin page/API they are granted with the Owner-known temp password (admin-users.spec even does this).
    NFR-SEC-003 forbids access decisions that rely on client-side state.
  - `guards.ts` `decideStaff`: after the 2FA check and BEFORE the permission check, a 2FA-complete session whose user
    has `mustChangePassword` → `{ ok: false, reason: "password_change_required", ctx }`. `next.ts`: `requireStaff` →
    `redirect(/{locale}/staff/change-password?next=…)`; `staffAction` → `AuthError("password_change_required")`;
    `makeStaffRoute` → 403 `{ error: "password_change_required" }`. `getCurrentStaff()` still returns the user
    (with `mustChangePassword: true`) so the shell can render. Change-password page + `POST
    /api/auth/staff/password/change` + sign-out + 2FA pages must keep working for such a session (check what guard
    the change-password PAGE uses; it must not loop). Add the status mapping in `http.ts`.
  - Tests: `guards.int` — temp-password staff with 2FA done → `password_change_required` for decideStaff /
    staffRoute (403 + error key) ; after `changeOwnPassword` → allowed/forbidden per grants. Walker stays green.
    `admin-users.spec.ts`: after the created staff user enrols, `GET /api/admin/users` → 403
    `password_change_required` and `/en/admin/users` → `/en/staff/change-password?next=…`; change the password via the
    page, then the API → 403 `forbidden` and the page → `/en/staff/forbidden` (the existing FR-ACC-009 assertions).
  - README contract table + one DECISIONS.md line (new guard reason, so W3/Phase 1 know the redirect).
  - **Accept:** targeted vitest + `npm run verify` green; `npx playwright test tests/e2e/auth` green on :3010.
  - Evidence: `vitest guards.int + admin-entrypoints.int` 2 files/15 tests pass; `npm run verify` typecheck+lint clean, 35 files/574 tests pass; `npx playwright test tests/e2e/auth` on :3010 (warm) 12/12 pass (admin-users: temp-pw user → API 403 `password_change_required`, page → change-password?next=, after change → 403 `forbidden` + /staff/forbidden).

## G. Deny-by-default proof, hygiene, hand-off

- [x] **PLA-A18 Admin entry-point walker test** — FR-ACC-010, FR-ACC-009, NFR-SEC-003
  - `src/modules/auth/admin-entrypoints.int.test.ts`: (1) glob every `src/app/api/admin/**/route.ts`, import it, and
    for each exported HTTP method assert it carries `staffRoute` metadata with a registered permission; invoke it with
    no cookie → 401, with a Staff session lacking the permission → 403, with an Owner session for owner-only →
    not 401/403. (2) Static scan every `src/app/[locale]/admin/**/page.tsx` for a `requireStaff(` call, and every
    `"use server"` file under `admin/` so each export is `staffAction(`. (3) Fixture: a handler built with an
    unregistered permission returns 403 for owner and staff. Failures list the offending files.
  - `src/modules/auth/README.md`: how to add an admin page/route/action + permission (3 short recipes).
  - **Accept:** the walker test green and demonstrably red when a temp unguarded `route.ts` is added (note it in
    evidence, then remove it); `npm run verify` green.
  - Evidence: admin-entrypoints.int 5 passed (6 route files, 401/403/owner-through); with temp `api/admin/zz-temp/route.ts` + unguarded page + `"use server"` export → 3 failed naming each file, temps removed; README recipes; verify 34 files/568 tests

- [x] **PLA-A19 Log hygiene + secret safety** — NFR-SEC-007, FR-ACC-005
  - `src/modules/auth/log-hygiene.int.test.ts`: spy `console.*` + `process.stdout/stderr.write` through register,
    sign-in, OTP issue/verify, reset, staff enrol/challenge; assert none of the password, OTP, reset token, session
    token, TOTP secret appears. Static test: no `console.` call in `src/modules/auth/**` and `src/app/api/auth/**`
    outside tests. Confirm `.env.local` is gitignored and `git grep` finds no real secret.
  - **Accept:** targeted vitest green; `npm run verify` green.
  - Evidence: log-hygiene.int 5 passed (console.* + stdout/stderr captured through register/sign-in/phone OTP/reset/staff enrol/challenge/recovery, >=15 secrets, canary proves capture; no console in auth/api-auth/api-admin; .env.local check-ignored; no .env.local secret value in `git grep`); verify 35 files/573 tests; commit 01c11a7

- [x] **PLA-A20 Lane close-out** — all of the above
  - Final `index.ts` contract review; `src/modules/auth/README.md` complete (contract table, cookie names, TTLs,
    limits, OTP shim + how to rebind); DECISIONS.md lines; BACKLOG lines (QR code, HIBP/k-anonymity breached check,
    WebAuthn, CAPTCHA, device/session list UI, email verification). Merge notes for the platform leader in HANDOVER
    (the OTP/email shim rebinding, `t.ts` → next-intl swap, where admin layout/nav should link Users).
  - Full lane run: `npm run db:reset`, `npm run verify`, `npm run test:e2e` (all specs), dev server :3010 pages
    `/ar/sign-in`, `/en/sign-in`, `/ar/staff/sign-in` render.
  - **Accept:** all green, evidence pasted; tree clean on `platform/auth`; servers stopped.
  - Evidence: `npm run db:reset` ok; `npm run verify` → 35 files/573 tests; `npm run test:e2e` → 15 passed; dev :3010 `/ar/sign-in` 200 rtl, `/en/sign-in` 200 ltr, `/ar/staff/sign-in` 200 rtl; README (recipes, contract table, cookies, TTLs, limits, shims); DECISIONS line 2026-09-27; BACKLOG lines already present; merge notes in HANDOVER
