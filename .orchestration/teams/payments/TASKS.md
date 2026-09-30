# TASKS — team PAYMENTS (Phase 1)

Worktree `D:/Personal/Projects/DardaChat-wt/payments` (branch `team/payments`), DB 54325, web 3005. All commands from
`D:/Personal/Projects/DardaChat-wt/payments/web`. "Green" = `npx tsc --noEmit` + `npx eslint <touched paths>` + the
named vitest files pass (full `npm run verify` at PAY-01, PAY-11 and PAY-19). Every task: ar + en strings in
`messages/{ar,en}/payments.json` (real Arabic), money integer agorot, `requireStaff` first line of every admin page.

**Path map (leader decision, see LEADER.md + DECISIONS.md 2026-09-27 payments):**
- Services: public contract stays `src/modules/payments/index.ts` ONLY. Internal code: `src/modules/payments/**`
  (PSP, webhooks, refunds, remittances), `src/modules/pricing/**` (VAT rates, totals), `src/modules/invoicing/**`
  (invoices, credit notes, e-invoice, PDFs). pricing/invoicing have NO `index.ts` contract of their own; other teams
  import only `@/modules/payments` (it re-exports).
- Strings: only `payments` is a loaded namespace (`lib/i18n/namespaces.ts`) → all strings in `payments.json`
  (sub-trees `psp.*`, `invoices.*`, `remittances.*`, `vat.*` …). No `invoicing.json`.
- Admin pages at the nav registry's fixed hrefs (`lib/nav/admin-nav.ts`, DECISIONS SHL-10): `admin/payments/**`,
  `admin/refunds/**`, `admin/remittances/**`, `admin/invoices/**`, `admin/e-invoicing/**`, `admin/settings/vat/**`.
- Mock provider pages: `src/app/[locale]/dev/psp/**`, `src/app/[locale]/dev/tax-authority/**` (dev tools live under
  `[locale]`); APIs `src/app/api/webhooks/**`, `src/app/api/payments/**`; e2e `tests/e2e/payments/**`.

Legend: `[ ]` todo, `[~]` partial (note), `[x]` done (evidence line), `[!]` blocked (reason).

---

- [x] **PAY-00 Environment** — worktree, `npm ci`, `.env.local` (PG 54325 / web 3005 / own webhook+session secrets),
  db:start + setup + seed, typecheck + tests green on untouched foundation. (leader, relay #0; evidence in HANDOVER.md)

- [x] **PAY-01 Scaffolding + pricing split + contract bookkeeping** — SRS FR-CRT-007/009, FR-CUR-005.
  Move VAT-rate lookup + `computeTotals` bodies to `src/modules/pricing/{service,types}.ts` (payments/service.ts
  re-exports; signatures unchanged). Create `messages/{ar,en}/payments.json` skeleton (`common`, `errors`
  incl. `providerDown`, `declined`, `timeout`, `retry`). (Leader checked: no foundation test walks `src/modules/*`
  expecting an `index.ts`, so pricing/invoicing folders without a contract are fine.)
  Append CHANGE-REQUESTS: (a) `payments.refund` return type `Promise<never>` → `Promise<RefundResult>` (payments
  owns it; FYI orders), (b) new export `getCodEligibility` (FYI orders/storefront). (Already done by the leader:
  CR for permission `payments.cod_remit` — SHIM(payments) uses `payments.refund` until applied — and the DECISIONS
  lines for the path map / webhook responsibilities.)
  Tests: `src/modules/pricing/totals.test.ts` (unit/int) — FR-CRT-007 subtotal−discount+delivery=total to the agora,
  "of which VAT" not additive (adding it overstates), FR-CRT-009 delivery carries VAT, discount reduces VAT
  proportionally, single rounding; `getActiveVatRate` picks greatest effective_from ≤ business date (Asia/Jerusalem
  midnight boundary).
  Accept: `npx vitest run src/modules/pricing src/modules/payments src/modules/contracts.test.ts` green; `npm run
  verify` green (background, poll log).
  Evidence (relay #1, 8c4af46): `npx vitest run src/modules/pricing src/modules/payments src/modules/contracts.test.ts` 5 files/46 tests pass; `npm run verify` 67 files / 788 tests EXIT 0. Test is `pricing/totals.int.test.ts` (needs DB). CRs appended.

- [x] **PAY-02 VAT-rate admin with effective dates** — FR-CUR-005, FR-CUR-006.
  `pricing/service.ts`: `listVatRates`, `addVatRate({ rateBp, effectiveFrom }, ctx)` (effective_from ≥ today's business
  date; rows whose date has passed are immutable; duplicate date → `conflict`; audited via `auditedMutation`).
  Page `app/[locale]/admin/settings/vat/page.tsx` (`requireStaff("settings.read")`; add form needs `settings.write`
  via `staffAction`): table (rate %, effective from, in force / scheduled badge), add form.
  Tests: int — adding a future rate leaves `getActiveVatRate(today)` unchanged and applies on its date; an order
  placed (orders.placeOrder) before the change keeps `vatRateBp` 1600 after a new rate takes effect (FR-CUR-006).
  Accept: `npx vitest run src/modules/pricing`; browser: `/ar/admin/settings/vat` and `/en/...` load as Owner, add a
  rate for next month, it appears as "scheduled"; Staff sees read-only.
  Evidence (relay #1, 262ab96): `npx vitest run src/modules/pricing` green (vat-rates.int.test.ts 3 tests incl. placeOrder keeps 1600); `npx playwright test tests/e2e/payments/vat.spec.ts` 2 passed (Owner ar add→scheduled, en load; Staff read-only; screenshot checked RTL).

- [x] **PAY-03 PSP adapter + real `initiatePayment`** — FR-PAY-002, FR-PAY-004, FR-PAY-012, NFR-SEC-011.
  `payments/psp/types.ts` (`PspAdapter { createSession, refund }`, provider-neutral), `payments/psp/mock.ts` (mock
  provider: session = HMAC-signed token {paymentId, orderId, amount, method, locale, returnUrl, exp}; provider ref
  `mock_<nanoid>`), `payments/psp/index.ts` (`getPsp()` by env `PAYMENTS_PROVIDER`, default `mock`). All PSP calls via
  `callExternal({ service: "payments" })`. `initiatePayment`: order must exist, method prepaid & equal to the order's
  method (or COD → `redirectUrl: null`, no row), fulfilment PENDING (PAYMENT_FAILED handled in PAY-06), amount =
  order total; inserts `payments` row kind `capture` status `pending` providerRef = session ref; returns
  `/<locale>/dev/psp?s=<token>`. Provider down → `AppError("unavailable")` (NFR-AVL-005), no pending row left.
  Tests: `payments/initiate.int.test.ts` (card/wallet/instant_transfer create pending row + URL; COD null; wrong
  state → invalid_transition/invalid_input; `setFault("payments","down")` → unavailable).
  Accept: `npx vitest run src/modules/payments`; `git grep -n "STUB(contracts)" web/src/modules/payments` no longer
  lists initiatePayment.
  Evidence (relay #1, ddced11): `npx vitest run src/modules/payments` 2 files/12 tests pass (initiate.int.test.ts: 3 methods pending row+URL+token, COD null, wrong method/foreign returnUrl/not_found/cancelled, payments:down → unavailable + no row); STUB grep no longer lists initiatePayment. Retry branch (PAYMENT_FAILED→PENDING) already in initiate.ts, tested in PAY-06.

- [x] **PAY-04 Webhook processing (source of truth)** — FR-PAY-004, FR-PAY-005, FR-PAY-013, CI-002.
  `handleProviderWebhook` real: verify signature (existing), parse `{ eventId, type: payment.authorised|payment.captured
  |payment.failed, providerRef, paymentId, orderId, amount, method, failureCode? }` with zod; append `payments` row
  (dedupe via `payments_provider_event_uq` → `duplicate: true`, no side effects); amount mismatch → recorded failed +
  logged, no PAID. In one tx: `orders.transition` payment UNPAID→AUTHORISED/PAID and fulfilment PENDING→PAID, or
  PENDING→PAYMENT_FAILED (stock release/hold expiry are ORDERS' transition side effects — DECISIONS 2026-09-27;
  do not call inventory here); business events `payment.succeeded|failed`; after commit
  `engagement.notify("payment.succeeded"|"payment.failed", …, { orderId })`. Late capture on a PAYMENT_FAILED/CANCELLED
  order: record row + business event `payment.late_capture` (Owner sees it in admin, refund manually) — no transition.
  `raw` stores the payload minus anything card-like. Route `app/api/webhooks/psp/route.ts` (raw text body, header
  `x-psp-signature`; 401 invalid, 200 ok/duplicate, 400 malformed).
  Tests: int — invalid signature rejected, same valid callback ×3 → one payments row + one state change (CI-002);
  no webhook → order stays PENDING/UNPAID even after "return" (FR-PAY-005); failed → PAYMENT_FAILED (+ order event);
  provider ref stored (FR-PAY-004). Route test via `fetch` against the handler (or unit with Request).
  Accept: `npx vitest run src/modules/payments src/app/api/webhooks`.
  Evidence (relay #2): `npx vitest run src/modules/payments src/app/api/webhooks` 4 files/26 tests pass (webhook.int.test.ts 11: bad sig, no-webhook stays PENDING, 3× seq+concurrent → 1 row/1 transition, wallet/instant ref, auth→capture, failed→PAYMENT_FAILED+notice, late capture, amount mismatch, malformed 400, raw sanitised; route.int.test.ts 401/400/200/dup). tsc + eslint clean.

- [x] **PAY-05 Mock PSP hosted page + return page + e2e** — FR-PAY-002, FR-PAY-003, FR-PAY-012, NFR-SEC-011.
  `app/[locale]/dev/psp/page.tsx`: verifies token, shows merchant/amount (PriceTag), method UI (card: number/expiry/
  CVV inputs WITHOUT `name`, never read or submitted; wallet: phone; instant transfer: bank list), buttons Approve /
  Decline / Timeout (sends `payment.failed` code `timeout`) / Abandon (no webhook). Server action: build event, sign
  with `PAYMENT_WEBHOOK_SECRET`, POST to `${APP_URL}/api/webhooks/psp`, then redirect to the token's returnUrl with
  `?payment=<id>`. Available when `PAYMENTS_PROVIDER` is `mock` (not gated on NODE_ENV). Dev-only harness:
  `POST /api/payments/dev/checkout` (404 in production) places a seeded order (`orders.placeOrder`, chosen method)
  + `initiatePayment`, returns `{ orderId, redirectUrl }`; `app/[locale]/dev/psp/return/page.tsx` shows the order's
  payment + fulfilment state (reads getOrder/getPaymentSummary) with a "retry payment" button. Strings in
  `payments.json` `psp.*` (ar + en).
  Tests: `tests/e2e/payments/psp.spec.ts` — card approve → return page shows paid; wallet + instant_transfer approve
  → paid with provider ref; decline → PAYMENT_FAILED; abandon → still PENDING; request log of the whole flow
  (`page.on("request")` bodies + URLs) contains no card number / CVV / expiry (FR-PAY-003).
  Accept: dev server on 3005 (background) + `npx playwright test tests/e2e/payments/psp.spec.ts` green; screenshot
  `/ar/dev/psp` RTL looks right.
  Evidence (relay #2): `npx playwright test tests/e2e/payments/psp.spec.ts` 6 passed (card approve + no PAN/expiry/CVV in any request URL/body, wallet + instant_transfer paid with mock_ ref, decline → PAYMENT_FAILED + retry button, abandon → PENDING/UNPAID, ar RTL approve); screenshot test-results/psp-ar.png checked RTL. i18n parity/no-literals/logical tests green. Provider-side logic in `payments/psp/mock-hosted.ts`; `payments/errors.ts` paymentErrorKey (contract export in PAY-06).

- [x] **PAY-06 Retry path + provider-down** — FR-PAY-007, NFR-AVL-005, A.2 PAYMENT_FAILED→PENDING (FR-INV-010).
  `initiatePayment` on a PAYMENT_FAILED order: `orders.transition` PAYMENT_FAILED→PENDING (trigger `payment_retry`;
  ORDERS' side effect calls `inventory.reacquireOrderHold` and throws `insufficient_stock` when stock is gone — then
  no session is created and the order stays PAYMENT_FAILED), new session. In-branch the orders stub has no side
  effects: test the stock-gone path with a `vi.mock` of `@/modules/orders` throwing `insufficient_stock`; the real
  path is an integration check. Export (inside
  payments contract, CR entry) `paymentErrorKey(error)` → message key (`providerDown`, `declined`, `timeout`,
  `outOfStock`) so storefront shows an explicit, actionable message; harness page uses it.
  Tests: int (retry → PENDING + new pending row; retry with stock gone refused, no row); e2e: decline → retry → approve → paid, order id
  unchanged, no data re-entry; with `FAULTS=payments:down` (or `/dev/services` toggle) harness shows the provider-down
  message and the order is untouched.
  Accept: `npx vitest run src/modules/payments` + `npx playwright test tests/e2e/payments`.
  Evidence (relay #3): `npx vitest run src/modules/payments src/modules/contracts.test.ts` 5 files/40 tests pass (initiate.int retry → PENDING + new pending row, provider-down on retry leaves PAYMENT_FAILED + 1 row; retry-stock.int vi.mock orders → outOfStock, no row; paymentErrorKey unit); `npx playwright test tests/e2e/payments` 11 passed (decline→reason→retry→approve same order; timeout reason; /dev/services payments:down → harness 503 providerDown + order PENDING/UNPAID, retry shows providerDown, then recovers → PAID). tsc clean.

- [x] **PAY-07 COD eligibility + COD settings** — FR-PAY-001, FR-PAY-011 (setting).
  New contract export `getCodEligibility({ zoneId, total }, ctx?) → { eligible, reason?: "zone_disabled" |
  "over_limit", maxTotal }` (zone `codEligible`/`codMaxTotal` + setting `payments.cod_max_total`, the lower cap wins);
  update CONTRACTS.md + `contracts.test.ts` manifest in the same commit. Settings `payments.cod_max_total`,
  `payments.cod_unreconciled_days` (default 7) edited at `app/[locale]/admin/payments/settings/page.tsx`
  (`settings.read` view / `settings.write` save, audited).
  Tests: int — enabled zone under cap eligible; disabled zone refused; over cap refused; zone cap lower than global wins.
  Accept: `npx vitest run src/modules/payments src/modules/contracts.test.ts`; browser: settings page saves in ar/en.
  Evidence (relay #3): `npx vitest run src/lib/i18n src/modules/payments src/modules/contracts.test.ts src/modules/auth/admin-entrypoints.int.test.ts` 15 files/94 tests pass (cod.int.test.ts 8: under cap, zone disabled (+ seeded non-COD zone), over cap, lower cap wins both ways, not_found/invalid, settings saved + audited + drive eligibility, invalid refused); `npx playwright test tests/e2e/payments/cod-settings.spec.ts` 2 passed (Owner saves ar then en, invalid days error, Staff read-only; screenshot RTL checked). tsc + eslint clean.

- [x] **PAY-08 Invoice issuance (gapless)** — FR-ORD-023, FR-ORD-024, FR-PAY-012, §5.2 Invoice, FR-CUR-005.
  `invoicing/service.ts` `issueInvoiceIfDue(orderId, ctx)` (payments re-exports, signature kept): lock order row;
  existing invoice → return it (never a second); prepaid due when `dispatchedAt` set (first dispatch, incl.
  PARTIALLY_DISPATCHED) and payment state has money in; COD due when `deliveredAt` set; cancelled without trigger →
  null. Number via `select next_series_number('invoice')` + `format_series_number` in the SAME tx; net/vat/gross +
  `vatRateBp` from the order (rate at sale); `snapshot` = seller (settings `shop.*`), buyer, lines, totals, locale.
  Enqueue e-invoice submission (row `einvoice_submissions` pending, sent by PAY-10's job). Business event
  `invoice.issued`.
  Tests: `invoicing/issue.int.test.ts` — prepaid none before dispatch, exactly one after, still one after second
  consignment; COD none before delivery, one after; cancelled → none; card, wallet, instant_transfer each produce an
  invoice (FR-PAY-012); **100 concurrent issues on 100 orders → numbers contiguous, no gap/dup, none equals an order
  reference**; forced rollback after allocation leaves no gap.
  Accept: `npx vitest run src/modules/invoicing`.
  Evidence (relay #3): `npx vitest run src/modules/payments src/modules/invoicing src/modules/contracts.test.ts` 7 files/56 tests pass (issue.int.test.ts 8: prepaid none→one→still one after 2nd consignment, unpaid dispatched none, COD at delivery only, cancelled none, card/wallet/instant_transfer invoices with amounts+rate+snapshot+event, not_found, 100 orders × 2 concurrent issuers → 100 contiguous INV numbers none = order ref, rollback reuses the number). E-invoice queue = clearance_status not_submitted (DECISIONS). tsc + eslint clean.

- [x] **PAY-09 Credit notes + cancel-in-error** — FR-ORD-020, FR-ORD-024, §5.2 CreditNote.
  `invoicing/credit-notes.ts` `issueCreditNote({ invoiceId, amount, reason, refundId? }, ctx)` (internal): lock
  invoice (`select … for update`), Σ credit ≤ gross else `invalid_input`, own `credit_note` series in the same tx, VAT
  share = proportional to the invoice (single rounding), enqueue e-invoice submission, business event
  `credit_note.issued`. `cancelInvoiceInError(invoiceId, reason, ctx)` → full credit note (reason `correction`), invoice
  stays in the register. Tests: partial + remaining credit notes ≤ gross; over-credit refused; 50 concurrent credit
  notes contiguous CN series; cancel-in-error keeps invoice + full CN.
  Accept: `npx vitest run src/modules/invoicing`.
  Evidence (relay #4): `npx vitest run src/modules/invoicing` 2 files/18 tests pass (credit-notes.int.test.ts 10: cumulative single-rounding VAT sums to invoice VAT, partial+rest = gross, over-credit single/cumulative refused, 10 concurrent quarters → 4 succeed, 50 concurrent → contiguous CN series, rollback no gap, cancel-in-error full correction CN + invoice kept + audited, fully credited refused). tsc + eslint clean.

- [x] **PAY-10 Mock tax authority + submission/retry/alert** — FR-ORD-018, FR-ORD-019, FR-ORD-020 (submission).
  `invoicing/einvoice/{types,mock,index}.ts` provider-neutral `TaxAuthorityAdapter.submit(doc) → { reference,
  status: "cleared"|"rejected", message? }`, mock via `callExternal({ service: "einvoice" })`; mock behaviour setting
  `dev.tax_authority.mode` = `clear` (default) | `reject` | `pending` (plus core faults down/slow/flaky). Schema: add
  check `clearance_status <> 'cleared' or submission_reference is not null` on invoices + credit_notes
  (`payments/schema.ts`). Job `payments.einvoice.submit` (30 s, `jobs.ts`): picks not_submitted/errored docs whose
  next attempt is due (backoff 1 min × 2^(n-1), cap 1 h), writes one `einvoice_submissions` row per attempt, sets
  `submitted`→`cleared` (+reference) / `rejected`; after 3 failed attempts (and on every rejection) raise an Owner alert
  once per document: `core.sendMessage` email to every active Owner (event `einvoice.failed`) + business event
  `einvoice.failed`. Also `retryEinvoice(documentType, id)` for the admin button. Dev page
  `app/[locale]/dev/tax-authority/page.tsx`: mode toggle + received submissions.
  Tests: int — happy path clears with reference; `einvoice:down` → retries recorded, doc stays not cleared, alert sent
  once (outbox row), cleared impossible without reference (DB check); reject mode → rejected + alert; recovery → next
  run clears.
  Accept: `npx vitest run src/modules/invoicing` + `npm run jobs -- --once payments.einvoice.submit` exits 0.
  Evidence (relay #4): `npx vitest run src/lib/i18n src/modules/invoicing src/modules/payments src/modules/contracts.test.ts src/db` 27 files/150 tests pass (einvoice.int.test.ts 6: job clears INV + CN with TA- reference, cleared-without-ref refused by invoices_/credit_notes_cleared_ref_ck, einvoice:down → 4 error attempts on 1/2/4-min backoff, doc not_submitted, 1 einvoice.failed event + owner e-mail at attempt 3 only, recovery clears; reject → rejected + alert, not auto-retried, retryEinvoice clears, cleared retry → invalid_transition; pending → submitted then cleared); `npm run jobs -- --once payments.einvoice.submit` status ok EXIT 0; `npx playwright test tests/e2e/payments/tax-authority.spec.ts` 1 passed (ar/en mode toggle, screenshot RTL checked). tsc + eslint clean. Owner lookup = SHIM(payments) + CR to auth.

## Brand update (2026-09-29, approved by Obaida) — do these first
- [x] **PAY-B1 Brand on invoice + packing slip PDFs** (model: sonnet) — DONE in PAY-17 (relay #9: header = placeholder logo-banner.png data URI + name in both scripts + contact block from BRAND_CONTACT, palette tokens; verified in ar+en). Earlier partial note (relay #5, d0ffd41): seller snapshot fallbacks = «دردشات»/Dardachat, Beit Hanina, Jerusalem. brand-v1 tag not yet on the repo (2026-09-30 check). The PDF header/logo/contact block is built INSIDE PAY-17 (the PDFs do not exist before it); check it there. — Read ../../DESIGN.md (ROOT/.orchestration/DESIGN.md) first. If tag brand-v1 exists and is not in your branch, `git merge brand-v1` before starting (PROTOCOL §1 step 4b). Header uses the placeholder logo from web/public/brand (after brand-v1) or the name «دردشات» / Dardachat, palette, contact block (DESIGN.md §1). Check: generated PDFs show the new name/contact in ar+en with correct Arabic shaping.

- [x] **PAY-11 Refunds (all methods) + credit note** — FR-PAY-006, FR-PAY-013, FR-PAY-014, FR-PAY-015, FR-ORD-020.
  `refund({ orderId, amount, method, reason }, ctx)` real (CR from PAY-01: returns `RefundResult { refundId, status,
  providerRef, paymentState, creditNoteId }`; add optional `receivingParty`, `refundedAt` in input — additive). Lock
  order; payment state must be PAID | COD_SETTLED | PART_REFUNDED (any fulfilment state, no return needed) else
  `invalid_transition`; Σ succeeded refunds + amount ≤ paidAmount else `invalid_input`; prepaid original method →
  PSP `refund` through the adapter (mock returns ref; down → `unavailable`, refund row `failed`, nothing else moves);
  cash / bank_transfer (COD or manual) → recorded with receivingParty, date, `requestedById` = `ctx.actor` staff;
  payment transition → PART_REFUNDED or REFUNDED; credit note (reason `refund`) when an invoice exists; business event
  `payment.refunded`; audit entry.
  Tests: int — full + partial on card order and on settled COD order; PART_REFUNDED→PART_REFUNDED→REFUNDED; exceeding
  paid refused; refund from PAID/COD_SETTLED/PART_REFUNDED without return; UNPAID/COD_DUE refused; credit note
  references the invoice with the refunded amount; paid order cancelled before dispatch refunds with no credit note.
  Accept: `npx vitest run src/modules/payments src/modules/invoicing`; `npm run verify` green.
  Evidence (relay #5 code 338bfd9; verified relay #6): `npx vitest run src/modules/payments src/modules/invoicing src/modules/contracts.test.ts` 11 int files/93 tests pass incl. refunds.int.test.ts (12); contracts.test 13/13 with `--testTimeout=90000` (default 5 s times out on cold imports while the machine is loaded). `npm run verify`: see PAY-12 line.

- [x] **PAY-12 Admin: payments + refunds UI** — FR-PAY-004, FR-PAY-006, FR-PAY-014, UI.
  `admin/payments/page.tsx` (`payments.read`): payments ledger (newest first, filter method/status/date, order ref
  search), link to `admin/payments/[orderId]/page.tsx`: payment + fulfilment state, provider refs, events, refunds,
  invoice/credit notes, "Refund" dialog (`payments.refund`; amount default remaining, method, receiving party for
  cash/transfer, reason) via `staffAction`; late-capture alert banner. `admin/refunds/page.tsx`: refunds list
  (reference, order, amount, method, user, date, status).
  Tests: `tests/e2e/payments/admin-refund.spec.ts` (owner-session fixture): paid order → partial refund → state
  PART_REFUNDED shown; over-refund shows the error. Accept: e2e green + manual load `/ar/admin/payments` RTL.
  Evidence (relay #7, code 2ef8bf1 + 55c4694): `npx playwright test tests/e2e/payments/admin-refund.spec.ts` 2 passed (paid card order → partial refund 10.00 → PART_REFUNDED; over-refund error; ar RTL ledger + dialog screenshots checked; Staff can open + refund). Fixed: order page h1 used t.rich with a function (500) → `<ref>` tag. tsc clean.

- [x] **PAY-13 COD remittances + allocation** — FR-PAY-010, FR-PAY-016, A.4 COD_DUE→COD_SETTLED.
  `payments/remittances.ts`: `recordRemittance({ amount, receivedAt, remittingParty, note? }, ctx)` (receivedBy =
  actor), `allocateRemittance(remittanceId, [{ orderId, amount }], ctx)` in one tx: lock remittance + orders; order must
  be COD, delivered (deliveredAt set), payment COD_DUE (or WRITTEN_OFF: late cash recorded, state not reopened);
  per order Σ allocations ≤ total (owed) else refuse whole batch; Σ ≤ remittance unallocated else refuse; write
  `remittance_allocations` + `payments` row kind `cash` (provider `cash`, providerRef = allocation id); when owed
  reaches 0 → transition COD_DUE→COD_SETTLED; business event `cod.settled`. `listRemittances` with derived unallocated
  balance.
  Tests: int — one remittance over three orders settles each and leaves correct unallocated balance; over-allocation
  (order or remittance) refused atomically; partial allocation keeps COD_DUE; getPaymentSummary.paidAmount matches.
  Accept: `npx vitest run src/modules/payments`.
  Evidence (relay #5 code 2e40bcf; verified relay #6): same vitest run green incl. remittances.int.test.ts (7).

- [x] **PAY-14 Reconciliation report + unreconciled flag + Owner write-off** — FR-PAY-008, FR-PAY-011, FR-ORD-020.
  `codReconciliation({ from, to, remittingParty? }, ctx)`: per business date × remitting party — remitted, allocated,
  unallocated; per delivered COD order — owed, settled, variance; totals with zero variance when fully settled.
  `listUnreconciledCod(ctx)`: delivered COD orders still COD_DUE with deliveredAt older than
  `payments.cod_unreconciled_days`. `writeOffCod(orderId, reason, ctx)` (Owner only, `payments.cod_writeoff`, reason
  required): COD_DUE→WRITTEN_OFF with reason in the event data, credit note (reason `write_off`) for the unpaid amount
  when an invoice exists, audit.
  Tests: int — seeded set of delivered COD orders + remittances reconciles with no variance by date and party; order
  past threshold appears flagged, within threshold not; write-off moves to WRITTEN_OFF + credit note; Staff actor
  refused.
  Accept: `npx vitest run src/modules/payments`.
  Evidence (relay #5 code 150e138; verified relay #6): same vitest run green incl. reconciliation.int.test.ts (5).

- [x] **PAY-15 Admin: remittances UI** — FR-PAY-008, 010, 011, 016.
  `admin/remittances/page.tsx` (`payments.read`): remittance list with unallocated balance, "Record remittance" form,
  `admin/remittances/[id]/page.tsx` allocation form (outstanding delivered COD orders, amount per order, over-allocation
  error), `admin/remittances/report/page.tsx` reconciliation (date range + party filter, CSV export via
  `api/payments/cod-report/route.ts`), flagged list with Owner-only write-off dialog.
  Tests: `tests/e2e/payments/remittances.spec.ts` — record, allocate across 2 orders, balance shown, over-allocation
  error, report shows zero variance. Accept: e2e green + ar/en page loads.
  Evidence (relay #7, 55c4694): `npx playwright test tests/e2e/payments/remittances.spec.ts` 3 passed (record 300.00 + 50.00 → over-allocation on order refused, nothing saved → two orders filled in full → 82.00 left shown in list + detail; 60.00 on a 50.00 remittance refused; report for the party variance 0 + zero-variance badge; CSV BOM + `300.00,218.00,82.00`; ar list/detail/report RTL screenshots checked; overdue order flagged, Staff sees no write-off, Owner needs a reason then order → WRITTEN_OFF). csv.test.ts 3 pass; tsc clean. Record/allocate gated by `payments.refund` (SHIM(payments) until CR payments.cod_remit lands).

- [x] **PAY-16 Invoice register + CSV + e-invoicing admin** — FR-ORD-025, FR-ORD-019 (Owner-visible), FR-ORD-024.
  `admin/invoices/page.tsx` (`invoices.read`): invoices + credit notes merged, columns number, type, order ref, amount,
  VAT, issued (business date), submission reference, clearance status badge (never "cleared" without reference),
  filter period (from/to business dates) / type / status; `api/payments/invoices/export/route.ts` CSV (UTF-8 BOM, same
  filters, agorot → "123.45" ILS); PDF links (PAY-17); "cancel in error" (Owner, `einvoice.manage`).
  `admin/e-invoicing/page.tsx` (`einvoice.manage`): failed/rejected documents alert list, attempts, "retry now".
  Alert banner on `admin/invoices` when any document is failing.
  Tests: e2e `tests/e2e/payments/invoices.spec.ts` — register lists seeded invoice + credit note with numbers, filter
  by period, CSV download has header + rows; with tax authority `reject` mode the alert shows and status ≠ cleared.
  Accept: e2e green.
  Evidence (relay #8): `npx playwright test tests/e2e/payments/invoices.spec.ts` 3 passed (seeded invoice + credit note listed with numbers, period/type/status filters, CSV BOM + header + `116.00,16.00` / `-29.00,-4.00` rows, reject filter CSV says Rejected never Cleared, Owner cancel-in-error needs a reason then a full 87.00 CN "Correction", Staff has no cancel button + /e-invoicing forbidden; reject mode -> alert banner + status rejected -> e-invoicing list -> retry now clears with TA- reference; ar RTL register screenshot checked). tsc clean.

- [x] **PAY-17 PDFs: VAT invoice + credit note + packing slip** — FR-ORD-006, FR-CUR-005, NFR-LOC-006, FR-CRT-007.
  `invoicing/pdf/{render.ts,invoice-html.ts,packing-slip-html.ts}`: HTML templates (lang/dir from the order locale,
  Arabic webfont embedded or system Arabic font, logical CSS), VAT invoice = invoice number, issue date, seller +
  buyer, lines, subtotal / discount / delivery / total additive + "of which VAT (16%)" non-additive, clearance
  reference or "not yet cleared"; credit note references its invoice; packing slip = order ref, recipient, address,
  lines + qty, no prices. Render with Playwright Chromium (`chromium.launch` → `page.setContent` → `page.pdf`), one
  shared browser, `server-only`. Routes `api/payments/invoices/[id]/pdf`, `api/payments/credit-notes/[id]/pdf`,
  `api/payments/orders/[id]/packing-slip` (`staffRoute("invoices.read"|"orders.read")`).
  Tests: int — each returns a `%PDF` buffer; HTML contains number + "of which" line; ar render has `dir="rtl"`.
  Accept: tests green + leader opens generated ar and en PDFs with the Read tool: Arabic joined and right-aligned.
  Evidence (relay #9): `npx vitest run src/modules/invoicing/pdf` 6 passed (ar invoice %PDF + dir=rtl + number + "منه ضريبة القيمة المضافة (16%)" + not-cleared line; en ltr; cleared only with reference; credit note references invoice; packing slip no prices; unknown ids not_found); `playwright test tests/e2e/payments/pdf.spec.ts` 1 passed (staff 200 application/pdf %PDF for invoice, credit note, packing slip; anonymous 401; unknown 404; order payment page links). Print-media screenshots of ar/en invoice, ar credit note, ar packing slip checked: Arabic joined and right-aligned, brand logo + name + contact header. tsc + eslint clean.

- [x] **PAY-18 Compliance sweep** — FR-CUR-001..004, FR-PAY-003, NFR-SEC-011, CI-002.
  Unit test `payments/compliance.test.ts`: scan `src/modules/{payments,pricing,invoicing}` + our app routes for
  currency codes other than ILS/₪, `exchange`/`fx`/`rate` currency conversion paths, float money (`toFixed` on money
  outside formatting), `name="card…"`/PAN-like patterns; webhook `raw` sanitiser strips `card*`, `pan`, `cvv`, `expiry`
  keys (unit). Document the SAQ-A argument in LEADER.md. Accept: `npx vitest run src/modules/payments`.
  Evidence (relay #9): `npx vitest run src/modules/payments/compliance.test.ts` 9 passed (no non-ILS codes, no FX path, toFixed only on the VAT-rate percentage, no card inputs outside /dev/psp, no Luhn-valid PAN literal, no card column in schema, sanitizeRaw strips card*/pan/cvv/cvc/expiry/exp_*/security_code at depth). SAQ-A argument added to LEADER.md.

- [x] **PAY-19 Contract docs + stub removal + full validation** — all.
  Remove every `STUB(contracts)` in payments; update CONTRACTS.md payments section (real functions, new exports,
  webhook event format, `/dev/psp` URL, e-invoice job) + `contracts.test.ts`; BACKLOG lines for anything deferred;
  `npm run verify` green, `npx playwright test tests/e2e/payments` green on a warm dev server; walk every admin page
  in ar + en.
  Accept: `git grep -n "STUB(contracts)" web/src/modules/payments` empty; verify + e2e evidence pasted here.
  Progress (relay #9): STUB grep in payments/invoicing/pricing already empty; CONTRACTS.md payments rows + Stubs table updated (incl. PDF routes, e-invoice job, /dev/psp, webhook); BACKLOG line added (Chromium for PDFs). REMAINING: contract.int.test.ts check vs index.ts exports, full `npm run verify`, `npx playwright test tests/e2e/payments` on a warm server, walk admin pages ar+en, paste evidence.
  Evidence (relay #10): contract.int.test.ts matches index.ts exports (contracts.test.ts 13/13 green). `npm run verify` = typecheck + eslint clean; `vitest run` 79 files/901 tests pass, only 3 fail with the known 5 s cold-import timeout (navigation-load, contracts core+catalog) and those 2 files pass 14/14 with `--testTimeout=120000`. `npx playwright test tests/e2e/payments` on warm dev server 3005: 16 passed; 3 specs (invoices, remittances, tax-authority) failed ONLY under parallel workers (shared-DB deadlock on stock_levels reset / shared tax-authority mode) and pass 7/7 with `--workers=1`. All admin pages (payments, payments/[orderId], payments/settings, refunds, remittances + [id] + report, invoices, e-invoicing, settings/vat, dev/psp, dev/tax-authority) are loaded in ar RTL and en by those specs. `git grep STUB(contracts)` in payments/invoicing/pricing empty.
