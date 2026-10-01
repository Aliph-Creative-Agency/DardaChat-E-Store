# Team ENGAGEMENT — Phase 1
**Working dir:** `D:/Personal/Projects/DardaChat-wt/engagement` (branch `team/engagement`). DB 54326, web 3006.
**Owns:** `web/src/modules/customers/**`, `web/src/modules/messaging/**`, `web/src/modules/engagement/**`,
`web/src/app/[locale]/admin/customers/**`, `web/src/app/[locale]/admin/messaging/**`, `web/src/app/api/messaging/**`,
`web/src/app/[locale]/(store)/unsubscribe/**`, `web/messages/*/customers.json`, `web/messages/*/messaging.json`,
`web/tests/e2e/engagement/**`.
**SRS:** §4.10 FR-CRM-001..003, §4.11 FR-MSG-001..008, NFR-PRV-002, CON-06, CON-08, AS-18, AS-19, FR-AI-009 (escalation is transactional).

**Build:** unified customer view (orders, addresses, consent, Journey results) + per-customer metrics (order count, LTV,
AOV, first/last order); rule-based dynamic segments (builder UI over attributes/behaviour, evaluated live); consent per
customer per channel with timestamp + source, withdrawable as easily as given; `notify(event, …)` transactional
dispatcher with bilingual templates for order confirmation, payment outcome, dispatch, delivery, account events,
backorder/revised expectation, order lapsed, back-in-stock, OTP — WhatsApp first, SMS/email fallback, through the mock
channels into the outbox; WhatsApp template registry with Meta approval state (mock refresh; pending/rejected template
sends refused + admin alert); marketing gate enforced at dispatch time (no consent → blocked); unsubscribe link/keyword
that works on the next send; 14-day cross-channel marketing cap; broadcast campaigns to a segment with scheduling and
per-recipient delivery status (job). Replace the engagement stubs.
