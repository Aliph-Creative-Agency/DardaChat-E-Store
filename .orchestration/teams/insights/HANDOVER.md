# Handover — insights — leader — relay #0
Updated: (set after env check)   Branch/HEAD: team/insights @ 74d77d0
## Task
Phase 1 INSIGHTS: dashboard + reports (FR-RPT-001..007), funnel + consent banner (NFR-PRV-004), business event
history (NFR-MNT-005), degraded-services panel (CI-004), privacy data requests / export / erasure / retention /
notice (FR-ACC-008, FR-DAT-001, 004..010, NFR-PRV-001/003/007). Plan written (TASKS.md INS-00..19).
## State
- Done: INS-00 environment (see LEADER.md "Environment").
- In progress: none.
- Broken/known issues: none known.
## Next move
INS-01 (period maths + skeleton + insights.json), then INS-02 fixtures, INS-03 dashboard service, INS-04 dashboard page.
## Gotchas
- Code goes in `web/src/modules/insights/**` (not modules/reports|privacy); messages in `messages/<l>/insights.json`
  (D-INS-1). Read other modules' tables via `@/db/schema` for reports/export/erasure (D-INS-2).
- Admin nav still points privacy/health at `/admin/settings/privacy` and `/admin/health` (CR filed); open our pages
  by URL: `/ar/admin/privacy`, `/ar/admin/system`, `/ar/admin/events`.
- Never cat `web/.env.local` (seed passwords). DB 54327, web 3007 only. Stop dev server + `npm run db:stop` before retiring.
- FOUNDATION-NOTES.md Gotchas apply (cold compile ~70 s, heredocs halve backslashes, Tailwind palette reset).
