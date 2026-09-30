# LEADER — payments

## Plan rationale (relay #0)
- Order = money correctness first, UI second: pricing/VAT (PAY-01/02) → prepaid flow end to end (PSP adapter,
  webhook as sole source of truth, mock hosted page, retry/provider-down: PAY-03..06) → COD rules (PAY-07) →
  invoicing core before refunds, because refunds and write-offs must emit credit notes (PAY-08..10) → refunds
  (PAY-11) → COD cash (PAY-13/14) → admin UIs grouped after their services (PAY-12/15/16) → PDFs (PAY-17) →
  compliance sweep + docs (PAY-18/19). The app runs from PAY-00; every task is service + tests, then UI.
- Schema is already complete in `modules/payments/schema.ts` (foundation). Only planned schema change: DB check
  "cleared ⇒ submission_reference" on invoices/credit_notes (PAY-10). `number_series` + `next_series_number()` exist
  and are gapless by row lock; PAY-08 proves it with 100 concurrent issues.
- Mock PSP: stateless HMAC-signed session token in the URL (no new table); the hosted page's card inputs have no
  `name` and are never read, so no card data ever crosses our server (FR-PAY-003 / SAQ-A argument). Webhook is
  POSTed over real HTTP to `/api/webhooks/psp` so signature + idempotency are exercised exactly as a provider would.
- Cross-team boundaries (DECISIONS 2026-09-27 payments): PAYMENTS drives order transitions on webhooks, refunds and
  COD settlement/write-off via `orders.transition`; stock effects stay ORDERS' side effects; ORDERS calls
  `issueInvoiceIfDue` on dispatch/delivery (idempotent). In our branch orders/inventory are stubs → our tests assert
  our ledger + order state rows; stock/notification wiring is an integration check.

## Risks
- Orders/inventory stubs in-branch: retry stock-gone path and dispatch-triggered invoicing can only be simulated
  (`vi.mock` / calling `orders.transition` directly to set dispatch/delivery). Integration must rerun PAY-06/08.
- Contract changes: `refund` return type (never → RefundResult), new exports `getCodEligibility`, `paymentErrorKey`
  → CONTRACTS.md + contracts.test.ts in the same commit (PAY-06/07/11).
- Permission `payments.cod_remit` needs platform (CR OPEN); SHIM on `payments.refund` until merged.
- Playwright PDF in a Next route handler (Windows): launch cost + must not bundle — keep it server-only, lazy
  import, one shared browser; fallback = render HTML only and flag BACKLOG.
- Concurrency tests on embedded Postgres: pool size may cap parallelism; test uses its own pool of ≥ 20.

## How I validate each batch
- Re-run the task's acceptance command myself; `npx tsc --noEmit`; `git grep "STUB(contracts)"` shrinking.
- UI tasks: start dev on 3005 (background), load ar + en pages as Owner (and Staff where permissions differ).
- Money tasks: read the test for the SRS acceptance wording (e.g. "replayed three times → one state change",
  "100 concurrent → contiguous") — a test that doesn't literally check it is a FIX verdict.
- Every 3–4 tasks and at PAY-11/PAY-19: full `npm run verify` in background.

## Review log
- relay #0: planned PAY-00..19; environment set up (see HANDOVER).

## SAQ-A argument (PCI scope, FR-PAY-003 / NFR-SEC-011 / CI-002) - written in PAY-18
- Card data (number, expiry, CVV, holder) is entered only on the payment provider's hosted page (mock: `/dev/psp`); our
  storefront and admin never render a card field, never receive a PAN, and the browser returns to us with an order
  reference only. Payment state changes ONLY from the HMAC-signed webhook, never from the browser return.
- Nothing card-related is persisted: `payments`/`refunds` hold provider reference, method, amount, state, and the
  webhook `raw` payload after `sanitizeRaw` removes every `card*`, `pan`, `cvv/cvc/cv2`, `expir*`, `security_code` key
  at any depth (unit-tested). The schema has no card column (test).
- `payments/compliance.test.ts` guards this: no card inputs outside the hosted page, no PAN-shaped (Luhn) literals,
  plus the currency rules (ILS only, no FX path, no float money). With a real provider the hosted page/redirect or
  provider iframe keeps the merchant at SAQ-A; moving to a direct-API card form would raise scope to SAQ-A EP/D.
