# Leader notes — engagement — relay #0

## Plan rationale
- One module (`src/modules/engagement`) because the foundation already put customers/addresses/consent/templates/
  messages/segments/campaigns schema and the public contract there; splitting into customers/messaging would churn
  imports for other teams at integration for no gain (DECISIONS 2026-09-27).
- Order: pure/renderer + contract events (ENG-01) → template registry (02) → real `notify` (03, removes our only stub
  early so other teams integrate against the real thing) → consent/opt-out (04) → marketing gate + cap (05) → the
  public unsubscribe page (06) → customer 360 + metrics (07) → demo seed (08) → admin customers UI (09) → segments
  engine then UI (10, 11) → templates UI + refresh job (12) → campaigns service/job then UI (13, 14) → CRs/docs (15)
  → full validation (16). Every service task carries its int tests; every UI task carries an e2e spec.
- Gate logic lives in ONE place (`sendMarketing`), so "blocked at dispatch, not hidden in UI" (FR-MSG-002) holds for
  campaigns and any future marketing sender. Suppressions table = audit trail + admin alert source (FR-MSG-006).

## Risks
- Other teams must call `notify` for their triggers (dispatch/delivery/payment/back-in-stock/OTP/escalation). We can
  only provide events + CRs; FR-MSG-004 end-to-end is proven at integration. In-branch we test notify directly.
- Reading orders/journey tables with SQL is a documented contract exception; a schema change by ORDERS/JOURNEY could
  break metrics/segments at merge — keep the SQL in `metrics.ts`/`segment-rules.ts` only, with int tests.
- `TRANSACTIONAL_EVENTS` widening is additive; `orders` already imports `notify` — keep old event names unchanged.
- Admin nav points at unowned paths until platform applies the nav CR; e2e navigates directly by URL.
- Machine contention: 9 teams run npm/dev servers at once → cold compiles slow; e2e must warm routes first.

## How I validate each batch
typecheck + `vitest run src/modules/engagement` (unit+int against our DB) + the task's acceptance command; for UI I load
the page on :3006 in ar and en (RTL, no console errors) and run its e2e spec; spot-check SRS acceptance wording
(FR-MSG-002 dispatch-time block, FR-MSG-003 next-send effect, FR-MSG-008 cross-channel, FR-CRM-002 independent calc).

## Setup
(see below — filled during relay #0)

## Review log
- relay #0: plan written (TASKS.md ENG-00..16), BACKLOG/DECISIONS/CR entries added.
