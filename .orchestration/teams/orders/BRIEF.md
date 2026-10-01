# Team ORDERS — Phase 1
**Working dir:** `D:/Personal/Projects/DardaChat-wt/orders` (branch `team/orders`). DB 54323, web 3003.
**Owns:** `web/src/modules/orders/**` (keep `state-machine.ts` tables faithful to Appendix A; if you find them wrong, fix
and note it in DECISIONS.md), `web/src/modules/delivery/**`, `web/src/app/[locale]/admin/orders/**`,
`web/src/app/[locale]/admin/delivery/**`, `web/src/app/api/orders/**`, `web/messages/*/orders.json`,
`web/messages/*/delivery.json`, `web/tests/e2e/orders/**`.
**SRS:** §4.6 FR-ORD-001..017, 021, 022, 026, 027; FR-CRT-008; §4.5 FR-ADR-006..009; Appendix A (A.1/A.2 fulfilment side;
call the payments contract for A.3/A.4 side effects); FR-DAT-006 journaling; CON-10.

**Build:** `placeOrder` (idempotent via client key, reserves stock via inventory contract, assigns origin by configurable
rule, human-communicable non-sequential reference e.g. Crockford base32 without ambiguous chars); fulfilment transition
engine enforcing Appendix A with OrderEvent history (actor, before/after) and side-effect hooks (inventory, payments
invoice/refund, engagement notify); admin order list filterable by fulfilment state, payment state, period, origin,
customer; order detail with timeline, internal notes (never customer-visible), address/recipient/phone correction before
dispatch (journaled), origin override before picking; pick/pack/dispatch flow usable at 375px (UI-005) incl. shortfall at
picking → BACKORDERED and auto-resume (FR-ORD-021/022), partial dispatch/multiple consignments, dispatch reference per
shipment; courier CSV export with column set configurable in admin (no code change); delivery outcome entry per
consignment (delivered/failed/refused/returned) + awaiting-outcome list; failed-delivery reasons (configurable),
redelivery or cancel; ageing list + lost-in-transit write-off; returns with reason codes (stock restored on receipt only);
cancellation rules; delivery zones (governorate/locality, flat rate, COD eligibility, estimate window) and origins admin;
`estimateDelivery` for storefront/assistant; customer order view API (own orders only, not-found otherwise).
