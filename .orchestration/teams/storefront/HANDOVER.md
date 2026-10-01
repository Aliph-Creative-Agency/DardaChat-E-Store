# Handover — storefront — worker — relay #5
Updated: 2026-10-01T10:00:00+03:00   Branch/HEAD: team/storefront @ fea898a
## Task
Phase 1 STOREFRONT build (see TASKS.md). Relay #5 built checkout stages 3-4 + place order (STO-07, marked [~]: only the confirmation page is missing, that is STO-08).
## State
- Done: STO-07 (evidence in TASKS.md): `checkout/{revalidate,totals,place,seal,access,access-list}.ts`, `ui/{DeliveryStage,PaymentStage,ChangesNotice}.tsx`,
  actions `confirmDeliveryAction`, `acceptChangesAction`, `placeOrderAction` (in `actions/checkout.ts`), draft now has `payment` + `placed`, `CartLineView.vatRateBp`,
  specs `revalidate.int.test.ts`, `stage34.test.ts`, e2e `checkout-place.spec.ts`; messages `storefront.checkout.{delivery,payment,placeError,changes}` ar+en.
- In progress: nothing. All committed. Web (3002) stopped; DB (54322) was told to stop (may still be checkpointing: check `netstat -ano | grep :54322`).
- Known issues: `/ar/checkout/confirmation/<ref>` and `/ar/checkout/return?reference=<ref>` do not exist yet (STO-08). In this branch payments.initiatePayment is the Phase 0 stub (card redirect -> /checkout/mock-pay 404; real mock PSP page `/dev/psp` arrives at integration).
## Next move
1. Start env: `cd D:/Personal/Projects/DardaChat-wt/storefront/web && npm run db:start`, `npm run dev` in background (port 3002).
2. STO-08 (model: sonnet): confirmation page `checkout/confirmation/[reference]/page.tsx`: allowed when `getCurrentCustomer()` owns the order OR `placedOrderIds()` (checkout/access.ts, `dc_orders` cookie already written by placeOrderAction) contains the order id, else `notFound()`; get order via `getOrder(reference)`. Return page `checkout/return/page.tsx?reference=` reads `getPaymentSummary` + order payment state -> success / pending / failed (+ retry via `initiatePayment` on the SAME order, show `paymentErrorKey` when it exists); returnUrl we pass is `/<locale>/checkout/return?reference=DC-...`. Guest account offer (phone OTP prefilled) + `ui/{OrderSummary,AccountOffer}.tsx`, e2e `checkout.spec.ts` (outbox OTP via `/api/dev/outbox`).
3. Then STO-09..11, STO-12..14.
## Decisions (this relay)
- No `acknowledged` field in the draft: acknowledgement = `acknowledgePrices` (updates `unit_price_seen`), so the cart is the source of truth; blocking changes (unavailable/stock) must be fixed in the cart. Place button is disabled while any change exists; server re-validates on submit and redirects to /checkout (notice) when something changed.
- Cart `converted_at` is set at placement for both COD and card (spec); card retry after failure works on the placed order (nothing re-typed), so STO-08 retry must use `initiatePayment`, not the cart.
- Repeat submit after success: draft gets `placed.reference`; `readDraft()` ignores placed drafts (next purchase = new draft + new idempotency key); `placeOrderAction` with an empty cart + placed draft redirects to the confirmation.
- COD eligibility: SHIM `getCodEligibility` in `shims.ts` (same signature as payments PAY-07 export); at integration replace import with `@/modules/payments` and delete the shim section. Postal code goes into order address `line2` as "Postal code: X" / Arabic label.
## Gotchas
- drizzle snake_case splits digits: `contact_phone_e_164`, `phone_e_164`; orders state column is `status` (not fulfilment_state), `delivery` = fee.
- Old gotchas: Git Bash `MSYS_NO_PATHCONV=1`; use Write for files with backslashes (a heredoc with a stray quote broke a multi-file bash command); no sync exports from "use server" files; first server action in dev compiles slowly (`test.setTimeout(240_000)`); stop dev server by PID (`netstat -ano | grep :3002`, `taskkill //T //F //PID`); int tests need DB running (~100 s per file).
- `trackFunnel` not in this branch; `checkout.started` via `recordBusinessEvent`.
