# Team INTEGRATION — Phase 2

**Working dir:** ROOT `D:/Personal/Projects/DardaChat-E-store` on branch `integration` (create it from `main` at
`foundation-v1`). DB 54320, web 3000. At the end, fast-forward `main` to `integration` and tag `prototype-integrated`.
**Owns:** everything (you are the only team running). Keep each module's structure; fix, don't rewrite.

**Inputs:** team branches `team/{inventory,orders,payments,catalog,storefront,engagement,insights,assistant,journey}`
(each team's `HANDOVER.md`, `LEADER.md`, `TASKS.md` in `.orchestration/teams/<team>/` say what is done / deferred),
`CHANGE-REQUESTS.md`, `DECISIONS.md`, `CONTRACTS.md`, `FOUNDATION-NOTES.md`.

**Tasks (plan them in TASKS.md, one merge per task):**
1. Merge in order: inventory → orders → payments → catalog → storefront → engagement → insights → assistant → journey.
   After each merge: resolve conflicts (keep both intents; the owning team's version of its own files wins; stubs lose to
   real implementations), `npm ci` if deps changed, db:reset/setup/seed, typecheck, lint, full unit/integration tests. Fix
   before the next merge. Record anything non-obvious in DECISIONS.md.
2. Apply every OPEN entry in CHANGE-REQUESTS.md (mark DONE). Remove all remaining stubs; grep for `NotImplemented`/`STUB`.
3. Seed a realistic demo dataset spanning modules (orders in many states, COD remittances, invoices + credit notes,
   customers with consent, a segment, a campaign, journey results, reports with data).
4. Write + pass cross-module Playwright journeys in `web/tests/e2e/flows/`:
   a) guest card order: browse (ar) → cart → checkout → mock PSP approve → webhook → PAID → admin pick/pack/dispatch →
      invoice issued + mock tax clearance → delivered → completed; customer sees status history; messages in outbox.
   b) COD order → delivered → invoice → remittance allocated across 2 orders → COD_SETTLED; reconciliation report.
   c) shortfall at picking → BACKORDERED → PO receipt → auto-resume → customer notified.
   d) failed delivery → redelivery; and failed → cancel with stock restored on receipt.
   e) partial refund then full refund → credit notes, gapless series; payment state PART_REFUNDED→REFUNDED.
   f) PENDING order expires via sweep → CANCELLED, stock back, customer notified.
   g) Journey playthrough (ar + en), result shown, consent + save links to a customer, visible in customer view.
   h) Assistant: product question answered with citation (mock LLM), order-status tool as signed-in customer, escalation.
   i) Owner vs Staff: Staff refused on Owner-only endpoints; 2FA enforced; audit log entries present.
5. Visual pass over every storefront and admin page in both locales at 375 px and 1440 px; fix broken layouts/RTL.
6. `web/README.md` quickstart that works from a clean clone. Fast-forward main, tag `prototype-integrated`,
   remove merged team worktrees with `git worktree remove` (keep branches).
