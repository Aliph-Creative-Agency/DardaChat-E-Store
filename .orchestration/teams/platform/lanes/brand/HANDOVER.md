# Handover — platform/brand — worker — relay #1 (final)
Updated: 2026-09-30T23:40:02+03:00   Branch/HEAD: main @ a1876ca
## Task
Brand refresh on main (DESIGN.md), BRD-01..05. ALL DONE; tag brand-v1 created.
## State
- Done: BRD-01..05 (commits 7aeb005, 1b5d37d, f9f9e3a, a1876ca). Verification: tsc clean, eslint . clean, vitest 791 pass, playwright 90+ pass.
- Known: under heavy parallel load a few tests flake (5s timeouts in contracts/navigation-load vitest, auth e2e, axe /ar 1440); all pass when re-run alone.
- Dev server on :3000 stopped; DB 54320 left running (pre-existing embedded pg).
## Next move
None for this lane. Phase 1 teams: git merge brand-v1 then re-run typecheck.
## Gotchas
- favicon.ico must be an RGBA ICO or Turbopack returns 500 on every page.
- Never git add .orchestration/, assests/, design/. Old spelling DardaChat/دردشة remains only in module-owned files (catalog seed, engagement default-texts, storefront messages); those teams rename them.
- Header nav uses xl:max-w-[88rem] + whitespace-nowrap so English labels fit at 1280/1440.
