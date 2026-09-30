# Leader log — platform/core (W1)

## Plan rationale (relay #0, 2026-09-26)
- 19 small tasks in 5 groups: A environment (PLA-01..05) → B pure libs (06..08) → C schema by module family (09..14)
  → D DB guarantees (15..16) → E seed + README clean run (17..19). The app renders and the test harness exists by
  PLA-05, so every later task is verified by `npm run verify` plus its own targeted test.
- Pure logic (money/VAT, state machines) comes before schema so the schema can import state enums from
  `state-machine.ts` and the VAT maths is settled before payments columns are named.
- Schema split per module file following the map in `BRIEF.md`; that map is the contract W4 and all Phase 1 teams use.
- Journal triggers (PLA-16) added beyond the parent brief: FR-DAT-006's acceptance ("a status change and an address
  correction each produce a journal entry with before and after") is cheapest and most reliable at the DB layer.
- Invoice/credit-note gapless numbering gets a DB function now (PLA-13) because it is the easiest thing to get wrong
  under concurrency and PAYMENTS will depend on it.

## Risks
1. embedded-postgres on Windows (beta package; detached lifetime). Mitigation: pg_ctl start; fallback PGlite+socket (PLA-03).
2. `drizzle-kit push` interactivity / enum changes across worktrees. Mitigation: `--force`, db:reset is cheap.
3. Append-only triggers vs test cleanup. Mitigation: explicit test-reset path decided in PLA-15.
4. Next 16 API drift vs agent memory. Mitigation: context7 before writing framework code.
5. Native deps (@node-rs/argon2) on Windows. Checked in PLA-02 acceptance.

## How I validate W1 (before W2/W3/W4 start)
Clean-run: stop DB, remove `web/.pgdata` and `node_modules`, `npm ci`, `db:start`, `db:setup`, `db:seed`,
`npm run verify`, `npm run test:e2e`, `npm run dev` → `/ar` (rtl) and `/en` (ltr) render. Spot-check: state-machine
row counts vs Appendix A, SRS VAT example test, append-only refusal on all 8 tables, schema tables vs BRIEF map.

## Review log
### Leader relay #3 — 2026-09-26 — validated PLA-01..PLA-18 (HEAD 050dceb)
- Ownership: `git diff --stat de79ce0..HEAD -- . ':!web'` empty → all 90 files inside `web/` (Phase 0 owns web/**). PASS.
- `npm run verify` (typecheck + lint + vitest) → 16 files / 415 tests pass. `npm run test:e2e` → 3 pass. PASS.
- `npm run db:reset` then `db:seed` again → ok, idempotent (counts unchanged). PASS.
- Dev DB spot checks (own script, rolled-back txns): users 2, roles 2, origins 2, zones 16 (11 active, 5 Gaza inactive,
  COD off, BACKLOG'd), VAT 1 row 1600bp from 2020-01-01, 5 published products with real ar/en copy, 2 seasonal
  windows (2027-01-15..03-12 covers Ramadan 2027), stock rows 10, ledger mismatch 0, supplier 1, policies 4, FAQ 7,
  about page 1, collection 1. Journal: variant price update → 1 `row.update` entry, changed column only, actor system. PASS.
- Appendix A recount from SRS v0.1: A.2 = 30 rows, A.4 = 14 rows = the asserted counts. VAT SRS example asserted
  (1517, never 12379). Append-only int test covers all 8 tables with rows present (empty-table DML is a no-op). PASS.
- Dev server :3000 → `/ar` `<html lang="ar" dir="rtl">`, `/en` ltr, `/fr` 404, `/seed/*.svg` 200 image/svg+xml. PASS
  (UI is the deliberate minimal shell; W3 owns look and feel).
- Finding (minor): seed copy uses Arabic-Indic digits (6 runs in catalog/seed-data.ts) against the Latin-digits
  decision → fix task PLA-18a added ahead of PLA-19.
- Verdict: PLA-01..PLA-18 ACCEPTED. Open: PLA-18a, PLA-19. W1 full clean-run validation still due after PLA-19.

### Leader relay #4 — 2026-09-26 — validated PLA-18a, PLA-19 + full W1 clean run (HEAD 827abc4)
- Ownership: `git diff --stat 050dceb..HEAD -- . ':!web'` empty; 2 files (web/README.md, catalog/seed-data.ts). PASS.
- PLA-18a: diff shows exactly the 6 runs → Latin (7, 10, 14, 1–3, 14). Node scan of `web/src` for [٠-٩۰-۹] → only
  `lib/money.ts` + `money.test.ts` (intentional parsing). Dev DB: 0 products with Arabic-Indic digits. PASS.
- PLA-19: README read in full — prerequisites, first run, all 17 scripts match package.json, port table matches
  PLAN.md (54320..54329 / 3000..3009), seed credentials, conventions, gotchas. PASS.
- Full clean run (own, per the W1 plan): db:stop, rm -rf node_modules + .pgdata, `npm ci` ok (allow-scripts warning
  only), db:start (initdb + 2 DBs), db:setup x2 (then `drizzle-kit push --force` → "No changes detected"), db:seed x2
  ok (existing SEED_* passwords in .env.local reused), `npm run verify` → 16 files / 415 tests, `test:e2e` → 3 pass.
  Dev server :3000: /ar rtl, /en ltr, /fr 404, / → 307 /ar, /seed/*.svg 200 image/svg+xml. Spot DB: 2 staff users,
  5 published products, 10 stock rows, 7 FAQ. PASS.
- Servers stopped (no listeners on 3000/54320). Tree clean apart from untracked `.orchestration/`.
- Verdict: PLA-18a and PLA-19 ACCEPTED. All of PLA-01..PLA-19 (+18a) validated. Lane W1 core is DONE.
