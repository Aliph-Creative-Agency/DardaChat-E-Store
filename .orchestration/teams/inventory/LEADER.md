# Leader log — inventory — Phase 1

## Plan rationale (relay #0, 2026-09-27)
- Services before screens: INV-02..08 build and prove the ledger, holds, dispatch/returns, shortfall/backorder resume,
  adjust/transfer, TTL sweep and back-in-stock with int tests against the worktree DB (other modules stay stubs; orders'
  `placeOrder`/`transition`/`getOrder` are real-thin, enough to create orders and drive states in tests).
  Screens (INV-09..12, PUR-04/05) come after, each with an e2e spec using the `owner-session` fixture.
- One writer path: every stock change goes through `ledger.ts#applyMovements` (lock → level upsert → movement insert),
  so FR-INV-003 (ledger for every change) and the Σ delta = on_hand invariant hold by construction; positive movements
  fan out to `resumeBackorders` + back-in-stock notify AFTER the stock tx commits.
- Reserved stays derived from `reservations` (Phase 0 design) — no second counter to drift; row locks on stock_levels
  serialise claims (FR-INV-005 proof in INV-03).
- Purchasing = separate module folder, tables stay in inventory schema; strings in `inventory.json` `purchasing.*`
  (namespace list is platform-owned).
- Cross-team asks filed 2026-09-27: nav hrefs (platform), `order.lapsed` + `stock.back_in_stock` events (engagement,
  shimmed via core.sendMessage), orders call-sites for TTL/re-acquire/dispatch/shortfall (orders). Decisions in DECISIONS.md.

## Risks
- Import cycle orders ↔ inventory (orders/service imports inventory; our sweep/backorders need orders) → lazy
  `await import("@/modules/orders")` inside functions; watch for vitest/Next init-order errors.
- 50-way concurrency test vs pool size (postgres driver `max`) — test must use enough connections or run reserve calls
  on a dedicated client with max ≥ 50; otherwise it silently serialises and proves nothing (check timings/overlap).
- Orders-side stubs: `transition` has no side effects in our branch, so we test inventory effects by calling our own
  functions next to it; true end-to-end wiring is Integration's job (CR filed to orders).
- Cost visibility (FR-PUR-004): must be enforced server-side (DTO strips cost), not only hidden in UI.
- Shared dev DB accumulates e2e rows; e2e specs must create their own data and not assert global counts.

## How I validate each batch
- `npx tsc --noEmit`, the task's int/unit tests, `git grep STUB(contracts)` shrinking as expected.
- UI: dev server on :3004 (background), load pages in ar + en and 375px, check no English leaks in ar, `<Bdi>` on data.
- Read the diff for: ledger writes outside `applyMovements`, missing `requireStaff`/`staffAction`, cost leaks, floats.
- End: `npm run verify` + `npx playwright test tests/e2e/inventory` (INV-14).

## Review log
- relay #0 (planning): environment set up, TASKS.md written (19 tasks), CRs/decisions/backlog filed.
- relay #1 (2026-09-27 23:15, validating INV-01..14 + PUR-01..05 @ 2b06a17). VERDICT: all 19 accepted, team_done.
  - Ownership: `git diff --name-only foundation-v1..HEAD` (17 commits, 67 files) lies entirely inside the owned paths.
  - `npm run verify` EXIT 0: typecheck, eslint, 77 files / 840 tests (incl. the 50-way FR-INV-005 proof, ledger
    immutability, sweep/COD, re-acquire, backorder resume, PO state table, receipts + cost visibility).
  - `npx playwright test tests/e2e/inventory --workers=1`: 20 passed on :3004.
  - Walk-through (own Playwright script, Owner session): levels, ledger, adjust, transfer, back-in-stock, PO list/new/
    detail, suppliers list/new, in ar + en at 1280 and 375 px → 40 page loads, all 200, 0 page-level overflow, correct
    dir, 0 console errors. Screens are clean and consistent with the admin shell; Arabic copy is real Arabic.
  - Code spot checks: only `ledger.ts#applyMovements` writes movements (seeds insert directly, documented);
    every admin page calls `requireStaff`; actions use `staffAction`; cost gated by `can(…, "inventory.cost.read")`
    server-side before the DTO is built; adjust/transfer demand a staff actor, reason code and note.
  - Minor, not blocking (→ BACKLOG): at 375 px the levels table scrolls inside its card so Available needs a swipe;
    seed note "Opening stock (seed)" is English in the Arabic ledger.
  - Still open elsewhere (integration, not this team's work): orders hooks CR 13:25, engagement events CR 09:00
    (notify SHIM stays), platform nav + manifest pins CRs 09:00 / 19:08.
  - Env: the relay scratchpad is SHARED with other leaders — use team-prefixed file names (a shared `verify.log` got
    another team's output). `db:stop` hung in fast shutdown; `pg_ctl stop -m immediate` (node_modules/@embedded-postgres/
    windows-x64/native/bin/pg_ctl.exe) stopped it. DB and dev server are stopped.
