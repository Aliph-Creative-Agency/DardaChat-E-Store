# Team INVENTORY — Phase 1
**Working dir:** `D:/Personal/Projects/DardaChat-wt/inventory` (branch `team/inventory`). DB 54324, web 3004.
**Owns:** `web/src/modules/inventory/**`, `web/src/modules/purchasing/**`, `web/src/app/[locale]/admin/inventory/**`,
`web/src/app/[locale]/admin/purchasing/**`, `web/src/app/api/inventory/**`, `web/src/app/api/purchasing/**`,
`web/messages/*/inventory.json`, `web/messages/*/purchasing.json`, `web/tests/e2e/inventory/**`.
**SRS:** §4.8 FR-INV-001..011, §4.9 FR-PUR-001..004, §5.2 StockMovement, FR-DAT-006, CON-09, Appendix A stock effects.

**Build:** stock per variant per location; On Hand / Reserved / Available; append-only ledger (every change: reason code,
actor, reference); reservation primitives for ORDERS (`reserve`, `release`, `commitDispatch`, `restoreOnReceipt`,
`writeOff`, `recordShortfall`, `getAvailability`) that are **concurrency-safe** (row locks / conditional updates) — prove
FR-INV-005 with a test firing 50 concurrent reservations at 1 unit → exactly 1 wins; reservation TTL for PENDING orders +
sweep job every ≤5 min (cancels via orders contract, notifies) — COD untouched; re-acquire on payment retry (FR-INV-010);
shortfall carried on the line, Reserved reduced to what is held; manual adjustment with mandatory reason + role check;
two-sided transfers between locations; back-in-stock requests + notification on restock (transactional, via engagement
`notify`); admin stock screens (levels, ledger with filters, adjust, transfer). Purchasing: suppliers (contacts, terms,
lead time), purchase orders Draft→Issued→Partially Received→Received / Cancelled with illegal transitions refused,
partial receipt creating movements for received qty only, unit cost per received line (Owner-only visibility); receipts
and adjustments that clear a backorder shortfall must trigger the orders contract so the order resumes (FR-ORD-022).
