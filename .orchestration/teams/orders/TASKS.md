# TASKS — team ORDERS (Phase 1)

Worktree `D:/Personal/Projects/DardaChat-wt/orders` (branch `team/orders`), run everything from `web/`. DB 54323, web 3003.
Owned paths only (BRIEF.md). Legend: `[ ]` todo, `[x]` done (+ one-line evidence), `[~]` partial (+ note), `[!]` blocked.
Every task ends with `npx tsc --noEmit` green + the task's tests green + a commit. UI tasks also load the page on :3003.
Tests: unit `*.test.ts`, DB integration `*.int.test.ts` (use `dardachat_test`; never two int runs at once), e2e in
`web/tests/e2e/orders/` (admin specs import `test` from `../support/owner-session`).

Layout decisions (see LEADER.md): the public contract stays `modules/orders/index.ts`; team-internal back-office code
lives in `modules/orders/admin/*.ts` (+ `modules/orders/delivery/*.ts` for zones/courier/outcomes) and is imported by our
own pages/routes directly (precedent: `@/modules/auth/staff-users`). All strings in the `orders` namespace
(`messages/<ar|en>/orders.json`, `delivery.*` sub-keys; no `delivery` namespace is registered). Pages live under
`/admin/orders/**` and `/admin/delivery/**`; the nav hrefs are a CHANGE-REQUEST to platform.

## Setup
- [x] **ORD-00 Environment** — worktree, `npm ci`, `.env.local` (PG 54323 / web 3003), `db:reset`, baseline `npm run verify`.
  Accept: `npm run verify` green on the untouched branch. (Leader, relay #0 — evidence in HANDOVER/LEADER.)

## Engine (domain + integration tests first; everything below builds on it)
- [x] **ORD-01 Appendix A fidelity, references, labels** — SRS FR-ORD-001, FR-ORD-002. Files: `modules/orders/state-machine.test.ts`,
  `modules/orders/reference.test.ts` (new), `messages/{ar,en}/orders.json` (new: fulfilment/payment state labels,
  payment methods, shared words), `modules/orders/labels.ts` (state → message key, badge tone).
  Check every A.2/A.4 row is present exactly once (table-driven test against a literal copy of Appendix A) and fix
  `state-machine.ts` if not (note in DECISIONS.md). 10 000 `newOrderReference()` → unique, not monotonic, only Crockford chars,
  `normalizeOrderReference` round-trips dictated forms.
  Accept: `npx vitest run src/modules/orders` green; `npx vitest run src/lib/i18n` (messages parity + no-literals) green.
  Evidence: `npx vitest run --project unit src/modules/orders src/lib/i18n` → 11 files / 435 tests green (e3a34d5). Found + shimmed a lib/ids bug: prefix-less refs whose body starts "DC" did not parse (`modules/orders/reference.ts`, CR to platform). Appendix A tables were already faithful — no change.
- [x] **ORD-02 Schema deltas + orders settings** — FR-ORD-015/026/027, FR-ADR-009, FR-ORD-009. Files: `modules/orders/schema.ts`,
  `modules/orders/settings.ts` (new). Add `returned` to `orders_delivery_outcome`; `delivery_outcomes.outcome_date`
  (date, courier-report date); `orders.revised_expectation` (date, backorder). Typed settings (zod + defaults):
  `orders.origin_rule` (`zone|whole_stock|default` + default origin code), `orders.failed_delivery_reasons`,
  `orders.return_reasons`, `orders.courier_csv_columns`, `orders.ageing_days` (7), `orders.return_window_days` (14),
  `orders.prepaid_reservation_ttl_minutes` (30). Bilingual labels for reason lists live in settings (`{ code, ar, en }`).
  Accept: `npm run db:setup` applies cleanly (push + sql); `npx vitest run --project integration src/db/schema-orders` green;
  unit test for settings defaults/validation green.
  Evidence: `npm run db:reset` applied cleanly; `npx vitest run --project integration src/db/schema-orders src/modules/orders` 4 files / 31 green; settings unit tests green (d0ddc1d). Also added unique `delivery_outcomes_shipment_uq` (one outcome per consignment, FR-ORD-026).
- [x] **ORD-03 Transition engine with journal + side-effect ports** — FR-ORD-002/003, FR-DAT-006, Appendix A (A.1/A.2 + coupled A.4).
  Files: `modules/orders/service.ts`, `modules/orders/effects.ts` (new), `modules/orders/notify.ts` (new),
  `modules/orders/transition.int.test.ts` (new). `transition()` locks the row, checks Appendix A, writes `order_events`
  (actor type/id from `ctx.actor`, `data.before/after` of changed columns), applies coupled payment-state moves
  (COD accept → COD_DUE, COD cancel → COD_CANCELLED) and dispatches the row's side effects through ports calling
  `@/modules/inventory` (release/reserve/commitDispatch/restoreOnReceipt/writeOff/recordShortfall), `@/modules/payments`
  (issueInvoiceIfDue, refund — `not_implemented` → event `refund_required` + business event, never a failed
  transition) and customer notices after commit. `notify.ts`: `engagement.notify` for events it knows, SHIM(orders)
  fallback to `core.sendMessage` with orders ar/en texts for `order.backordered|resumed|cancelled|lapsed|return_*`
  (CHANGE-REQUEST to engagement to add them). Remove the `STUB(contracts)` marker on `transition`.
  Accept: int test walks every allowed fulfilment row (and refuses 5+ absent ones with `invalid_transition`), asserts
  one event per move with actor + before/after, asserts port calls with `vi.spyOn`; UPDATE on order_events refused.
  Evidence: `transition.int.test.ts` walks all 30 A.2 rows (coverage asserted), refuses 6 absent moves with `invalid_transition` and no event, asserts actor + before/after per event, port calls via vi.mock spies, UPDATE on order_events refused; tsc + eslint clean (bbe0e95). Engine = `transitionOrder(orderId, input, fx, ctx)` in service.ts; `transition` contract = it with no fx.
- [x] **ORD-04 placeOrder completion** — FR-CRT-008, FR-ADR-006/007/009, FR-PAY-001 guard, FR-INV-009 (expiry stamp).
  Files: `modules/orders/service.ts`, `modules/orders/origin.ts` (new), `modules/orders/place-order.int.test.ts`.
  Zone resolution by governorate+locality (locality row wins), inactive/unknown zone → `invalid_input`; origin rule from
  settings (zone default → origin that can fill the whole order per `inventory.getAvailability().byLocation` → default);
  full COD guard (zone `codEligible`, zone cap, `payments.cod_max_total`); prepaid `reservationExpiresAt = now + ttl`.
  NOTE (relay #1): INVENTORY's decision (DECISIONS 2026-09-27, lines ~54-55) plans `inventory.pendingOrderTtlMinutes()`,
  `setHoldExpiry`, `reacquireOrderHold`, its own sweep job and `resumeBackorders` calling `orders.transition`. Those
  exports are not in our branch; ORDERS' leader decision (polling jobs) stands in our branch. Keep the engine
  idempotent for both (it is: shortfall_cleared re-reserves outstanding qty via `reserve`, which replaces the hold).
  Accept: int tests: 10 parallel submits with one idempotency key → 1 order, 9 `replayed`; each origin rule picks as
  specified; COD refused in a non-COD zone and above cap; prepaid carries an expiry, COD none.
  Evidence: `npx vitest run --project integration src/modules/orders` 4 files / 32 green incl. `place-order.int.test.ts` (parallel key, locality wins, 3 origin rules, zone/global COD caps, TTL on place + retry, cleared on PAID); tsc + eslint clean. Order holds carry no inventory-side expiry: `orders.reservation_expires_at` + the ORD-06 job is the authority (a TTL hold would lapse after PAID).
- [x] **ORD-05 Cancellation + payment retry** — FR-ORD-011, FR-INV-010, A.2 cancel rows. Files: `modules/orders/admin/cancel.ts`
  (new, `cancelOrder(orderId, { reason, by: "staff"|"customer" }, ctx)` picks the trigger from the current state),
  `modules/orders/service.ts` (`retryPayment`), int test. Refund raised where money was received; COD → COD_CANCELLED.
  Accept: int test: cancel succeeds from PENDING, PAID, COD_CONFIRMED, PROCESSING, BACKORDERED (and DELIVERY_FAILED only
  after receipt back, see ORD-13) with the right payment state + release call; refused from DISPATCHED/DELIVERED;
  retry after stock gone → refused, order stays PAYMENT_FAILED.
  Evidence: `npx vitest run --project integration src/modules/orders/cancel` 10 green (6 cancel states incl. COD/card PROCESSING with payment state + release + refund-or-not, DISPATCHED/DELIVERED refused, DELIVERY_FAILED refused until shipment returned_at, customer limited to PENDING/PAID/COD_CONFIRMED/BACKORDERED, retry with real stock at 0 → insufficient_stock, stays PAYMENT_FAILED); tsc + eslint clean.
- [x] **ORD-06 Jobs: reservation expiry, backorder auto-resume, auto-complete** — FR-INV-009, FR-ORD-022, A.2 DELIVERED→COMPLETED.
  Files: `modules/orders/jobs.ts`, `modules/orders/jobs.int.test.ts`. `orders.reservations.expire` (every 2 min):
  PENDING prepaid past `reservation_expires_at` → CANCELLED (`reservation_expired`) + lapsed notice.
  `orders.backorders.resume` (every 5 min): BACKORDERED whose shortfall lines are now covered by
  `inventory.getAvailability` at the origin → re-reserve full qty, clear shortfall, → PROCESSING, resumed notice.
  `orders.complete` (hourly): DELIVERED past the return window (Asia/Jerusalem business days) with a final payment state
  → COMPLETED. All idempotent.
  Accept: int tests for each job (stock raised by direct `stock_levels` insert); `npm run jobs -- --list` shows all three.
  Evidence: `npx vitest run --project integration src/modules/orders/jobs` 4 green (TTL 29 vs 31 min, lapsed notice, hold released; resume waits while origin has no free stock then resumes + clears shortfall/revised expectation; complete at Jerusalem midnight D+15, COD_DUE not completed; each rerun moves 0); `npm run jobs -- --list` lists orders.reservations.expire 120s / orders.backorders.resume 300s / orders.complete 3600s; tsc + eslint clean.

## Back office — orders
- [x] **ORD-07 Admin order list** — FR-ORD-004, UI-004/005. Files: `modules/orders/admin/queries.ts` (new
  `listOrdersForAdmin`), `app/[locale]/admin/orders/page.tsx` (+ `_components/`), `messages/*/orders.json`.
  Filters: fulfilment state, payment state, period (from/to business dates, Asia/Jerusalem), origin, customer (name,
  phone, email or reference); combinable, URL-driven (`?status=&payment=&from=&to=&origin=&q=&page=`), paginated table
  (reference, placed, customer, total, both states as badges, origin), links to detail. `requireStaff("orders.read")`.
  Accept: int test proves each filter narrows and filters combine; page 200 at 1280 and 375 with the owner session
  (no horizontal page scroll); `tests/e2e/orders/list.spec.ts` green.
  Evidence: `admin-queries.int.test.ts` 3 green (each of status/payment/from-to (Jerusalem day edge)/origin/q name|email|phone|reference narrows; combos; junk ignored; paging); `npx playwright test tests/e2e/orders/list.spec.ts` 3 passed on :3003 (200 + no side scroll at 1280/375, q + payment filter via URL, empty state, clear); unit suite 660 green (walker, no-literals, parity). Origin names come from `inventory.listLocations()` (no join on inventory's table). e2e helper `tests/e2e/orders/db.ts` places real orders on the dev DB.
- [x] **ORD-08 Admin order detail: timeline, notes, corrections, origin override** — FR-ORD-003/010/013, FR-ADR-009, FR-DAT-006.
  Files: `modules/orders/admin/detail.ts` (new: `getOrderForAdmin`, `addInternalNote`, `correctDelivery`,
  `overrideOrigin`), `app/[locale]/admin/orders/[id]/page.tsx` + server actions (`staffAction("orders.write")`), messages.
  Timeline merges `order_events` + correction/override events (before/after shown). Address/recipient/phone editable
  only before dispatch (refused after, `invalid_transition`); origin override only before PROCESSING picking starts,
  records staff id (`originOverriddenById`) + event. Notes never appear in `getOrder`/customer DTOs. Action buttons for
  the staff-triggerable moves (release to warehouse, cancel with reason dialog).
  Accept: int tests (edit before dispatch ok + journaled with before/after; after dispatch refused; note absent from
  `getOrder`); e2e `detail.spec.ts` adds a note, corrects the phone, sees both in the timeline.
  Evidence: backend `detail.int.test.ts` 3 green (relay #2, 50e30f7); page `admin/orders/[id]` + `actions.ts` (staffAction orders.write: note, correct, override, release, cancel dialog); `npx playwright test tests/e2e/orders/detail.spec.ts` 2 passed on :3003 (note + phone correction with before/after in timeline; ar 375px no side scroll, release → origin locked, cancel with reason → CANCELLED); tsc + eslint + i18n parity green.
- [x] **ORD-09 Demo order seed** — FR-ORD-004 ("seeded set"). Files: `modules/orders/seed.ts`. ~40 deterministic orders across
  every fulfilment state reachable without other modules, both origins, several zones, COD + card, guest + customers,
  created through `placeOrder`/`transition` (so events exist); idempotent on re-seed.
  Accept: `npm run db:reset` green; admin list shows them; every list filter returns ≥1 seeded order.
  Evidence: `npm run db:reset` green → 40 orders in all 15 states (`seed-demo.ts`, SHIM runs payments seed first, CR to platform); re-seed adds 0; `seed-demo.int.test.ts` 4 green (states, idempotent, every status/payment/origin/period/q filter ≥1, skipped on *_test); `npx playwright test tests/e2e/orders/list.spec.ts` 4 passed incl. seeded-set check; orders+seed int 10 files / 60 green.
- [x] **ORD-10 Pick / pack / dispatch backend** — FR-ORD-005/007/021, FR-INV-011, UI-005 (logic). Files:
  `modules/orders/admin/fulfilment.ts` (new: `releaseToWarehouse`, `recordPick`, `createShipment`/`dispatchShipment`),
  int test. Shortfall at picking (picked < ordered) → `shortfall_qty` on the line + `inventory.recordShortfall` +
  `revised_expectation` → BACKORDERED + notice (never cancelled). Dispatch selected lines as a consignment with a
  dispatch reference: all lines → DISPATCHED, some → PARTIALLY_DISPATCHED, remainder → DISPATCHED;
  `inventory.commitDispatch` per shipment; `payments.issueInvoiceIfDue` on the first dispatch only; `order.dispatched`
  notice carries the `estimateDelivery` window and no tracking link.
  Accept: int tests: two consignments → PARTIALLY_DISPATCHED then DISPATCHED with 2 shipments + refs; invoice port called
  once; shortfall → BACKORDERED with shortfall qty and not CANCELLED.
  Evidence: `admin/fulfilment.ts` (`releaseToWarehouse`, `recordPick` (all lines reported; full → `picked` journal row; short → BACKORDERED + revised expectation default +5 business days), `dispatchConsignment` (shipment + lines + move in one tx; from PARTIALLY_DISPATCHED the rest must leave together), `outstandingLines`, `listShipments`); `fulfilment.int.test.ts` 4 green (2 consignments → PARTIALLY_DISPATCHED → DISPATCHED, refs KRM-1001/1002, invoice port 1×, commitDispatch 2×; COD single dispatch notice has window, no link; shortfall → BACKORDERED qty 1 + recordShortfall; validation + forbidden); tsc + eslint + i18n green.
- [x] **ORD-11 Picking + dispatch UI (375 px) and packing slip** — UI-005, FR-ORD-005/007, FR-ORD-006 (packing slip, print view).
  Files: `app/[locale]/admin/orders/picking/page.tsx` (queue by origin), `app/[locale]/admin/orders/[id]/fulfil/page.tsx`
  (per-line picked qty steppers, shortfall confirm, select lines, dispatch reference input), `app/[locale]/admin/orders/[id]/packing-slip/page.tsx`
  (print CSS, customer locale, RTL), messages. Large touch targets, one column at 375 px.
  Accept: `tests/e2e/orders/picking.spec.ts` at 375x812 releases → picks → dispatches in 2 consignments; no horizontal
  scroll; packing slip page renders Arabic RTL (screenshot checked).
  Evidence: `npx playwright test tests/e2e/orders/picking.spec.ts` 3 passed on :3003 at 375x812 (queue → release → pick → 2 consignments KRM-…-1/-2, no side scroll at every step; shortfall via stepper + confirm → BACKORDERED; slip from /en UI is lang=ar dir=rtl, toolbar hidden in print media, screenshot checked); fulfilment int 5 green (+ queue/picked-marker test); unit 660 green; tsc + eslint clean.
- [x] **ORD-12 Courier CSV export (configurable columns)** — FR-ORD-008, FR-ADR-007. Files: `modules/orders/delivery/courier-csv.ts`
  (field catalogue + builder, UTF-8 BOM, RFC 4180 quoting), `app/api/orders/courier-export/route.ts`
  (`staffRoute("orders.write")`, marks `shipments.exported_at`), `app/[locale]/admin/delivery/courier-export/page.tsx`
  (column editor: add/remove/reorder/rename headers from the catalogue, saved to `orders.courier_csv_columns` with
  `settings.write`; download button; filter "not yet exported"). Columns include origin + dispatch reference + COD amount.
  Accept: unit tests for the builder (Arabic, commas, quotes, newlines); int test: changing the setting changes the
  header row with no code change; e2e downloads a CSV whose header matches the configured columns.
  Evidence: `courier-csv.test.ts` 5 green (BOM/CRLF, Arabic + comma/quote/newline round-trip, formula guard keeps phones, unknown field → empty, defaults ⊂ catalogue incl. origin/dispatch ref/COD); `courier-csv.int.test.ts` 2 green (setting change → new header row, COD on first consignment only, exported_at stamped once, pending export then empty); `npx playwright test tests/e2e/orders/courier-export.spec.ts` 1 passed (rename/move/remove/add → downloaded header matches, restores defaults); unit 665 green; tsc + eslint clean. Route is POST (it stamps exported_at) + audit `orders.courier_export`.

## Back office — delivery
- [x] **ORD-13 Delivery outcomes + failed delivery** — FR-ORD-014/015/016/017/026, A.2 delivery rows. Files:
  `modules/orders/delivery/outcomes.ts` (new: `recordDeliveryOutcome(shipmentId, { outcome, date, reason? })` exactly one per
  consignment; aggregate order state: all delivered → DELIVERED (COD invoice port on first delivery), failed/refused with
  nothing outstanding → DELIVERY_FAILED; `receiveBackAtOrigin(shipmentId)` → `inventory.restoreOnReceipt` citing the order;
  `resolveFailedDelivery(orderId, "redeliver"|"cancel")` requires a recorded reason and records the decision; cancel
  only after receipt back), int test.
  Accept: int tests: second outcome on a consignment refused; failed without reason refused; both exhausted-attempts and
  refusal reach DELIVERY_FAILED; redeliver → PROCESSING and cancel → CANCELLED each record the choice; restore called
  only on receipt.
  Evidence: `delivery/outcomes.int.test.ts` 6 green (second outcome → invalid_transition outcome_exists; failed w/o or with unknown reason, future date, non-staff refused; refused + attempts_exhausted → DELIVERY_FAILED with reason journaled; 2 consignments wait for every outcome, COD invoice once; restore only on receiveBackAtOrigin (1 call, 2nd refused); redeliver/cancel refused until received back, stamp `decision`, redeliver → PROCESSING + reserve + lines outstanding again → re-dispatch → DELIVERED; cancel → refund (card) / COD_CANCELLED); orders int 12 files / 69 green; tsc + eslint clean. Decision: redeliver also needs receipt back; received-back consignments no longer count as shipped.
- [x] **ORD-14 Awaiting-outcome list + outcome entry UI + reasons admin** — FR-ORD-026/015. Files:
  `app/[locale]/admin/delivery/page.tsx` (awaiting outcome: dispatched consignments without an outcome, with origin,
  reference, dispatch ref, days out; inline outcome form with date + reason select), `app/[locale]/admin/delivery/reasons/page.tsx`
  (edit failed-delivery + return reason lists, `settings.write`), order-detail consignment panel (receive back, redeliver/cancel).
  Accept: e2e `delivery.spec.ts`: dispatch → appears as awaiting → record "refused" with reason → DELIVERY_FAILED →
  receive back → redeliver → PROCESSING; a new reason added in admin shows up in the select.
  Evidence: `/admin/delivery` (awaiting list via `listAwaitingOutcome`, inline outcome form), `/admin/delivery/reasons` (settings.write, audited), consignment panel on order detail (receive back, redeliver; cancel via dialog); `npx playwright test tests/e2e/orders/delivery.spec.ts` 2 passed on :3003 (reason added → offered; dispatch → awaiting at 375 → refused → DELIVERY_FAILED → received back → redeliver → PROCESSING, no side scroll); delivery int 3 files / 14 green; tsc + eslint clean.
- [x] **ORD-15 Ageing list + lost in transit** — FR-ORD-027, CON-10. Files: `modules/orders/delivery/ageing.ts`,
  `app/[locale]/admin/delivery/ageing/page.tsx` (threshold from `orders.ageing_days`, editable), int test.
  `closeAsLost(shipmentId)` requires `orders.close_lost` (Owner): `inventory.writeOff(reason "loss_in_transit")`, refund
  port where prepaid, → LOST_IN_TRANSIT; days counted on Asia/Jerusalem business dates.
  NOTE (relay #1): per DECISIONS 2026-09-27 inventory, ORDERS must NOT call `inventory.writeOff` for LOST_IN_TRANSIT
  (already decremented by commitDispatch); the engine does not — assert writeOff NOT called instead.
  Accept: int test: consignment older than threshold listed, younger not; close as lost → state + writeOff + refund calls;
  Staff gets 403 on the close action.
  Evidence: `delivery/ageing.ts` (`listAgeing`: no outcome, or failed/refused/returned never received back and undecided; Jerusalem dates; `closeAsLost` Owner-only) + `/admin/delivery/ageing` (threshold editor settings.write, close form `staffAction("orders.close_lost")`); `ageing.int.test.ts` green (older listed, younger not, Jerusalem 23:30 edge, close → LOST_IN_TRANSIT + refund for card / none for COD, writeOff NOT called, Staff + customer forbidden, younger refused); `npx playwright test tests/e2e/orders/ageing.spec.ts` 1 passed (dispatch → back-dated 30 d → listed at 375 → closed → Lost in transit).
- [x] **ORD-16 Returns** — FR-ORD-009, A.2 return rows. Files: `modules/orders/admin/returns.ts` (request with reason code
  from settings, lines + qty, kind return|exchange; receive at a location with per-line restock flag →
  `inventory.restoreOnReceipt` only then, refund port; → RETURNED; settle → COMPLETED; withdraw → COMPLETED),
  `app/[locale]/admin/orders/returns/page.tsx` (list) + return panel on order detail, int test.
  Accept: int test: request leaves stock untouched (no restore call), receipt restores (one call citing return id);
  reason code mandatory; e2e request → receive on a delivered order.
  Evidence: `admin/returns.int.test.ts` 5 green (request leaves stock untouched + no restore call, reason mandatory, receipt restores once citing the return id, exchange/no-restock lines, withdraw, settle → COMPLETED); `npx playwright test tests/e2e/orders/returns.spec.ts` 1 passed on :3003 (delivered → request at 375 → listed under open returns → received (restock) → RETURNED → settled → COMPLETED, no side scroll); tsc clean; UI = `/admin/orders/returns` list + ReturnsPanel on order detail.

## Customer + storefront-facing
- [x] **ORD-17 Customer order API + contract additions** — FR-ORD-012, FR-ORD-011 (customer cancel), FR-ORD-009 (customer
  return request), FR-ADR-008. Files: `app/api/orders/route.ts` (GET own list), `app/api/orders/[reference]/route.ts`
  (GET own order: states, lines, totals, consignments with dispatch date + estimate, customer-visible timeline; no
  internal notes/staff ids), `app/api/orders/[reference]/cancel/route.ts`, `.../return-request/route.ts` (`customerRoute`);
  contract export `getCustomerOrder(customerId, reference, ctx)` + `CustomerOrderView` (update `index.ts`,
  `contracts.test.ts` manifest, CONTRACTS.md, CHANGE-REQUESTS.md in the same commit).
  Accept: int test: another customer's reference → 404 `not_found` (never 403), unknown → 404; response has no `notes`
  key; e2e/curl with a signed-in customer.
  Evidence: `npx vitest run --project integration src/modules/orders/customer` 6 green (other customer / guest / unknown / malformed → null + route 404 `{error:"not_found"}`, no cookie 401; no notes/actorId/data/origin/order id/staff id/note text in the view; timeline from≠to; consignment ref + date + estimate; customer cancel 200, other customer 404 and untouched, PROCESSING 409, form post 415; return-request 201 + withdraw → COMPLETED); `npx playwright test tests/e2e/orders/customer-api.spec.ts` 1 passed on :3003 (real customer cookies); contracts unit 13 green; tsc + eslint clean. Logic in `modules/orders/customer.ts`; address notes exposed as `deliveryNotes`.
  Evidence: `npx vitest run --project integration src/modules/orders/customer` 6 green (other customer / guest / unknown / malformed → null + route 404 `{error:"not_found"}`, no cookie 401, no notes/actorId/data/origin/order id/staff id/note text in the view, timeline from≠to, consignment ref+date+estimate, customer cancel 200 / other 404 untouched / PROCESSING 409 / form 415, return-request 201 + withdraw → COMPLETED); `npx playwright test tests/e2e/orders/customer-api.spec.ts` 1 passed on :3003; contracts unit 13 green; tsc + eslint clean.

## Zones and origins
- [x] **ORD-18 Delivery zones + origins admin** — FR-ADR-006/007/008/009. Files: `modules/orders/delivery/zones.ts`
  (`upsertZone`, `setZoneActive`, audited), `app/[locale]/admin/delivery/zones/page.tsx` (+ `[id]`), `app/[locale]/admin/delivery/origins/page.tsx`
  (origin rule + default origin setting; lists `inventory.listLocations()`; location CRUD is INVENTORY's). Zone fields:
  names ar/en, governorate, locality override rows, flat rate (₪ input → agorot), COD eligible, COD cap, window min/max,
  default origin, active. `settings.write` for edits, `settings.read` to view.
  Accept: int test: edited window changes `estimateDelivery`; edited rate changes `quoteDeliveryFee`; an address outside
  every active zone is refused by `placeOrder`; e2e edits a zone and sees it on reload.
  Evidence: `delivery/zones.int.test.ts` 5 green (edited window moves estimateDelivery, edited rate moves quoteDeliveryFee + placeOrder delivery total, both audited before/after; zone off → placeOrder invalid_input and gone from listDeliveryZones, back on restores; locality row unique case-insensitively and wins at checkout, identity fixed on edit; validation: window order, rate ≥ 0 integer, names, default origin must be an active origin, new zone needs a governorate; Staff/customer/system forbidden, zone untouched); `npx playwright test tests/e2e/orders/zones.spec.ts` 2 passed on :3003 at 375 (add zone with ₪ rate + COD cap + window → reload shows it → edit → refused bad window → switch off; origin rule saved + reloaded); unit 682 green; tsc + eslint clean. Pages `/admin/delivery/zones` (+new, [id]), `/admin/delivery/origins`, linked from `/admin/delivery`. Origin rule save is audited as `settings.update`.

## Close-out
- [x] **ORD-19 E2E journeys + verify + docs** — all of the above. Files: `tests/e2e/orders/*.spec.ts`, CONTRACTS.md orders
  section, BACKLOG.md, DECISIONS.md. Journeys: COD order → release → pick → dispatch (2 consignments) → export CSV →
  delivered → (job) completed; prepaid expiry; backorder at picking → stock in → auto-resume; failed delivery →
  receive back → cancel. `git grep -n "STUB(contracts)" web/src/modules/orders` empty.
  Accept: `npm run verify` green; `npx playwright test tests/e2e/orders` green on :3003; CONTRACTS.md orders table
  says "real" for every orders function.
  Evidence: `tests/e2e/orders/journeys.spec.ts` 4 passed on :3003 (COD release → pick → 2 consignments → courier CSV with both refs → delivered → completion job leaves it inside the window, then COMPLETED; prepaid lapse by expiry job; backorder waits then resumes to PROCESSING; refused → received back → cancel with reason); `npx playwright test tests/e2e/orders --workers=1` 21 passed (5fbedea; a first parallel run timed out on 60 s cold compiles only, rerun warm green); `npm run verify` parts: typecheck + eslint clean, unit 33 files / 682 green (`--testTimeout 90000`), integration 51 files / 274 green; `git grep STUB(contracts) web/src/modules/orders` empty; CONTRACTS.md orders rows say DONE.
