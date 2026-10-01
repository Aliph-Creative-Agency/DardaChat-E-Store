# Team INSIGHTS — Phase 1
**Working dir:** `D:/Personal/Projects/DardaChat-wt/insights` (branch `team/insights`). DB 54327, web 3007.
**Owns:** `web/src/modules/reports/**`, `web/src/modules/privacy/**`, `web/src/modules/events/**`,
`web/src/app/[locale]/admin/page.tsx` (dashboard home), `web/src/app/[locale]/admin/reports/**`,
`web/src/app/[locale]/admin/privacy/**`, `web/src/app/[locale]/admin/events/**`, `web/src/app/[locale]/admin/system/**`,
`web/src/app/[locale]/(store)/account/privacy/**`, `web/src/app/api/reports/**`, `web/src/app/api/privacy/**`,
`web/messages/*/reports.json`, `web/messages/*/privacy.json`, `web/tests/e2e/insights/**`.
**SRS:** §4.12 FR-RPT-001..007, §5.3 FR-DAT-001, 004..010 (Journey retention FR-DAT-002/003 belongs to JOURNEY, but the
retention-settings UI and purge framework are yours), FR-ACC-008, §6.4 NFR-PRV-001/003/004/007, NFR-MNT-005, CI-004 panel.

**Build:** dashboard (revenue, orders, AOV, conversion; selectable period with prior-period comparison), sales by
product/variant/collection, funnel (catalogue view → cart → checkout → purchase) from recorded business events +
acquisition source, CSV export on every report, reproducible figures for closed periods (business date in
Asia/Jerusalem, no "now" dependence), ILS only. Business event history view to reconstruct an order/customer story.
Privacy: data requests (export, deletion) from the account area verified by a single-use code to the held contact
channel; other routes referred to an Owner with a manual-check record; 30-day window tracking + Owner alert;
machine-readable export of every category; erasure by de-identification (financial/audit rows survive — use the
FR-DAT-008 escape in PLATFORM's triggers); retention settings per category + purge job framework; cookie/consent banner
that blocks non-essential analytics before consent; privacy notice rendered from CMS policies (hosting region as
configurable text). System panel showing degraded external services (CI-004).
