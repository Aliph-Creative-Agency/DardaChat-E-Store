# Handover — catalog — worker — relay #4
Updated: 2026-10-01T08:50:59+03:00   Branch/HEAD: team/catalog @ 719ec80
## Task
Phase 1 catalog team (back-office catalogue + CMS + search). Every task in TASKS.md is now [x]; CAT-18 close-out done
this relay. Waiting for leader review / integration.

## State
- Done: CAT-18 (evidence line in TASKS.md). No STUB(contracts) left in modules/catalog; BACKLOG/DECISIONS/CHANGE-REQUESTS present.
- Fixed this relay: products/[id]/actions.ts publish/unpublish/archive/restore are four explicit staffAction exports
  (static guard scan in auth/admin-entrypoints.int.test.ts was red); src/db/seed.int.test.ts expectations updated to the
  4 real boxes (platform-owned file, FYI in CHANGE-REQUESTS).
- Known: under machine load these time out but pass when calm: unit navigation-load.test.ts (5 s), contracts.test.ts (5 s
  default per module import, catalog 48 s), admin-entrypoints API-route scan (60 s hardcoded). Rerun with
  --testTimeout=120000 or when the box is quiet. Lint: 0 errors, 9 warnings (unused destructured _ids in
  admin/lifecycle.ts, one unused eslint-disable in cms/markdown.ts).
- Servers: dev server not running; db:stop issued (pg_ctl exits 1 while checkpointing, check netstat :54321).

## Next move
Leader: review (extra care: none of the opus-list areas touched this relay), then merge team/catalog at integration.
Optional polish: silence the 9 lint warnings; PrivacyNoticeFacts under /pages/policies/privacy once insights is merged
(see CHANGE-REQUESTS 2026-09-27 08:30 insights entry).

## Gotchas
- tsc 3-8 min, vitest full run ~19 min on this machine; use run_in_background + until-loop (<600 s) to wait.
- After adding routes run npx next typegen before tsc.
- Public GET /api/catalog/products/[id] takes a SLUG.
