# auth module

Customer and back-office authentication, TOTP 2FA, deny-by-default RBAC, audit log, rate limits, password reset,
staff user management. Other modules import **only** from `@/modules/auth` (`index.ts`).

## Adding back-office surface (deny by default)

Every admin entry point must be guarded. `admin-entrypoints.int.test.ts` walks the disk and fails, naming the file,
when one is not.

**1. A permission.** Add the key to `PERMISSIONS` in `permissions.ts` (`op(...)` = Owner + Staff, `ownerOnly(...)`
= Owner only, Arabic + English description). `npm run db:seed` upserts the row and the default grants; it never
re-adds a grant an Owner removed. An unregistered key is refused for everyone, Owner included.

**2. An admin API route** — `src/app/api/admin/<area>/route.ts`:

```ts
import { staffRoute } from "@/modules/auth";
export const GET = staffRoute("orders.read", async (req, { staff, params, ip }) => Response.json(await list()));
export const POST = staffRoute<{ id: string }>("orders.write", async (req, { staff, params }) => { … });
```

No session → 401 `unauthenticated`, 2FA pending → 401 `two_factor_required`, missing permission → 403 `forbidden`.
Map business refusals with `fail()` from `./http` when inside this module.

**3. An admin page** — `src/app/[locale]/admin/<area>/page.tsx`:

```tsx
const staff = await requireStaff("orders.read", { locale, next: `/${locale}/admin/orders` });
```

Redirects to `/{locale}/staff/sign-in?next=`, `/{locale}/staff/two-factor?next=` or `/{locale}/staff/forbidden`.
**A server action** (`"use server"` file under an `admin` folder): every export is
`export const doIt = staffAction("orders.write", async (ctx, input) => …)`; it throws `AuthError` when refused.
Mutations that must be audited go through `auditedMutation(db, { id: staff.id }, { action, target }, fn)`.

## Public contract (`index.ts`)

| Export | Use |
| --- | --- |
| `requireStaff(permission, { locale, next })`, `getCurrentStaff()`, `getStaffContext()` | back-office pages (Server Components) |
| `staffRoute(permission, handler)`, `staffAction(permission, fn)`, `AuthError` | admin route handlers / server actions |
| `requireCustomer({ locale, next })`, `getCurrentCustomer()`, `customerRoute(handler)` | storefront account pages / APIs |
| `can(db, staffId, permission)`, `PERMISSIONS`, `PERMISSION_KEYS`, `isKnownPermission`, `grantsFor` | RBAC queries (deny by default) |
| `audit`, `auditedMutation`, `changed`, `listAuditEntries` | append-only audit log (secrets redacted) |
| `rateLimit`, `rateLimitAll`, `DbRateLimitStore`, `LIMITS`, `clientIp` | rate limiting (e.g. `LIMITS.assistantPerSession`) |
| `issueOtp`, `verifyOtp`, `outboxOtpDelivery`, `outboxResetLinkDelivery` | one-time codes + delivery port |
| `revokeAllSessions`, `setSubjectLocale`, `setSessionCookie`, `clearSessionCookie`, `requestMeta`, `safeNext` | session helpers |

Phone numbers: `src/lib/phone.ts` (`normalizePhone`, `formatPhoneForDisplay`, `maskPhone`; E.164, PS default).

## Sessions, TTLs, limits

- Cookies: customer `dc_session`, staff `dc_staff_session` (httpOnly, SameSite=Lax, `Secure` in production, path `/`).
  Only the SHA-256 of the token is stored; the token rotates on sign-in and on second factor.
- Staff: idle 12 h, absolute 7 d, usable only after TOTP (password-only session = `two_factor_required`, both roles).
  Customer: idle 30 d, absolute 90 d. OTP 5 min, 5 attempts. Reset link 60 min, single use.
- Rate limits (`LIMITS`): OTP 10/h per target and per IP; sign-in 10/15 min per identity, 50/15 min per IP; reset
  5/h per identity, 20/h per IP; TOTP 5/15 min per user; assistant 30/10 min per session, 60/10 min per IP.
- Passwords: argon2id (m=19456, t=2, p=1); min length from settings `auth.staff_password_min_length` (12) and
  `auth.customer_password_min_length` (8); bundled breached-password list; no identity in the password.

## Shims to rebind at the platform merge

- `otp-delivery.ts` (`SHIM(platform-merge)`): OTP codes and reset links are written to the `messages` outbox
  (`event_key` `auth.otp` / `auth.password_reset`) directly. Rebind `outboxOtpDelivery` / `outboxResetLinkDelivery`
  to the core messaging contract; the `OtpDelivery` / `ResetLinkDelivery` ports stay the same.
  Channel policy: phone → WhatsApp, SMS when `auth.otp_whatsapp_enabled` is false or WhatsApp throws; email → email.
- `ui/t.ts` (`SHIM(platform-merge)`): `authT(locale)` reads `messages/<locale>/auth.json`; swap for next-intl
  `getTranslations("auth")` / `useTranslations("auth")` — same dotted keys and `{var}` syntax.
- Staff auth pages live under `/{locale}/staff/**`; the admin layout/nav should link Users at `/{locale}/admin/users`.
