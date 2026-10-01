# Handover — orders — worker — relay #8 (final)
Updated: 2026-10-01T09:35:00+03:00   Branch/HEAD: team/orders @ 5fbedea
## Task
Phase 1 ORDERS worker. Every task ORD-00..ORD-19 is now done and ticked in TASKS.md. Nothing is open.
## State
- Done this relay: ORD-19 (5fbedea). `tests/e2e/orders/journeys.spec.ts` has 4 serial journeys (COD release→pick→2 consignments→
  courier CSV→delivered→completion job→COMPLETED; prepaid lapse via `expireReservations`; backorder at picking→stock in→
  `resumeBackorderedOrders`→PROCESSING; refused→received back→cancel). `tests/e2e/orders/db.ts` gained `db`, `setFreeStock`,
  keeps SKUs stocked, and `closeDb` is a no-op (several spec files share one pool in one worker).
- Evidence: `npx playwright test tests/e2e/orders --workers=1` 21 passed on :3003; typecheck + eslint clean; unit 33 files / 682
  green (`--testTimeout 90000`); integration 51 files / 274 green (`--testTimeout 120000`, single run). `git grep STUB(contracts)
  web/src/modules/orders` empty; CONTRACTS.md orders rows say DONE; DECISIONS.md has the ORD-18 entry.
- Broken/known issues: none. `npm run verify` as-is (5 s default timeouts) gives random timeouts on this loaded machine
  (contracts/no-literals/navigation-load tests); the same tests pass with a larger `--testTimeout`. Not a code defect.
- Dev server stopped; DB on 54323 stopped (the postmaster hung on shutdown, so I killed it; `npm run db:start` recovers it).
- Tree is clean on team/orders; `.orchestration/` is untracked (plain file edits).
## Next move
Leader review of the whole branch and merge at integration. Integration notes: payments' packing-slip PDF route can replace our
slip link (BACKLOG); orders nav hrefs CHANGE-REQUEST to platform; engagement notice keys for `order.*` are still shimmed in
`modules/orders/notify.ts` (CHANGE-REQUEST filed).
## Gotchas
- A parallel full e2e run on a cold dev server times out on first compiles (60 s); warm the pages (or rerun with `--workers=1`).
- Turbopack cache panic once ("Restore of Data ... failed"): `rm -rf web/.next` and restart the dev server.
- The dev server also runs the in-process jobs runner (expiry job moved rows while specs ran); journeys call the job functions
  directly and only assert on their own orders.
- Stop dev server: `netstat -ano | grep ":3003 "` then `taskkill //T //F //PID <pid>`.
