# Handover — platform/auth (W2) — leader — relay #3
Updated: 2026-09-27T03:43:57+03:00   Branch/HEAD: platform/auth @ 1ff0382
## Task
Lane W2 "auth" of Phase 0. A00..A20 were accepted by the leader; this relay did the one review defect, PLA-A21
(server-side enforcement of `must_change_password`, NFR-SEC-003). No open tasks remain in TASKS.md.
## State
- Done: PLA-A21 (commit 1ff0382). `guards.ts` `decideStaff` returns `password_change_required` after the 2FA check
  and before the permission check; `StaffDenyReason` type + `STAFF_DENY_STATUS` map (401/401/403/403) used by
  `makeStaffRoute` (403 `{ error: "password_change_required" }`); `next.ts` `requireStaff` → `/{locale}/staff/change-password?next=`,
  `staffAction` → `AuthError(reason: StaffDenyReason)`; `http.ts` STATUS gains `password_change_required: 403`;
  `StaffDenyReason` exported from `index.ts`; error copy `errors.password_change_required` in ar + en auth.json;
  README (route/page recipes, contract table, sessions) + DECISIONS.md line.
  Evidence: guards.int + walker 15/15; `npm run verify` typecheck+lint clean, 35 files / 574 tests;
  `npx playwright test tests/e2e/auth` on warm :3010 12/12.
- In progress: nothing. Tree clean. Dev server (3010) and DB (54330) stopped.
- Broken/known issues: cold-server e2e flake unchanged (CHANGE-REQUESTS, playwright.config not lane-owned).
## Next move
LANE DONE. Leader re-validated PLA-A21 (LEADER.md relay #3 review: verify 574/574, e2e 12/12, own probe of a
temp-password owner → 403/redirect until changed). Nothing left in TASKS.md. Next: the platform leader merges
platform/auth with core/shell/contracts using the merge notes below.
## Merge notes for the platform leader
- Walker has NO exemptions: W3's `admin/page.tsx` and `admin/[...rest]/page.tsx` must call
  `requireStaff("dashboard.view", { locale, next })` (catch-all: guard first, then `notFound()`).
- OTP / reset-link shim `otp-delivery.ts` (`SHIM(platform-merge)`) → core `sendMessage`; keep payload keys `code` / `url`.
- `ui/t.ts` `authT(locale)` → next-intl `getTranslations("auth")`; `next/link` → `@/lib/i18n/navigation`.
- Staff auth pages are `/{locale}/staff/*`; Users nav at `/{locale}/admin/users` (`users.manage`); wire
  `getShellViewer()` to `getCurrentStaff()` + `can()`.
- `password_change_required`: `getCurrentStaff()` still returns the user (`mustChangePassword: true`); the shell must
  treat it as signed in, not unauthenticated (guarded pages redirect to change-password themselves).
- Playwright cold-start: apply the CHANGE-REQUEST (warm-up globalSetup or `workers: 1`).
## Gotchas
- e2e passwords must not contain the user's name/email (policy `contains_identity`); the specs' emails carry the run id.
- Warm the dev server first (`npm run dev` in background, curl `/ar`), then `npx playwright test tests/e2e/auth`
  (`reuseExistingServer`). Stop it by killing the process tree listening on 3010.
- Full `npm run verify` ≈ 1–8 min. Vitest spies: take the original `console[m]`/`stream.write` BEFORE `vi.spyOn`.
- e2e specs set `x-forwarded-for` per context to dodge the per-IP limits (BACKLOG: XFF trust at deployment).
