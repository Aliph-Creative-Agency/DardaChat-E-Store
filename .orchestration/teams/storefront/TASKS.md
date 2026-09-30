# Tasks — team STOREFRONT (Phase 1)

Worktree `D:/Personal/Projects/DardaChat-wt/storefront` (branch `team/storefront`), run everything from `web/`.
DB 54322, web 3002. Owned: `app/[locale]/(store)/**` except `pages/**`, `journey/**`, `unsubscribe/**`,
`account/privacy/**`; `modules/storefront/**`, `modules/cart/**` (unused, see D1), `messages/*/storefront.json`,
`tests/e2e/storefront/**`. NOT owned: `(store)/layout.tsx` (PLATFORM), `app/api/**`, `lib/**`, `components/**`,
`modules/auth/**`, `package.json`.

Standing decisions (leader, relay #0 — details in LEADER.md):
- D1 Cart code lives in `modules/storefront/cart/*` (the `carts`/`cart_lines` tables are already in
  `modules/storefront/schema.ts`); no separate `modules/cart`. Mutations are **server actions** in
  `modules/storefront/actions/*.ts` (we own no `app/api/**`).
- D2 All strings in `messages/<ar|en>/storefront.json` under sub-keys (`home`, `listing`, `product`, `cart`, `checkout`,
  `order`, `account`, `authUi`, …). `cart.json` is NOT a loaded namespace (lib/i18n/namespaces.ts), so do not create it.
- D3 Checkout = ONE screen (`/checkout`) with the four stages as an ordered stepper (contact → address → delivery →
  payment), each stage validated server-side before the next opens. Screens product→confirmation: product, cart,
  checkout, (provider page for card), confirmation = ≤ 5 (NFR-USA-006).
- D4 Cross-module gaps use `SHIM(storefront)` local adapters in `modules/storefront/shims.ts` + a CHANGE-REQUESTS entry:
  catalog `listCollections`/`getCollection`, engagement `updateCustomerProfile`/`deleteAddress`, layout `cartSlot`.
- D5 Cart merge on sign-in is lazy: the first cart read with a customer session AND an anon cart cookie merges
  (sum qty per variant, capped) and clears the cookie — no change to auth's API routes.
- D6 Every task: `npx tsc --noEmit` clean, `npx eslint <touched>` clean, `npm run test:unit` green (messages parity,
  no-literals, logical-classes) + its own acceptance check. UI tasks: load the page on :3002 in ar AND en at 375 px.

Legend: `[ ]` todo, `[~]` partial (note), `[x]` done (evidence line), `[!]` blocked (reason).

## Setup
- [x] STO-00 Environment — worktree, `npm ci`, `.env.local` (PG 54322 / web 3002), `db:reset`, typecheck + unit tests.
  Evidence: see HANDOVER.md "Gotchas" (leader relay #0).

## Cart core
## Brand update (2026-09-29, approved by Obaida) — do these first
- [x] **STO-B1 Adopt DESIGN.md** (model: sonnet) — Read ../../DESIGN.md (ROOT/.orchestration/DESIGN.md) first. If tag brand-v1 exists and is not in your branch, `git merge brand-v1` before starting (PROTOCOL §1 step 4b). Every page you build from here uses the Dardachat palette/typography/motifs (DESIGN.md §2–§4); home hero in the logo-banner style (blue + pink brush strokes) with links to Workshops/Sessions/Game nights pages (owned by CATALOG under /pages); product cards show group + age + box contents. Re-skin anything already built. Check: screenshots of built pages at 375/1440 in ar+en match the palette; no red small text (contrast rule).
  Relay #1: brand-v1 merged into team/storefront (b99db00); cart page uses brand tokens (blue/cream, red cta button, sky VAT panel). Relay #2: home hero (blue band + pink BrushStroke, links to /pages/workshops|sessions|game-nights) and ProductCard (group+age+box contents) done in STO-03; screenshots 375/1440 ar+en checked for home and /products. Relay #3: product page re-checked at 375/1440 ar+en (screenshots, palette ok, no red small text) -> done.

- [x] STO-01 Cart service + persistence. SRS FR-CRT-001, FR-CRT-002, FR-CRT-003 (logic).
  Files: `modules/storefront/schema.ts` (add `cart_lines.unit_price_seen integer` agorot, nullable), `modules/storefront/cart/{service,token,types}.ts`,
  `modules/storefront/jobs.ts` (job `storefront.purge_anon_carts`: delete anon carts past `expires_at`, idempotent),
  `modules/storefront/cart/cart.int.test.ts`.
  Build: anon token (random 32 B, cookie `dc_cart`, httpOnly, SameSite=Lax, 30-day max-age from setting
  `storefront.cart_ttl_days`; DB stores SHA-256 only); `getCart`, `addToCart(variantId, qty)` (variant active + product
  published else `invalid_input`; qty 1..20 per line), `setLineQty`, `removeLine`, `mergeAnonIntoCustomer` (no duplicate
  lines, qty summed & capped, anon cart `merged_into_id` set), expiry sliding on write; `CartView` = lines with names
  (catalog `getVariants`), image, unit price, availability (inventory `getAvailability`), `priceChanged` flag, and totals
  from payments `computeTotals` (delivery 0 in cart). `cart.item_added` business event.
  Accept: `npx vitest run --project integration src/modules/storefront` green covering add/merge-no-dup/expiry/
  qty cap/unpublished rejection; `npx drizzle-kit push --force` applies the column.
  Evidence (relay #1): `npx vitest run --project integration src/modules/storefront` -> 15 passed; db:reset pushed `unit_price_seen` (both dev and test DB have the column); `purgeAnonCarts` covered in cart.int.test.ts.
- [x] STO-02 Cart UI + header count. SRS FR-CRT-001, FR-CRT-003, FR-CRT-007 (display), UI-002, NFR-USA-004/005.
  Files: `app/[locale]/(store)/cart/page.tsx`, `modules/storefront/actions/cart.ts` ("use server"),
  `modules/storefront/ui/{CartLines,QtyStepper,OrderTotals,HeaderCart}.tsx`, `messages/*/storefront.json`.
  Build: cart page (lines, qty stepper, remove, empty state, "continue to checkout"), totals block = subtotal, discount,
  delivery, **total**, and a separate non-additive "of which VAT" line (FR-CRT-007); `useOptimistic` so qty/remove
  update totals without reload; unavailable/changed-price lines flagged with text+icon (not colour only).
  `HeaderCart` server component (count) + CHANGE-REQUEST to PLATFORM to set `cartSlot={<HeaderCart />}` in `(store)/layout.tsx`.
  Accept: on :3002 `/ar/cart` after adding a seeded variant via action: change qty → totals change with no navigation
  (Playwright spec `tests/e2e/storefront/cart.spec.ts` asserts no `load` event); RTL + 320 px no horizontal scroll.
  Evidence (relay #1): `npx playwright test tests/e2e/storefront/cart.spec.ts` -> 4 passed (no load event on qty change, persisted after reload, 320px ar+en no overflow, header count); tsc clean, eslint clean, `npm run test:unit` 607 passed. SHIM(storefront) one-prop wiring `cartSlot={<HeaderCart />}` carried in (store)/layout.tsx until platform merges the CR.

## Browse
- [x] STO-03 Home page. SRS UI-001/002/004, brief "home (brand, featured collections, seasonal banner)".
  Files: `app/[locale]/(store)/page.tsx`, `modules/storefront/ui/{ProductCard,ProductGrid,SeasonalBanner}.tsx`,
  `modules/storefront/shims.ts` (SHIM catalog collections: read `collections` table read-only until catalog ships
  `listCollections`; CHANGE-REQUEST to CATALOG).
  Build: brand hero (keep tatreez identity), featured collections rails (catalog `listProducts({collection})`), seasonal
  banner (seasonal products in/out of season with "returns on <date>"), new arrivals grid. Use `frontend-design`/`impeccable`.
  Accept: `/ar` and `/en` render seeded products with prices (Latin digits, ₪), no console errors, Lighthouse-style
  check: images have `sizes`/alt; 320/375/1440 px no horizontal scroll.
  Evidence (relay #2): /ar,/en screenshots at 320/375/1440 no horizontal scroll, no console errors, 0 imgs without alt; collections via SHIM in shims.ts; browse.spec.ts (home test) passed; tsc/eslint clean, unit 607 passed.
- [x] STO-04 Listing, collection and search pages. SRS FR-SRC-001 (UI side), UI-004, NFR-LOC-005.
  Files: `app/[locale]/(store)/products/page.tsx`, `app/[locale]/(store)/collections/[slug]/page.tsx`,
  `app/[locale]/(store)/search/page.tsx`, `modules/storefront/ui/{Filters,SearchBox}.tsx`.
  Build: `/products` with group filter + pagination (`Pagination` primitive), `/collections/[slug]` (404 unknown),
  `/search?q=` via catalog `search()` with empty/no-result states; header search entry point composed in pages.
  Accept: `/ar/search?q=<seeded Arabic title without tashkeel>` returns the product; `/ar/collections/ramadan` lists
  seasonal titles; unknown collection → store 404; e2e `browse.spec.ts` green.
  Evidence (relay #2): `npx playwright test tests/e2e/storefront/browse.spec.ts` -> 5 passed (search by tashkeel-less Arabic title, /collections/ramadan members, unknown collection 404, group filter, 320px); tsc/eslint clean, unit 607 passed.
- [x] STO-05 Product page. SRS FR-CAT-009/010 display, FR-ADR-008 (product-page estimate), FR-INV back-in-stock UI.
  Files: `app/[locale]/(store)/products/[slug]/page.tsx`, `modules/storefront/ui/{Gallery,VariantPicker,AddToCart,
  AvailabilityNote,DeliveryEstimate,BackInStockForm,ComponentsList}.tsx`, `modules/storefront/actions/product.ts`.
  Build: gallery (keyboard + swipe), variant picker, price/compare-at, components list, group/occasion, players/age/
  duration, availability-window messaging (out of season → "returns on", no add), stock state (in stock / low /
  sold out) from inventory, delivery estimate from orders `estimateDelivery` for a chosen governorate (default first
  active zone), add to cart (server action → cart count updates), back-in-stock request (phone or email, E.164
  normalised) via inventory `requestBackInStock`; old slug → 301 via `resolveSlugRedirect`; `product.viewed` event;
  metadata (title/description/og).
  Accept: seeded product renders in ar/en; set its stock to 0 in DB → "sold out" + back-in-stock form submits and a
  `back_in_stock_requests` row exists; e2e `product.spec.ts` green.
  Evidence (relay #3): `npx playwright test tests/e2e/storefront/product.spec.ts` -> 5 passed (ar+en render, add-to-cart w/o load event + header count, sold-out form -> E.164 row, old-slug redirect + 404, 320px); tsc/eslint clean; unit 621 passed; screenshots 320/375/1440 ar+en no overflow. Old-slug redirect uses next-intl permanentRedirect (HTTP 308, equivalent to 301 for SEO). Phone parsing: contact.ts tries PS then IL (054 numbers).

## Checkout
- [x] STO-06 Checkout stages 1–2 (contact, address). SRS FR-CRT-006, FR-ADR-001, FR-ADR-002, FR-ADR-004, FR-ADR-005, NFR-USA-005.
  Files: `app/[locale]/(store)/checkout/page.tsx`, `modules/storefront/checkout/{schema,state}.ts`,
  `modules/storefront/actions/checkout.ts`, `modules/storefront/ui/{CheckoutStepper,ContactStage,AddressStage,AddressFields,PhoneField}.tsx`,
  `modules/storefront/checkout/checkout.test.ts`.
  Build: checkout draft kept server-side in a signed httpOnly cookie (`dc_checkout`, contents: stage data, no card
  data); contact (name, phone any format → E.164 via `normalizePhone`, email optional); address = six discrete fields
  (governorate select from active zones, locality, directions, landmark, recipient name, recipient phone) + optional
  postal code (never blocks); signed-in: default address pre-filled, pick another from book, "save to my addresses".
  Forward movement blocked with field-level errors that say what to fix (ar/en). `checkout.started` event.
  Accept: unit tests for stage schemas (E.164 normalisation of +970/+972/+962/+1 numbers, postal code optional, each
  of six fields required); browser: invalid phone blocks stage 1 with message; signed-in seeded customer sees default address.
  Evidence (relay #4): checkout.test.ts 23 unit tests passed (E.164 for +970/+972/+962/+1/Arabic-Indic digits, postal never blocks, six fields required, sealed cookie tamper); `npx playwright test tests/e2e/storefront/checkout-stages.spec.ts` -> 5 passed (invalid phone blocks stage 1 with ar message, stages open one at a time, signed-in customer pre-filled + default address + save to book, forged cookie ignored, 320px); tsc/eslint clean; unit 644 passed; screenshots 375/1440 ar+en checked. Postal code is collected but has no column in orders/engagement (BACKLOG).
- [~] STO-07 Checkout stages 3–4, re-validation, place order. SRS FR-CRT-004, FR-CRT-006, FR-CRT-007, FR-CRT-008 (UI side), FR-ADR-006/008, NFR-USA-006.
  Files: `modules/storefront/checkout/{revalidate,place}.ts`, `modules/storefront/ui/{DeliveryStage,PaymentStage,ChangesNotice}.tsx`,
  `modules/storefront/checkout/revalidate.int.test.ts`.
  Build: delivery stage = zone flat rate (orders `quoteDeliveryFee`) + estimate window; payment stage = card / COD (COD
  only when zone `codEligible` and total ≤ cap, reason shown otherwise); full totals via `computeTotals`. Re-validation
  at checkout entry AND on "Place order": current price vs `unit_price_seen`, availability vs qty → changes notice listing
  each change, customer must acknowledge (seen prices updated) before payment. Place: idempotency key per checkout draft
  (double-click safe), `orders.placeOrder`, then `payments.initiatePayment` (card → redirect, COD → confirmation),
  cart `converted_at` set; `insufficient_stock` → back to notice.
  Accept: int test: price changed + stock reduced server-side → `revalidate()` reports both; double submit → one order;
  browser: guest COD purchase product→cart→checkout→confirmation in 4 screens.
  Evidence (relay #5, commit fea898a): `npx vitest run --project integration src/modules/storefront/checkout` -> 8 passed (price changed + stock reduced -> revalidate() reports both, withdrawn line, ack clears price change, double submit -> one order + cart converted, COD re-checked vs cap); unit 653 passed; `npx playwright test tests/e2e/storefront/checkout-place.spec.ts` -> 5 passed (guest COD placed once -> /ar/checkout/confirmation/DC-..., double-click = 1 order, card -> provider URL with UNPAID order, COD over cap disabled with reason, price-change notice blocks then accept); tsc/eslint clean; screenshots 375/1440 ar+en no overflow.
  PARTIAL only because the confirmation page itself (4th screen) is STO-08: the redirect target `/checkout/confirmation/<reference>` 404s until then.
- [ ] STO-08 Order confirmation + payment return + post-order account offer. SRS FR-CRT-005, FR-ORD-012 (guest view), NFR-USA-006.
  Files: `app/[locale]/(store)/checkout/confirmation/[reference]/page.tsx`, `app/[locale]/(store)/checkout/return/page.tsx`,
  `modules/storefront/ui/{OrderSummary,AccountOffer}.tsx`, `modules/storefront/checkout/access.ts`.
  Build: confirmation visible to the owning customer or to the placing browser (signed `dc_orders` cookie of order
  ids) else 404; return page reads payment state (payments `getPaymentSummary`) → success/pending/failed with retry
  (cart intact on failure); guest account offer: "Create your account" → phone OTP to the order phone (auth
  `/api/auth/customer/otp/*`, phone pre-filled, nothing re-typed) → signed in, guest row upgraded; optional password later.
  Accept: e2e `checkout.spec.ts`: guest COD order → confirmation → account offer → OTP read from `/api/dev/outbox` →
  `/ar/account/orders` lists the order; other browser opening the confirmation URL → 404.

## Customer auth + account
- [ ] STO-09 Sign-in / sign-up / reset UI restyle + cart merge. SRS FR-ACC-001, FR-ACC-002 (UI), FR-CRT-002 (merge), NFR-USA-005.
  Files: `app/[locale]/(store)/{sign-in,sign-up,forgot-password,reset-password}/page.tsx`,
  `modules/storefront/ui/auth/*.tsx` (own forms posting to the existing `/api/auth/customer/*` routes; do not edit `modules/auth/**`).
  Build: design-system forms, email+password and phone+OTP as tabs, resend timer, plain-language errors, `next` kept;
  after success the cart merges (D5).
  Accept: e2e `auth.spec.ts`: anon cart with 1 line → sign in by phone OTP → cart shows the line once; sign up by email
  → `/ar/account`; existing `tests/e2e/auth/*` still green.
- [ ] STO-10 Account area: profile, locale, notifications, address book. SRS FR-ACC-007, FR-ADR-005, UI-003.
  Files: `app/[locale]/(store)/account/{layout,page}.tsx`, `app/[locale]/(store)/account/{addresses,preferences}/page.tsx`,
  `modules/storefront/actions/account.ts`, `modules/storefront/shims.ts` (SHIM engagement `updateCustomerProfile`,
  `deleteAddress` + CHANGE-REQUEST).
  Build: account nav (profile, orders, addresses, preferences, privacy link → INSIGHTS' `account/privacy`); profile name
  edit; email/phone shown read-only (change = BACKLOG); locale preference via `persistLocalePreference`; notification
  preferences = marketing consent per channel (whatsapp/sms/email) via engagement `recordConsent`/`listConsents`
  (source "account"); address book list/add/edit/delete/set default via engagement `saveAddress`.
  Accept: each field saves and survives sign-out/sign-in (e2e `account.spec.ts`); a new default address pre-fills checkout.
- [ ] STO-11 My orders + order detail. SRS FR-ORD-012.
  Files: `app/[locale]/(store)/account/orders/page.tsx`, `app/[locale]/(store)/account/orders/[reference]/page.tsx`,
  `modules/storefront/ui/{OrderStatusBadge,OrderTimeline}.tsx`.
  Build: list (orders `listCustomerOrders`, paginated), detail (lines, totals with of-which VAT, address, payment
  method, status history from `listOrderEvents` in customer language). Another customer's reference → `notFound()` (404, not 403).
  Accept: e2e: customer A's reference opened by customer B → 404 page and HTTP 404; own order shows timeline.

## Content + quality
- [ ] STO-12 FAQ + policy pages + store 404 polish. SRS UI-001, footer links in `lib/nav/store-nav.ts`.
  Files: `app/[locale]/(store)/faq/page.tsx`, `app/[locale]/(store)/policies/[kind]/page.tsx`, `app/[locale]/(store)/not-found.tsx`.
  Build: FAQ from catalog `listFaq` (disclosure list), policies from `getPolicy(kind)` with version/effective date;
  unknown kind → 404. (CATALOG owns `/pages/**` only.)
  Accept: `/ar/faq`, `/en/policies/returns` render seeded content; `/ar/policies/nope` → 404.
- [ ] STO-13 E2E purchase journeys + responsive/RTL sweep. SRS NFR-USA-006, UI-001, UI-002, UI-004, NFR-LOC-002/005.
  Files: `tests/e2e/storefront/{purchase,responsive}.spec.ts`.
  Build: guest COD purchase in ar (count screens ≤ 5); card path reaches the payments redirect URL; every store route
  at 320/375/768/1024/1440 has `scrollWidth <= clientWidth`, `dir=rtl` on ar and `ltr` on en; no Arabic-Indic digits in prices.
  Accept: `npm run test:e2e -- tests/e2e/storefront` green twice in a row on a warm server.
- [ ] STO-14 Accessibility + design polish pass. SRS UI-006, NFR-USA-001, NFR-USA-003, NFR-USA-004, NFR-USA-005.
  Files: any owned storefront UI.
  Build: run `impeccable` audit + keyboard walk of every template (visible focus, labels, landmarks, headings order,
  live regions for cart totals/errors), fix findings; if `@axe-core/playwright` is available (CHANGE-REQUEST), add an
  axe scan spec for each template, else a manual checklist in LEADER.md.
  Accept: axe (or manual checklist) zero AA issues on home, listing, product, cart, checkout, confirmation, account;
  `npm run verify` green.
