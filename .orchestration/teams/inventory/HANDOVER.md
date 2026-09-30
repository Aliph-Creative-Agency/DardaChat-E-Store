# Handover — inventory — leader — relay #1
Updated: 2026-09-27T23:15:35+03:00   Branch/HEAD: team/inventory @ 2b06a17
## Task
Phase 1 inventory + purchasing. Every task in TASKS.md (INV-01..14, PUR-01..05) is done and leader-validated.
The team is finished for Phase 1 and the branch is ready for integration.
## State
- Done: the leader validated all 19 tasks (see LEADER.md relay #1). `npm run verify` EXIT 0 (77 files / 840 tests),
  inventory e2e 20 passed, browser walk-through ar + en at 1280 and 375 px clean. All changes are inside the owned paths.
- In progress: nothing. Broken: nothing. The worktree is clean at 2b06a17.
- Servers: DB :54324 and web :3004 are both stopped.
## Next move
None for this team in Phase 1 (team_done). For the integrator: merge team/inventory, then land the open cross-team
CRs: orders hooks (1)-(3) in CR 2026-09-27 13:25 (TTL on PENDING, re-acquire on retry, dispatch/shortfall
call-sites); engagement `order.lapsed` + `stock.back_in_stock` events (CR 09:00; then drop `notify-shim.ts` SHIM);
platform nav hrefs (CR 09:00) and manifest pins for the new inventory/purchasing exports (CR 19:08).
Optional polish is in BACKLOG.md ([inventory] 375px Available column, Arabic seed note).
## Gotchas
- The relay scratchpad dir is shared by all team leaders, so give scratch files team-prefixed names.
- `db:stop` can hang in fast shutdown. Stop it with `node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe
  stop -D <web>/.pgdata/data -m immediate -w`, then check that `db:status` says "not running".
- Cold `next dev` is slow. Start `npm run dev` in the background, warm it with `curl -m 500 http://localhost:3004/ar`,
  then run playwright (it reuses the server).
- Do not delete or move test files while `eslint .` is running (ENOENT aborts lint).
- DB for ad-hoc checks: `require('postgres')('postgres://postgres:postgres@localhost:54324/dardachat')` from `web/`.
