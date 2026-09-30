# Tasks — team INVENTORY (Phase 1)

Worktree `D:/Personal/Projects/DardaChat-wt/inventory` (branch `team/inventory`), run everything from `web/`.
DB 54324, web 3004. Owned paths only (BRIEF.md). Cross-team design: DECISIONS.md entries "2026-09-27 inventory".
Legend: `[ ]` todo, `[x]` done (+ one-line evidence), `[~]` partial (note), `[!]` blocked (reason).
Every task: `npx tsc --noEmit` green + its own tests green before commit. Int tests: `npx vitest run --project integration <file>`
(never two int runs at once). UI tasks: load the page on http://localhost:3004 in ar AND en, and at 375px.

Module layout (all tasks): `src/modules/inventory/` — `service.ts` (contract fns), `ledger.ts` (internal movement writer),
`holds.ts` (reservation internals), `backorders.ts`, `back-in-stock.ts`, `admin.ts` (queries for admin pages), `notify-shim.ts`
(`SHIM(inventory)`), `jobs.ts`, `seed.ts`, tests next to them. `src/modules/purchasing/` — `index.ts`, `types.ts`,
`service.ts`, `po-state.ts`, tests. New exports are added to `inventory/index.ts` (pin them via CR in INV-14).

---

- [x] **INV-01 Environment baseline** — SRS: — | paths: web/.env.local (gitignored)
  Worktree on `foundation-v1`, `npm ci`, `.env.local` (PG 54324 / web 3004), `db:reset`, typecheck + unit + int green.
  Accept: `npx tsc --noEmit` exit 0; `npm run test:unit` + `npm run test:int` green; `db:status` running on 54324.

- [x] **INV-02 Ledger writer + stock-level queries** — FR-INV-001, 002, 003, FR-DAT-006 | `modules/inventory/ledger.ts`, `ledger.int.test.ts`, `admin.ts`
  Internal `applyMovements(tx, [{ variantId, locationId, delta, reason, note?, referenceType?, referenceId? }], ctx)`:
  locks stock_levels rows `for update` (order: variantId, locationCode), upserts the level, inserts the movement with
  actorType/actorId from `ctx.actor` (staff/customer/system), refuses on-hand < 0 and on-hand < active holds at that
  location (`conflict`, details). Returns movement ids. `listStockLevels({ q?, locationCode?, lowOnly? })` (variant +
  product names, on hand / reserved / available per location, threshold, low flag) and `listMovements({ variantId?,
  locationCode?, reason?, from?, to?, page })` (actor display name, reference) in `admin.ts`.
  Accept: int test proves Σ delta = on_hand after a mix of movements, negative-below-zero and below-reserved refused,
  UPDATE/DELETE on stock_movements refused (DCA01), movement carries actor + reference.
  Evidence (39df694): `npx vitest run --project integration src/modules/inventory/ledger.int.test.ts` → 6 passed.

- [x] **INV-03 Reservations: concurrency proof + hold expiry API** — FR-INV-002, 004, 005 | `holds.ts`, `service.ts`, `index.ts`, `concurrency.int.test.ts`
  Move reserve/release internals to `holds.ts` (signatures unchanged). New exports `setHoldExpiry(ownerType, ownerId,
  expiresAt | null, ctx?)`, `pendingOrderTtlMinutes(ctx?)` (setting `inventory.pending_order_ttl_minutes`, default 60).
  Accept: int test fires 50 concurrent `reserve` (distinct owners, own connections) at a variant with 1 unit → exactly 1
  fulfilled, 49 `insufficient_stock`; Available = On Hand − Reserved after reserve / release / expiry (pinned `ctx.now`).
  Evidence (39df694): concurrency.int.test.ts 4 passed; 50 reserves on a 60-conn pool settled in 544 ms, 1 won / 49 insufficient_stock.

- [x] **INV-04 Dispatch, receipt of returns, write-off (real)** — FR-INV-003, 004, Appendix A | `service.ts`, `stock-ops.int.test.ts`
  `commitDispatch`: `sale_online` −qty per line at `locationCode`, shrink/release the order's hold by the dispatched qty
  (partial dispatch keeps the rest held), idempotent per `shipmentId` (reference lookup). `restoreOnReceipt`: `return`
  +qty, idempotent per `returnId`. `writeOff`: −qty, reason mandatory, `kind?: "adjustment" | "loss_in_transit"`
  (optional field, contract-compatible). Remove the three `STUB(contracts)` markers.
  Accept: int tests — dispatch decrements + releases, cancellation (`release`) releases without decrementing, replayed
  shipment/return writes nothing new, write-off without reason → `invalid_input`.
  Evidence: stock-ops.int.test.ts 4 passed (dispatch/replay/partial, release, return replay, write-off + audit).

- [x] **INV-05 Shortfall + backorder auto-resume** — FR-INV-011, FR-ORD-022 | `backorders.ts`, `service.ts`, `backorders.int.test.ts`
  `recordShortfall`: validate line belongs to order and qty ≤ line qty, set `order_lines.shortfall_qty`, shrink the hold
  for that variant to what is held. `resumeBackorders(variantIds, ctx)` (called by ledger after any positive movement,
  after the stock tx): oldest BACKORDERED order first, re-reserve shortfall (full hold = held + shortfall), clear shortfall,
  `orders.transition(id, { machine: "fulfilment", to: "PROCESSING", trigger: "shortfall_cleared" })` when all lines clear.
  Import orders lazily (`await import("@/modules/orders")`) to avoid an init cycle. Remove the STUB marker.
  Accept: int test — order placed, moved to PROCESSING→BACKORDERED with shortfall 2; Reserved = held qty; an adjustment
  +2 clears the shortfall and the order is PROCESSING again with the full hold.
  Evidence: backorders.int.test.ts 1 passed (hold 3→1, write-off, +2 return → shortfall 0, PROCESSING, reserved 3). Restock via restoreOnReceipt (same afterStockIn path adjustStock will use).

- [x] **INV-06 Manual adjustment + two-sided transfer services** — FR-INV-006, 007, CON-09 | `service.ts`, `index.ts`, `adjust-transfer.int.test.ts`
  Exports `adjustStock({ variantId, locationCode, delta, reasonCode, note }, ctx)` (reason codes: `count_correction`,
  `damaged`, `found`, `opening_balance`, `other`; code AND note mandatory; `other` needs note ≥ 3 chars) and
  `transferStock({ variantId, fromCode, toCode, qty, note? }, ctx)` (`transfer_out` −qty + `transfer_in` +qty, one tx,
  shared `referenceType "transfer"` + generated `referenceId`). Both require `ctx.actor` of type staff and write an
  `audit` entry. Both call `resumeBackorders` / back-in-stock hook for positive sides.
  Accept: int tests — no reason → `invalid_input`; transfer rows paired with equal magnitude and same reference; transfer
  beyond free stock at source → `conflict`; permission: `can(staff, "inventory.write")` false for a role without it (unit).
  Evidence: adjust-transfer.int.test.ts 4 passed (can() needs the DB, so the permission check lives in the int test). Adjustment reason code stored as reference_type `adjust:<code>`.

- [x] **INV-07 Prepaid hold TTL sweep + payment-retry re-acquire** — FR-INV-009, 010 | `jobs.ts`, `holds.ts`, `notify-shim.ts`, `sweep.int.test.ts`
  Job `inventory.reservations.sweep` every 2 min (idempotent, lease via `lib/jobs`): expired unreleased holds → group by
  owner → `orders.getOrder(id)`: PENDING → `orders.transition(… CANCELLED, trigger "reservation_expired")`, release
  reason `expired`, notify `order.lapsed` via `notifyCustomer()` shim (engagement.notify, fallback core.sendMessage with
  inventory ar/en texts); not an order (cart) → mark released `expired`. Export `reacquireOrderHold(orderId, ctx)`:
  re-reserve the order's lines with the pending TTL, `insufficient_stock` with `{ variantId, requested, available }`.
  Accept: int test with pinned `ctx.now` — PENDING order past TTL is CANCELLED, stock back to Available, outbox has the
  lapse message; a COD order of the same age is untouched; re-acquire after sell-out throws and holds nothing.
  Evidence: sweep.int.test.ts 3 passed (job run at +61 min: card order CANCELLED, +2 available, 1 order.lapsed outbox row; COD hold kept; cart released; re-acquire insufficient_stock, 0 held). test:unit 590 passed.

- [x] **INV-08 Back-in-stock: dedupe + notify on restock + API** — FR-INV-008 | `back-in-stock.ts`, `service.ts`, `app/api/inventory/back-in-stock/route.ts`, `app/api/inventory/availability/route.ts`, `back-in-stock.int.test.ts`
  `requestBackInStock`: normalise phone (E.164 helper) / email, dedupe open request per variant+contact (returns the
  existing id), refuse when the variant is available (`conflict`). `notifyBackInStock(variantIds)` after positive
  movements when Available > 0: each open request → `notifyCustomer("stock.back_in_stock", …)` (transactional, no
  consent check), set `notified_at`; also job `inventory.back_in_stock.notify` every 5 min as safety net. Public routes:
  `POST /api/inventory/back-in-stock` (zod, rate-limited via auth `rateLimit`), `GET /api/inventory/availability?ids=`.
  Remove the STUB marker. Accept: int test — request on sold-out variant, duplicate returns same id, +3 adjustment →
  one outbox message per request, `notified_at` set, no consent record needed; curl POST on :3004 returns 201/200.
  Evidence: back-in-stock.int.test.ts 3 passed (dedupe by normalised phone/email, +3 adjust → 1 outbox row each, notified_at, 0 consent rows, replay/job no-op); curl :3004 POST 201 then 200 same id, in-stock 409, bad body 400; GET availability 200. requestBackInStock now returns `{ requestId, created }` and refuses in-stock (`conflict`) — note for INV-14.

- [x] **INV-09 i18n + admin stock levels page** — FR-INV-001, 002, UI-005 | `messages/{ar,en}/inventory.json`, `app/[locale]/admin/inventory/page.tsx` (+ `_components/`), `tests/e2e/inventory/levels.spec.ts`
  `requireStaff("inventory.read")`; table variant × location: on hand / reserved / available, low-stock badge, search +
  location filter + "low only" (URL params), links to ledger filtered by variant, tabs/links to the other inventory pages.
  Real Arabic strings, `<Bdi>` for SKUs/names, logical classes, usable at 375px.
  Accept: e2e (owner-session) loads `/ar/admin/inventory` and `/en/admin/inventory`, sees seeded SKU `DC-FRN-001` with
  numbers matching `getAvailability`; `messages.test` + `no-literals.test` green.
  Evidence: `npx playwright test tests/e2e/inventory/levels.spec.ts` → 4 passed (ar+en, DC-FRN-001 available = /api/inventory/availability, 375px no sideways scroll, low filter); vitest src/lib/i18n 37 passed. Shared `_components/InventoryNav.tsx` (section tabs + PageHeader) for INV-10..12.

- [x] **INV-10 Admin ledger page** — FR-INV-003 | `app/[locale]/admin/inventory/ledger/page.tsx`, `tests/e2e/inventory/ledger.spec.ts`
  Filters variant, location, reason, date range (business days Asia/Jerusalem), paginated newest first; columns time,
  variant, location, signed delta, reason label, note, actor, reference. Read-only (no edit/delete affordance).
  Accept: e2e — filter by reason `adjustment` shows the seed opening movements; date filter works in ar/en.
  Evidence: `npx playwright test tests/e2e/inventory/ledger.spec.ts` → 3 passed (ar+en reason/SKU/date filters, no table buttons, 375px); listMovements gained `sku` filter.

- [x] **INV-11 Admin adjust + transfer forms** — FR-INV-006, 007 | `app/[locale]/admin/inventory/adjust/**`, `.../transfer/**`, `tests/e2e/inventory/adjust-transfer.spec.ts`
  Server actions via `staffAction("inventory.write", …)`; reason select + mandatory note; transfer from/to selects
  (different), qty; field-level errors (localised) for invalid_input/conflict; success toast + redirect to ledger.
  Accept: e2e — submit without note shows the error, valid adjustment +2 appears in the ledger and levels; transfer
  STORE→HOME 1 writes two rows; 375px screenshot shows no horizontal scroll.
  Evidence: `npx playwright test tests/e2e/inventory/adjust-transfer.spec.ts` → 5 passed (ar note error + values kept, +2 in ledger + levels, en over-removal conflict on qty, transfer same-location error then 2 paired rows, 375px both forms). Actions in `admin/inventory/actions.ts`; levels rows link to adjust.

- [x] **INV-12 Admin back-in-stock list** — FR-INV-008 | `app/[locale]/admin/inventory/back-in-stock/page.tsx`, `tests/e2e/inventory/back-in-stock.spec.ts`
  Open / notified / cancelled requests per variant (contact masked, `inventory.read`), cancel action (`inventory.write`).
  Accept: e2e — request created via the API shows as open; after an adjustment it shows notified.
  Evidence: `npx playwright test tests/e2e/inventory/back-in-stock.spec.ts` → 3 passed (API 201 → open + masked contact, +1 adjust → notified, ar cancel → cancelled, 375px). Staff cancel now audited (`inventory.back_in_stock.cancel`); e2e helper `tests/e2e/inventory/db.ts#sellOut`.

- [x] **PUR-01 Purchasing module + suppliers service** — FR-PUR-001 | `modules/purchasing/{index,types,service}.ts`, `suppliers.int.test.ts`
  `listSuppliers`, `getSupplier`, `saveSupplier` (zod: name, contactName, phone E.164, email, address, paymentTerms,
  leadTimeDays ≥ 0, notes, isActive) audited via `auditedMutation`. Accept: int test create → edit → list.
  Evidence: `npx vitest run --project integration src/modules/purchasing/suppliers.int.test.ts` → 2 passed (create/edit/list/search, audit create+update with diff, phone → +970…, field errors, not_found). Service in `purchasing/suppliers.ts`.

- [x] **PUR-02 Purchase order lifecycle** — FR-PUR-002 | `modules/purchasing/po-state.ts`, `service.ts`, `po-state.test.ts`, `po.int.test.ts`
  Table: draft→issued, draft→cancelled, issued→cancelled, issued→partially_received, issued→received,
  partially_received→received (receipt-driven only); everything else `invalid_transition`. `createPurchaseOrder`
  (code `PO-<yyyy>-<nnn>` under an advisory lock), `updateDraft` (lines, expected unit cost Owner-only), `issuePurchaseOrder`,
  `cancelPurchaseOrder` (not after any receipt), `getPurchaseOrder(id, { includeCost })`, `listPurchaseOrders({ status? })`.
  Accept: unit test enumerates every (from,to) pair; int test walks all five states, illegal ones refused.
  Evidence: `npx vitest run src/modules/purchasing/po-state.test.ts` → 27 passed (25 pairs × both triggers); po.int.test.ts 4 passed (PO-<yyyy>-<nnn> per Jerusalem year, draft→issued→partial→received, draft/issued→cancelled, receipt-after-cancel/cancel-after-receipt refused, Staff edit keeps cost, audit trail). `cancelPurchaseOrder(id, reason?, ctx?)`, opts `{ includeCost }` is the 2nd/3rd arg.

- [x] **PUR-03 Partial receipts + landed unit cost** — FR-PUR-003, 004, FR-ORD-022 | `modules/purchasing/service.ts`, `inventory/service.ts` (export `receivePurchaseStock`), `receipts.int.test.ts`
  `receivePurchaseOrder(poId, { locationCode, lines[{ poLineId, qty, unitCost? }], notes? }, ctx)`: one tx — po_receipts +
  lines, `purchase_receipt` movements for received qty only, `qty_received` updated, over-receipt refused, status →
  partially_received / received; after commit → `resumeBackorders` + back-in-stock notify. Cost only in DTOs when
  `includeCost` (callers pass `can(staff, "inventory.cost.read")`). Accept: int test — receive 3 of 10 → one +3 movement,
  PARTIALLY_RECEIVED; receive 7 → RECEIVED; cost hidden without includeCost; a backordered order resumes.
  Evidence: receipts.int.test.ts 2 passed (3/10 → one +3 purchase_receipt movement, over-receipt conflict remaining 7, 7 → received, Staff cost not stored/returned, Owner sees 1200/1350; receipt +2 → shortfall 0, order PROCESSING). Inventory export `receivePurchaseStock({ receiptId, locationCode, lines, note?, deferFollowUps? })` idempotent per receipt.

- [x] **PUR-04 Admin suppliers pages** — FR-PUR-001 | `app/[locale]/admin/purchasing/suppliers/**`, `tests/e2e/inventory/suppliers.spec.ts`
  List + create + edit (`purchasing.read` / `purchasing.write`), lead time shown. Accept: e2e create + edit a supplier (ar).
  Evidence: `npx playwright test tests/e2e/inventory/suppliers.spec.ts --workers=1` → 2 passed (ar create with phone error then save, search, edit lead 7→12; en lead-time column; 375px no sideways scroll); admin-entrypoints int 5 passed, i18n tests green. `/admin/purchasing` redirects to orders; shared `purchasing/_components/PurchasingNav.tsx`, actions in `admin/purchasing/actions.ts`.

- [x] **PUR-05 Admin purchase order pages** — FR-PUR-002..004 | `app/[locale]/admin/purchasing/orders/**`, `tests/e2e/inventory/purchase-orders.spec.ts`
  List (status filter), new draft (supplier, destination, expected date, lines), detail with Issue / Cancel / Receive
  (receipt form: qty per line + unit cost field rendered only with `inventory.cost.read`), receipt history.
  Accept: e2e (Owner) draft → issue → receive part → receive rest, status badges update, ledger shows movements; a
  page-level check that the cost column is absent for a Staff viewer (render test or staff e2e).
  Evidence: `npx playwright test tests/e2e/inventory/purchase-orders.spec.ts --workers=1` → 3 passed (en Owner draft→issue→3/10 partial→over-receipt error "Only 7"→7 received, badges, 2 receipts with landed cost, DB purchase_receipt deltas [3,7], ledger rows, list filter; ar cancel via dialog + destination-required error + 375px; Staff: no cost field/column); tsc 0, eslint clean, i18n 41 passed, admin-entrypoints 5 passed. Draft edit page `orders/[id]/edit`; Staff fixture `tests/e2e/inventory/staff-session.ts`.

- [x] **INV-13 Seed + demo data** — all | `modules/inventory/seed.ts`, `modules/purchasing/seed.ts` (called from inventory seed)
  Insert-if-missing: one issued PO partially received, one low-stock variant (on hand ≤ threshold), one open
  back-in-stock request on a sold-out variant (if any). Accept: `npm run db:reset` twice without error; pages show data.
  Evidence: db:reset → db:seed → db:reset all clean; DB shows PO-2026-001 partially_received (8/20 DC-FRN-001, receipt + purchase_receipt movement), every level on_hand = Σ ledger with on-hand unchanged (opening opened 8 lower), DC-FAM-001 HOME 3 ≤ threshold 3 (low); no sold-out variant at seed → no demo back-in-stock request. Int purchasing+inventory 11 files / 39 passed (po code test now relative). Seed uses plain inserts (`purchasing/seed.ts`): the service chain imports `server-only` which tsx cannot load.

- [x] **INV-14 Contract docs, pins, full verify (leader validation)** — all | `.orchestration/CONTRACTS.md` (inventory section), `CHANGE-REQUESTS.md`
  Update CONTRACTS.md inventory section + purchasing; CR to platform to pin new exports in `modules/contracts.test.ts`;
  `git grep -n "STUB(contracts)" web/src/modules/inventory` empty. Accept: `npm run verify` green (background, poll
  log) and `npx playwright test tests/e2e/inventory` green on :3004; leader browser walk-through ar + en + 375px.
  Evidence (37fe755, 2b06a17): `npm run verify` → EXIT 0 (typecheck, eslint, 77 files / 840 tests); `npx playwright test tests/e2e/inventory --workers=1` → 20 passed (after fixing a cancel-then-navigate race in back-in-stock.spec); STUB(contracts) grep empty; CONTRACTS.md inventory + new purchasing section; CR 2026-09-27 19:08 to platform (manifest pins), nav CR 09:00 still open; team-local pins in `purchasing/contract.test.ts`; purchasing index now explicit re-exports (no `export *`). Leader walk-through still to do.
  Leader validation (2026-09-27 23:15, @2b06a17): `npm run verify` EXIT 0 (77 files / 840 tests); inventory e2e 20 passed;
  walk-through of 10 pages × ar/en × 1280/375 → all 200, h1 visible, 0 page overflow, rtl/ltr correct, 0 console errors,
  Arabic UI strings complete (Latin text only in data: names, notes, emails). Two polish notes → BACKLOG.
