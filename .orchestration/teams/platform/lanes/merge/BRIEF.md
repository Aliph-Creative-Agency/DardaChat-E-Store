# Lane `merge` — team PLATFORM — Phase 0, final step

Parent brief: `ROOT/.orchestration/teams/platform/BRIEF.md` ("Leader duties (phase 0)" is authoritative).
Written by the merge-lane leader (relay #0) from the orchestrator's launch prompt, because no lane brief existed.

- **Working dir:** `D:/Personal/Projects/DardaChat-E-store` (ROOT), app in `ROOT/web`. **Branch `main`** (no worktree).
- **Ports:** Postgres **54320**, web **3000**. DB names `dardachat` (dev), `dardachat_test` (vitest).
- **Owns:** everything under `ROOT/web/` (Phase 0 platform ownership), plus `ROOT/.orchestration/FOUNDATION-NOTES.md`,
  `ROOT/.orchestration/CONTRACTS.md`, and appends to `DECISIONS.md` / `BACKLOG.md` / `CHANGE-REQUESTS.md` (mark DONE).
  Never touch `ROOT/docs/`. `.orchestration/` stays untracked in git (orchestrator's choice) — do not commit it.
- **Inputs:** lanes core/auth/shell/contracts are DONE. Read their `HANDOVER.md` "merge notes" sections
  (`ROOT/.orchestration/teams/platform/lanes/{auth,shell,contracts}/HANDOVER.md`) and the OPEN items in `CHANGE-REQUESTS.md`.
- **SRS:** only as a task needs it (FR-ACC-*, UI-001..006, CI-003/004, FR-DAT-006). PLAN.md §1–§2 for stack/layout.

## Scope
1. Merge `platform/contracts`, `platform/auth`, `platform/shell` into `main` (non-fast-forward merge commits), resolving
   conflicts so both sides' intent survives. (Pre-check 2026-09-27: the three branches touch disjoint file sets
   vs merge-base 827abc4 — expect no textual conflicts; the real work is the semantic seams below.)
2. Wire the seams each lane left as `SHIM(platform-merge)` / stubs: auth OTP delivery → core `sendMessage`; auth UI
   strings → next-intl; auth links → `@/lib/i18n/navigation`; shell viewer/subject → auth `getCurrentStaff`/`can()`/
   `getCurrentCustomer`; one locale-preference implementation; admin pages guarded (`requireStaff`) for the walker;
   admin-nav permission keys checked against auth's real registry; auth pages rendered inside the shell layouts
   without double chrome; contracts manifest test includes auth; customer creation dedupe (auth vs engagement).
3. Apply OPEN change requests addressed to the platform leader (vitest `inline: ["next-intl"]`; Playwright cold-start).
4. Re-validate from clean: `npm ci`, `db:reset`/`db:setup`/`db:seed`, typecheck, lint, all vitest, all Playwright e2e,
   dev server renders `/ar` + `/en` storefront and the admin (sign in as seeded Owner incl. TOTP 2FA), `/dev/outbox`.
5. `git tag foundation-v1`; `ROOT/.orchestration/FOUNDATION-NOTES.md` (≤ 80 lines); `CONTRACTS.md` accurate;
   `git worktree remove` the three platform worktrees (keep branches).
