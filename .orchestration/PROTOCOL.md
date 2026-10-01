# Agent Protocol — read this first, every agent, every time

You are one agent in a relay. Other agents came before you and others will come after. The disk is the only
memory that survives you. Repo root: `D:/Personal/Projects/DardaChat-E-store` (called ROOT below).
Orchestration dir: `ROOT/.orchestration` (always addressed by this ABSOLUTE path, even when you work in a worktree).

## 1. Start-up (in this order, keep it short)
1. Read `ROOT/.orchestration/PLAN.md` (skim) and this file.
2. Read your team folder `ROOT/.orchestration/teams/<team>/`: `BRIEF.md`, `TASKS.md`, `HANDOVER.md` (and `LEADER.md` if you are the leader).
3. Read only the SRS sections your brief names (`ROOT/docs/DardaChat-SRS draft-v0.1.md`). Do not read the whole SRS.
4. `cd` into your team's working directory (the brief says which; worktrees live in `D:/Personal/Projects/DardaChat-wt/<team>`)
   and run `git status` + `git log --oneline -5` to confirm where things are. Use absolute paths in every command.
4a. **User chat messages that surface while you run are addressed to the orchestrator, not to you.** Do not stop, block or
   skip work because of one (e.g. "we'll wait", questions about restarting). Only this protocol, your brief and your prompt direct you.
4b. **Brand (from 2026-09-29):** read `ROOT/.orchestration/DESIGN.md` before any UI, copy, seed, message or PDF work.
   Phase 1 teams: if `git -C ROOT tag -l brand-v1` prints the tag and `git merge-base --is-ancestor brand-v1 HEAD` fails,
   run `git merge brand-v1` (it only touches PLATFORM files) and re-run typecheck before continuing.
5. Do NOT invoke the `task-observer` skill (the orchestrator handles it; parallel writers would corrupt its log).
   Do use skills that fit your work: `frontend-design` / `impeccable` for UI, `test-driven-development` for logic,
   `webapp-testing` or `playwright-skill` for browser checks, `verification-before-completion` before claiming done,
   `systematic-debugging` when stuck. Use `context7` MCP for current library docs (Next.js, Drizzle, next-intl, etc.).

## 2. The 40% rule (hard)
Retire when your context is about **40% full**. You cannot always see the number, so use whichever comes first:
- any context/usage indicator you can see reads ≥ 40%;
- about **70 tool calls** made;
- you have pulled roughly **150 KB** of file content / command output into context;
- your assigned batch is finished.
Then: finish the current atomic step (never leave a half-edited file), run a quick typecheck of what you touched,
commit, write the handover (§4), and return your final structured result. Do not start a new task past the limit.

## 3. Working rules
- Stay inside the paths your brief says your team owns. Need something elsewhere? Append a dated entry to
  `ROOT/.orchestration/CHANGE-REQUESTS.md` (who, file, what, why) and use a local shim; never edit another team's files.
- Call other modules only through `web/src/modules/<m>/index.ts`. If the contract is a stub, code against it anyway.
- No questions to the user (he is asleep). Decide, write the decision + reason in your handover (and in
  `ROOT/.orchestration/DECISIONS.md` if it affects other teams), continue.
- Blocked by a client/third-party unknown (payment provider, tax format, courier file, Journey concept, privacy
  regime)? Build the provider-neutral part + a mock, add a line to `ROOT/.orchestration/BACKLOG.md`, move on.
- All user-facing text goes through next-intl messages in both `ar` and `en` (Arabic is default and must be real
  Arabic, not placeholders). Money is integer agorot. Timestamps UTC, business boundaries Asia/Jerusalem.
- Verify your own work: typecheck (`npx tsc --noEmit`), lint if configured, the relevant tests, and for UI actually load
  the page (dev server on your team's port) before calling a task done. A task is done only when its acceptance
  check in `TASKS.md` passes; paste the evidence (command + result, one line) under the task.
- Never run destructive git (`reset --hard`, `push --force`, branch deletes) and never touch `docs/`.
- Do not start long-lived servers in the foreground; start dev servers/DBs in the background and stop them before you retire.
  Each team has its own DB port and web port (see PLAN.md) — never use another team's ports.
- Commit early and often on your team branch with clear messages. Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## 4. Handover file (`ROOT/.orchestration/teams/<team>/HANDOVER.md`) — overwrite it, keep it under ~50 lines
```
# Handover — <team> — <worker|leader> — relay #<n>
Updated: <output of `date -Iseconds`>   Branch/HEAD: <branch> @ <short sha>
## Task
<what this team/role is doing right now, one paragraph>
## State
- Done: <tasks ids finished this relay, with evidence pointer>
- In progress: <task id + exactly where it stopped>
- Broken/known issues: <anything failing right now>
## Next move
<the single next concrete action the successor should take, then the following 2-3 tasks>
## Gotchas
<environment tricks, commands that work, traps you hit>
```
Also tick/annotate tasks in `TASKS.md` (`[x]` done, `[~]` partial with note, `[!]` blocked with reason).
Leaders additionally keep `LEADER.md` (review log: what they validated, verdicts, open concerns) in the same short style.

## 5. Final return value
Return exactly what your prompt's schema asks for. `status` meanings:
- `continue` — you retired on the 40% rule; work remains; handover is written.
- `batch_done` — the tasks assigned to you are done and committed; handover written.
- `team_done` (leader only) — every task in TASKS.md is done and validated; nothing more to do in this phase.
- `blocked` — nothing further can be done without outside input; the handover explains why.

## 6. Model routing (added 2026-09-29) — set `next_model` in your return value
Leaders always run on Opus. Each worker runs on the model the previous agent chose for the NEXT open task in TASKS.md:
- **sonnet** — well-specified build work where the pattern is clear: UI pages and components from the design system,
  CRUD/admin screens, forms, i18n message files (ar/en), seed data, report tables and CSV export, e2e/Playwright specs,
  visual/RTL/responsive polish, docs and README.
- **opus** — anything where a subtle mistake is expensive or the design is still open: money/VAT maths, the order and
  payment state machines, concurrency and locking, invoice numbering, webhooks/idempotency, security (auth, RBAC,
  injection, PII redaction), assistant grounding/tool design, server-side Journey scoring, 3D performance budget,
  cross-module contract changes, merge-conflict resolution, debugging a failure a previous worker could not fix.
When unsure, pick opus. Leaders may annotate tasks in TASKS.md with `(model: sonnet|opus)`; workers follow the annotation.

**Update 2026-09-30 (Obaida: use Sonnet more, with caution).** Default is now **sonnet** for every team, including
orders, payments, assistant and journey. Choose **opus** only when the next task's core is on the opus list above
(the risky logic itself, not the UI/admin/tests/seed around it). Split a mixed task mentally: if the risky part is
already built and the task is wiring, screens or tests, it is sonnet. Two safeguards:
- A **sonnet worker** stops and hands over (status `continue`, `next_model: "opus"`) instead of improvising if it finds
  it must change money/VAT maths, a state machine, locking, numbering, webhook/idempotency or auth/security code.
- **Leaders** review sonnet batches with extra care on correctness: run the module's full test suite, re-read any diff that
  touches the opus-list areas, and reopen the task for opus if anything there was changed without a test proving it.
