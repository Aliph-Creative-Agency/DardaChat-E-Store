# Handover — platform/merge — leader — relay #2
Updated: 2026-09-27T04:58:57+03:00   Branch/HEAD: main @ 74d77d0 (tag `foundation-v1`)
## Task
Phase 0 final step: merge platform/contracts, auth, shell into main, wire seams, apply CRs, re-validate from clean,
tag `foundation-v1`, FOUNDATION-NOTES.md, CONTRACTS.md, remove worktrees. ALL DONE and leader-validated.
## State
- Done: PLM-01..12 (workers, evidence in TASKS.md), PLM-13 leader fixes (74d77d0): staff default landing -> /admin
  (Users page is Owner-only), table cells no longer split Arabic words. Leader review in LEADER.md.
- Validation at 74d77d0: npm run verify exit 0 (65 files / 774 tests); Playwright 95/95; Arabic Owner sign-in + TOTP
  -> /ar/admin, /ar/admin/users, outbox shows phone OTP, /dev/services ok (shots/L1..L7).
- `foundation-v1` re-pointed 512bf0a -> 74d77d0 (local, never pushed). Worktree list = ROOT; platform/* branches kept.
- In progress: nothing. Tree clean (only untracked .orchestration/). Dev server + DB stopped; 3000/54320 free.
- Known issues (BACKLOG [platform/merge]): late duplicate WhatsApp OTP after SMS fallback; e2e rows in the dev DB;
  duplicate sign-out on /admin/users.
## Next move
Nothing left in this lane. Orchestrator: mark Phase 0 done and create Phase 1 worktrees from `foundation-v1`
(74d77d0). Every Phase 1 agent reads .orchestration/FOUNDATION-NOTES.md + CONTRACTS.md first.
## Gotchas
- Tailwind default palette is reset: token colours only. New routes: add to tests/e2e/global-setup.ts warm-up.
- Admin e2e: `import { test, expect } from "../support/owner-session"`. Default staff landing is /<locale>/admin.
- Playwright screenshots before hydration log a harmless `caret-color` hydration warning in the dev log.
- `.env.local` holds seed passwords: never cat it. Stop server: `netstat -ano | grep ":3000 "` -> `taskkill //T //F //PID`.
