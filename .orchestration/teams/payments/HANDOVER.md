# Handover — payments — worker — relay #10
Updated: 2026-10-01T10:03:00+03:00   Branch/HEAD: team/payments @ 9f59f45
## Task
Phase 1 PAYMENTS: all tasks PAY-00..PAY-19 (+PAY-B1) are done. This relay did the final validation (PAY-19).
## State
- Done: PAY-19 (evidence line in TASKS.md): typecheck + eslint clean; vitest 901/904 (3 only cold-import 5 s timeouts, pass with
  --testTimeout=120000); playwright payments 16 passed in parallel, the other 3 specs pass with --workers=1; admin pages walked ar+en by specs.
- In progress: nothing. Worktree is clean (no code changes this relay; only TASKS.md / BACKLOG.md / this file in ROOT/.orchestration).
- Broken/known issues: none. Dev server on 3005 stopped. The DB on 54325 was already running when I arrived (not started by me) and was left running.
## Next move
Nothing for this team: leader review / integration. Integration notes: payments shims (payments.refund for remittances, owner lookup)
wait on CRs; invoice/credit-note PDFs need Chromium (BACKLOG).
## Gotchas
- /tmp-style log files like Temp/dev.log are SHARED with other teams' workers; use a `pay-` prefix for logs.
- Run e2e payments with --workers=1; never run tsc/next typegen while the dev server runs; foreground commands >600 s are killed.
- test DB setup (global-setup-db) once failed with "order_events does not exist" while the dev DB scripts ran; a rerun was fine.
