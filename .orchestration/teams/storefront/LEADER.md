# Leader log — storefront — relay #0

## Plan rationale
- Order = data first, then the screens that depend on it: cart service (STO-01) → cart UI (STO-02) gives a runnable,
  testable spine early; browse pages (03–05) feed the cart; checkout (06–08) needs cart + product; auth/account (09–11)
  last among features because PLATFORM auth already works (pages exist, minimal) and orders/engagement contracts are
  real reads; content pages (12); then e2e sweep (13) and a11y/design polish (14). Each task leaves the build green.
- Everything cross-module goes through contracts. Real today: catalog reads, inventory getAvailability/reserve/
  requestBackInStock (insert), orders placeOrder/getOrder/listCustomerOrders/listOrderEvents/zones/estimate,
  payments computeTotals/getPaymentSummary, engagement customers/addresses/consent. Stub: payments.initiatePayment
  (redirects to `/checkout/mock-pay` which nobody on our side builds) — our e2e for card stops at the redirect URL.
- Gaps handled with `SHIM(storefront)` + CHANGE-REQUESTS (2026-09-27 09:00): layout cartSlot (platform), catalog
  collections read (catalog), engagement updateCustomerProfile/deleteAddress (engagement), axe dev-dep (platform).
- Decisions D1–D6 in TASKS.md header; cross-team ones in DECISIONS.md (2026-09-27 storefront entry).
- Deliberately out (BACKLOG.md): contact (email/phone) change, map pin FR-ADR-003, pickup delivery methods.

## Risks
- `cartSlot` wiring needs PLATFORM/integration; until then the header count is only visible after integration — cart
  page and add-to-cart feedback must stand on their own.
- FR-CRT-004 needs a "price seen" per cart line: we add `cart_lines.unit_price_seen` (our schema) — `drizzle-kit push`
  in other branches will not have it until integration merges storefront (fine: only we read it).
- `initiatePayment` stub + later PAYMENTS page location: keep our code to `redirectUrl` from the contract; never
  hard-code a PSP path.
- Guest confirmation access must not leak orders: signed cookie of placed order ids + customer ownership, else 404.
- Parallel teams share one machine: cold `npm ci`/dev compile is slow (install took >10 min in relay #0). Workers must
  start the dev server in the background and poll; never use another team's ports.
- next-intl literal scanner (`no-literals.test`) and `logical-classes.test` will fail on careless UI; run unit tests per task.

## How I validate each batch
1. `git log` of the batch vs TASKS.md ticks; read the diff for ownership violations (`git diff --stat foundation-v1`
   must only show owned paths + `.orchestration` untouched from the worktree).
2. `npx tsc --noEmit`, `npx eslint` on touched files, `npm run test:unit`, the task's integration tests.
3. Start dev on :3002 (background), load the task's pages in ar + en at 375 px and 1440 px (screenshots via the
   browse/playwright skill), check RTL, digits, no horizontal scroll, errors in console.
4. Run the task's acceptance command myself; record verdict below.

## Review log
- relay #0: plan written; environment set up (see HANDOVER.md). No worker batches yet.
