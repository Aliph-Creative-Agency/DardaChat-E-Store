# Handover — platform/core (W1) — leader — relay #4
Updated: 2026-09-26T20:20:53+03:00   Branch/HEAD: main @ 827abc4
## Task
Lane W1 "core" of Phase 0: scaffold `ROOT/web`, embedded-Postgres dev/test DBs, full Drizzle schema, append-only +
journal triggers, libs, state machines, seed, test harness, README (PLA-01..PLA-19 + PLA-18a).
## State
- Done: every task in TASKS.md is [x] and leader-validated (LEADER.md relay #3 for PLA-01..18, relay #4 for 18a/19
  plus a full clean run from empty node_modules and .pgdata: verify 415 pass, e2e 3 pass, dev /ar rtl /en ltr).
- In progress: nothing. DB stopped, no dev server running.
- Broken/known issues: none. Deferrals (Gaza zones inactive/COD off etc.) are in ROOT/.orchestration/BACKLOG.md.
## Next move
Lane W1 is team_done. Nothing for a successor in this lane. Downstream lanes/teams start from `web/README.md`
"First run" and build on the module contracts in `web/src/modules/<m>/index.ts`.
## Gotchas
- `npm ci` ~2.5 min; npm 11.16 allow-scripts warning for 9 packages is informational (db:start etc. still work).
- `db:setup` hides drizzle-kit output; to confirm no schema churn run `npx drizzle-kit push --force` → "No changes detected".
- Append-only refusals: SQLSTATE `DCA01`, constraint `<table>_append_only`. `truncateAll()` uses `dardachat.test_reset`.
- Arabic-Indic digit scans: use node `/[\u0660-\u0669]/`, not rg/grep ranges under Git Bash.
- Stop the dev server on Windows by killing the PID listening on 3000 (`taskkill /T /F`), then `npm run db:stop`.
