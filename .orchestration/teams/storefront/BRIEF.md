# Team STOREFRONT — Phase 1
**Working dir:** `D:/Personal/Projects/DardaChat-wt/storefront` (branch `team/storefront`). DB 54322, web 3002.
**Owns:** `web/src/app/[locale]/(store)/**` EXCEPT `pages/**` (CATALOG), `journey/**` (JOURNEY), `unsubscribe/**`
(ENGAGEMENT), `account/privacy/**` (INSIGHTS); plus `web/src/modules/storefront/**`, `web/src/modules/cart/**`,
`web/messages/*/storefront.json`, `web/messages/*/cart.json`, `web/tests/e2e/storefront/**`.
The storefront header/footer shell belongs to PLATFORM — request changes via CHANGE-REQUESTS.md, or compose inside your pages.
**SRS:** §2.3, §3.1 (UI-001..006), §4.3 (FR-CRT-001..006), §4.5 (FR-ADR-001..005), §4.7 FR-ACC-001/002/007 UI,
FR-ORD-012, §6.5 (NFR-USA-001/004/005/006), §6.6.

**Build:** home (brand, featured collections, seasonal banner), collection & product listing, search results page (catalog
`search()`), product page (gallery, components, group/occasion, availability-window messaging, delivery estimate from
orders contract, add to cart, back-in-stock request via inventory contract), cart (anonymous, persists 30 days, merges on
sign-in without duplicates, qty change/remove with instant totals from payments `computeTotals`), checkout in 4 ordered
stages (contact → address → delivery method → payment method) with re-validation of price/stock at initiation
(FR-CRT-004), guest checkout + post-order account offer without re-entry (FR-CRT-005), address form with the six discrete
fields, optional postal code, E.164 phone, address book with default, order confirmation, customer account area (profile,
addresses, locale + notification preferences, my orders + order detail/status history — own orders only, 404 for
others), sign-in/up UI (email+password and phone+OTP) styled to the design system. Purchase in ≤ 5 screens from product
page to confirmation. Beautiful, fast, mobile-first, fully RTL — use `frontend-design`/`impeccable`. Calls orders
`placeOrder` and payments `initiatePayment` via contracts (stubs until integration).
