# Review findings — SRS-DardChat-v0.8

**Reviewed:** 3 September 2026
**Against:** `SRS-DardChat-v0.8.docx` / `.md` — 56 pages, 284 requirements
**Method:** solo senior review, plus a mechanical pass over the built document
(dangling references, register coverage, state-machine reachability, priority inversions,
descope-ladder dependencies). Script kept at `scratchpad/reviewv08.py`.

**Provenance warning.** This review was carried out by the same session that produced v0.8.
That is the condition §7 of the handoff explicitly warns about. Ten of the fourteen findings
below are defects introduced *by the v0.8 remediation itself*, which is some evidence the
review is not merely rubber-stamping — but it is not a substitute for the independent panel
re-run, and it should not be treated as one.

Every finding below was confirmed against the built document text. None are leads.

**Disposition, 3 September 2026.** Five findings — R-1 through R-4 and R-6 — were fixed at v0.9.
They were the ones that would be built wrong or that held someone to a wrong number. The rest
were left deliberately: R-5, R-7 through R-12 are document hygiene that changes nothing about
what gets built, and R-13 and R-14 are missing scope that needs a pricing decision before it can
be drafted. They are recorded here as build-time known issues, not as work in flight.

---

## Mechanical pass — clean

| Check | Result |
|---|---|
| Requirement IDs cited but never defined | None, except `NFR-MNT-005/006`, deliberately retired and explained in §2.7 and §6.7 |
| `AS-##` cited but not in the register | None (23 defined, 23 cited) |
| `OI-##` cited but not in Appendix C | None (25 defined, 25 cited) |
| `CON-##` cited but not in §2.5 | None (10 defined, 10 cited) |
| Fulfilment machine: unreachable states | None (15 states, 30 transitions) |
| Fulfilment machine: dead ends not marked terminal | None |
| Payment machine: unreachable states | None (9 states, 14 transitions) |
| State names in prose absent from both tables | None |
| Acceptance criterion coverage | 100%, enforced at build |

---

## Blocking — an order can be legally uninvoiced, or stuck forever

### R-1 — FIXED at v0.9 — A prepaid order dispatched in two consignments is never invoiced
**Appendix A.2, FR-ORD-024. Introduced at v0.8.**

`PROCESSING → DISPATCHED` carries the side effect "invoice issued where prepaid".
`PARTIALLY_DISPATCHED → DISPATCHED` carries only "Second consignment recorded".

So a prepaid order that goes `PROCESSING → PARTIALLY_DISPATCHED → DISPATCHED` — which
FR-ORD-005 explicitly permits — reaches full dispatch having never crossed the transition
that issues the invoice. Electronic submission is a legal obligation (AS-11), so this is not
a cosmetic gap: it is an order that ships without a tax document and without anything in the
system noticing.

**Fix:** make issuance a consequence of the order reaching a dispatched condition, not of one
named transition. Either add the side effect to `PARTIALLY_DISPATCHED → DISPATCHED`, or state
in FR-ORD-024 that the trigger is the first dispatch of an order and that subsequent
consignments do not re-issue.

### R-2 — FIXED at v0.9 — A partially refunded delivered order can never complete
**Appendix A.2. Introduced at v0.8.**

`DELIVERED → COMPLETED` requires "payment_state is terminal (PAID, COD_SETTLED or REFUNDED)".
`PART_REFUNDED` is not in that list, and neither is `WRITTEN_OFF`.

A goodwill refund on a damaged box — the single most common partial refund in a games
business — leaves the order in `DELIVERED` permanently. It never completes, it never leaves
the operational queue, and any report keyed on COMPLETED silently under-counts.

**Fix:** the precondition should be that the payment state admits no further expected
movement — PAID, COD_SETTLED, PART_REFUNDED, REFUNDED, COD_CANCELLED or WRITTEN_OFF.

### R-3 — FIXED at v0.9 — A returned COD order that was never paid for is stuck in RETURNED
**Appendix A.2. Introduced at v0.8.**

`RETURNED → COMPLETED` requires "payment_state is REFUNDED or PART_REFUNDED". A COD order
refused at the door and returned was never paid for, so there is nothing to refund and its
payment state is `COD_DUE` or `COD_CANCELLED`. It can reach RETURNED and can never leave.

This is the same defect as R-2 in a different corner: the completion rule assumes money was
taken. On a COD-heavy business that assumption is wrong more often than it is right.

**Fix:** as R-2 — complete when no further money is expected, whether or not any moved.

### R-4 — FIXED at v0.9 — FR-INV-012's sweep, read literally, cancels every COD order
**FR-INV-012. Introduced at v0.8.**

The requirement says a reservation "created by an unpaid order" carries a time to live, and
that the sweep shall "cancel orders whose reservation has expired without payment". A COD
order is unpaid by definition until the courier delivers it — which is days later, and always
after any sensible TTL.

Appendix A.2 scopes the transition correctly (`PENDING → CANCELLED`), but the requirement text
does not, and the requirement is what gets built and tested. FR-PAY-001 makes COD a Must, so
this is a direct collision between two Must requirements.

**Fix:** scope FR-INV-012 to orders in PENDING — that is, awaiting a prepayment that has not
arrived — and say so in the requirement, not only in the appendix.

### R-5 — WRITTEN_OFF is a dead end that is not declared terminal
**Appendix A.3, A.4. Introduced at v0.8.**

`WRITTEN_OFF` has an inbound transition from `COD_DUE` and no outbound, but its meaning column
does not say "Terminal" — the marker every other absorbing state in both machines carries.
Appendix A's own preamble states that terminal states admit no further transition, which makes
an undeclared dead end ambiguous rather than merely untidy.

It is also probably wrong on the business: written-off cash sometimes turns up. There should
either be a recovery path back to `COD_SETTLED`, or an explicit statement that recovery is
handled outside the system.

**Fix:** decide which, and label it.

---

## Major

### R-6 — FIXED at v0.9 — NFR-PERF-007's 1.5 MB budget does not fit FR-JRN-024's 8 seconds
**NFR-PERF-007, FR-JRN-024. Introduced at v0.8.**

FR-JRN-024 sets time-to-interactive at 8 s on the NFR-PERF-009 configuration, and states that
the byte budget "is derived from this figure". It is not.

At 1.6 Mbps the transfer rate is 200 KB/s. 1.5 MB is **7.5 s of transfer alone**, before the
~0.5 s of connection setup implied by a 150 ms round trip and before any parse, decode, texture
upload or first render. Realistic total is 9.5–10.5 s against an 8 s budget.

Working backwards instead: 8 s, less ~0.5 s connection and ~2 s of decode and execution, leaves
~5.5 s of transfer, which is ~1.1 MB. **The budget should be 1 MB**, with the derivation stated
so the next person can check it.

This is the same arithmetic error as B-13 — the defect NFR-PERF-007 was rewritten to fix —
committed in the fix for it. The lesson is not that 8 MB was a silly number; it is that a
payload budget written without dividing by the network rate is a guess, whoever writes it.

### R-7 — Invoice is declared append-only and carries mutable void fields
**FR-DAT-006, §5.2. Introduced at v0.8.**

FR-DAT-006 names Invoice as append-only: "once written, a row shall not be updated or deleted".
The Invoice entity in §5.2 carries `voided_at` and `void_reason`, and setting them is precisely
an update to that row.

**Fix:** either model a void as a compensating record the way a refund is modelled as a
CreditNote, or move Invoice to the mutable-with-journal list. The first is more consistent with
how the rest of the financial model now works.

### R-8 — Remittance records fall under neither half of FR-DAT-006
**FR-DAT-006, §5.2. Introduced at v0.8.**

`CashRemittance` and `RemittanceAllocation` were added at v0.8 and appear in neither the
append-only list nor the mutable list. They record money received, so their mutability rule is
not an academic question — it decides whether a mis-keyed allocation is corrected or reversed.

### R-9 — A Must sits on the descope ladder, contradicting §1.5
**§1.6 rung 7, FR-SRC-002. Introduced at v0.8.**

§1.5 defines M as "release blocking" and S as "deferrable under pressure". FR-SRC-002 is M and
now occupies rung 7 of the withdrawal ladder. Both statements cannot hold.

The intent was right — the panel was correct that an unreachable expensive Must is a defect —
but the execution created a definitional contradiction instead of resolving one.

**Fix:** demote FR-SRC-002 to S (it is genuinely deferrable — FR-SRC-001 still gives literal
search), or state explicitly in §1.6 that rung 7 crosses the Must line and needs a contract
variation rather than the written agreement the other rungs need.

### R-10 — `[ASSUMPTION AS-09, closed]` misuses the marker convention
**FR-ADR-009. Introduced at v0.8.**

§1.5 defines `[ASSUMPTION]` as "we chose a sensible default that should be confirmed or
corrected", and the build gate enforces only that a marker cites a register entry — it cannot
tell an open assumption from a closed one. Citing a closed assumption inside the marker inflates
the apparent open-assumption count and blunts the marker's meaning.

**Fix:** drop the marker and reference AS-09 in plain prose, as other closed assumptions are
referenced.

---

## Pre-existing — missed by the v0.7 panel and not addressed at v0.8

### R-11 — A Must requirement is governed by a Should
**FR-JRN-022 (M) cites FR-DAT-003 (S).**

FR-JRN-022 guarantees that an anonymous Journey session stays unlinked to any identity
"and shall be governed by FR-DAT-003" — the 90-day reduction of anonymous sessions, which is a
Should and therefore deferrable. A Must whose privacy guarantee rests on a deferrable
requirement is not actually a Must. This is the only priority inversion in the document; the
mechanical pass found no others.

### R-12 — Descoping rung 6 orphans a requirement that is not on the ladder
**§1.6 rung 6 (FR-JRN-019) and FR-RPT-007.**

FR-RPT-007 reports Journey starts, completions and completion rate. Its only event source is
FR-JRN-019, which sits at rung 6. Withdraw rung 6 and FR-RPT-007 survives with nothing to report
on — it is not itself on the ladder at any rung.

**Fix:** pair them at the same rung, or note the consequence in rung 6's row.

### R-13 — No order can be amended after placement beyond its address
**§4.6.**

FR-ORD-013 permits correcting the delivery address, recipient name and phone. Nothing permits
changing a quantity, removing a line, cancelling part of an order, or applying a goodwill
discount — all of which a small shop does by phone, weekly. Today the only route is cancel
and re-place, which loses the order reference, the invoice position and the customer's place in
the reservation queue.

Note this interacts with R-2: goodwill discounts are how partial refunds arise in the first
place, and neither the amendment nor the completion path currently supports them.

### R-14 — Promotion codes are consumed but nothing creates them
**FR-CRT-007.**

FR-CRT-007 accepts a promotion code at checkout and displays the discount. No requirement
anywhere lets an Owner create a code, set its value, scope it to products, bound it by date, cap
its uses or withdraw it. `discount` exists on the Order entity; the thing that produces it does
not exist in the specification.

---

## Suggested disposition for v0.9

Ordered so the state-machine work lands together.

1. **R-2, R-3, R-5** — one pass over the completion preconditions and the WRITTEN_OFF label.
   All three are the same underlying mistake: completion rules written as if money always moves.
2. **R-1** — make invoice issuance a property of reaching dispatch, not of one transition.
3. **R-4** — scope the reservation sweep to PENDING in the requirement text.
4. **R-6** — recompute the payload budget to 1 MB and state the derivation.
5. **R-7, R-8** — settle mutability for Invoice and the remittance records.
6. **R-9, R-10** — the descope-ladder contradiction and the marker misuse.
7. **R-11, R-12** — the priority inversion and the ladder dependency.
8. **R-13, R-14** — new requirements; these change the estimate and need Obaida's decision
   before drafting, not after.

R-1 through R-8 are corrections to work done at v0.8 and carry no new scope. R-13 and R-14 add
scope and should be quoted.

**Then re-run the panel.** This review is the author marking their own homework, and its main
value is that it found ten defects in that homework — not that it proves there are no more.
