# Leader log — team ORDERS

## Plan rationale (relay #0, 2026-09-27)
- The foundation already gives us a lot: full schema for orders/lines/events/notes/idempotency/shipments/outcomes/
  returns/zones, Appendix A tables in `state-machine.ts`, a thin-but-real `placeOrder`, `transition` (state + event
  only), reads, `estimateDelivery`, 16 seeded zones, `DC-XXXX-XXXX` references. The work is: side effects, the
  back-office flows, delivery intake, and admin UI. No demo orders are seeded yet (FR-ORD-004 needs a seeded set).
- Order: engine first (ORD-01..06, int-tested with other modules spied/stubbed), then admin list/detail (07/08) so the
  app is visibly useful early, seed (09), fulfilment (10/11), courier CSV (12), delivery intake (13..15), returns (16),
  customer API + contract additions (17), zones/origins admin (18), e2e close-out (19).
- Partial dispatch (FR-ORD-005, S) and UI-005 are in scope (brief says so) although they are #5/#6 on the SRS descope list.
- Cross-team dependencies are all through contracts that are stubs in our branch (inventory commitDispatch/restore/
  writeOff/recordShortfall, payments refund/issueInvoiceIfDue, engagement texts). We call them anyway and assert the
  calls with spies; `payments.refund` `not_implemented` is caught and recorded (`refund_required`), never fails a move.
- Layout: back-office internals in `modules/orders/admin/*` and `modules/orders/delivery/*`, `orders` namespace only
  (DECISIONS 2026-09-27). Nav hrefs point outside our paths → CHANGE-REQUEST to platform (OPEN).

## Risks
- Contract change for the customer view (`getCustomerOrder`) touches `contracts.test.ts` (platform file) — allowed by the
  contract-change rule; keep it in one commit with CONTRACTS.md.
- Notices for backorder/resume/cancel/lapse need new engagement events → SHIM(orders) via `core.sendMessage` until
  engagement merges the CR; remove the shim at integration.
- Machine load: 9 teams install/run in parallel; `npm ci` took >20 min, int tests and dev compiles will be slow — workers
  must run `verify` in the background and poll.
- `delivery_outcomes` outcome enum lacks `returned`; ORD-02 adds it (drizzle push on an enum add is fine).

## How I validate each batch
- Re-run the task's acceptance command myself (tsc, the named vitest files, `npm run verify` at milestones 06/12/19).
- For UI tasks: load the page on :3003 with the owner session at 1280 and 375, check Arabic default + English, no
  horizontal scroll, no literal strings; read the e2e spec for real assertions (not just "page loads").
- Spot-check journaling: every mutation writes an order event with actor + before/after.
- Verdicts are logged below.

## Review log
- relay #0: plan written; environment set up (see HANDOVER for evidence).
