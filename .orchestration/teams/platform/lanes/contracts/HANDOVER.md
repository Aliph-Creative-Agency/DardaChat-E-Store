# Handover — platform/contracts (W4) — leader — relay #2 (resumed)
Updated: 2026-09-27T03:22:39+03:00   Branch/HEAD: platform/contracts @ 59356d7
## Task
Lane W4 "contracts" of Phase 0: platform services + a typed `index.ts` contract with working stubs per module,
documented in `ROOT/.orchestration/CONTRACTS.md`. TASKS.md PLC-01..PLC-14. **All 14 done and leader-validated. Lane = team_done.**
## State
- Done: PLC-01..14 (evidence in TASKS.md; leader review in LEADER.md). Re-checked after the resume: tsc + lint ok,
  vitest 503/503 three runs in a row, worktree clean, DB stopped (clean `db:stop`), nothing on 3012/54332.
- In progress: nothing.
- Broken/known issues: none. After the resume, the data dir needed ~22 min of crash-recovery fsync because the DB had been
  stopped with `-m immediate`. One test run on the just-recovered cold DB had 1 failure; the next 3 runs were green.
## Next move (for the platform leader at merge)
1. Merge `platform/contracts` into main. Likely conflict spots: `web/package.json` (we add only `"jobs": "tsx scripts/jobs.ts"`),
   `web/.env.example` (`JOBS_MODE`), `web/.gitignore` (`/storage/`), `web/src/instrumentation.ts` (scheduler start),
   `src/modules/contracts.test.ts` (the auth lane may add an `auth` entry, so keep both).
2. Check that engagement `upsertCustomer` (guests: name/phone/email) and the auth lane's account writes don't both create
   a customer for the same phone/email (both match on the unique indexes).
3. After the merge, re-run `npm run verify` + `npx playwright test` on main, and point FOUNDATION-NOTES at CONTRACTS.md "Stubs left for Phase 1".
## Gotchas
- Integration tests: `beforeAll(() => resetAndSeed(db))`. Never run int tests while `npm run verify` runs (both reset `dardachat_test`).
- drizzle correlated subqueries: write the outer table's column qualified (`"orders"."id"`) inside `sql`.
- COD cap (100 000 agorot) applies in placeOrder, so use `paymentMethod: "card"` to test big quantities.
- Leftover dev server on 3012: `netstat -ano | grep :3012`, `taskkill //PID <pid> //T //F`.
- Prefer `npm run db:stop`. Use `pg_ctl stop -m immediate` only as a last resort: the next start runs a very long fsync
  recovery (`db:start` reports failure after 60 s while postgres keeps recovering, so watch `.pgdata/log` for "ready to accept connections").
