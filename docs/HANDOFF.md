# DardChat Platform — Handoff

**Last updated:** 13 September 2026
**Current client-facing documents:** `DardaChat-SRS draft-v0.1.docx` (49 pages, 235 requirements incl. 3 placeholders) and
`DardaChat-SRS draft-v0.1 - Priced options.docx` (44 options in 8 groups, price column blank). Brand spelled **DardaChat** in both.
**Next action:** boss prices the options document and the FORCED lines (see `SCOPE-TRIAGE.md` §B); chase the five blocking open issues in §3.

## 0. What happened at v0.1 (13 September 2026)

`SCOPE-TRIAGE.md` was applied. v0.9 was re-baselined as a client-facing **draft v0.1**:

- **49 requirements removed** from the SRS and placed in the priced-options companion (all of triage block C incl. Trade, minus
  the items kept for structural or brief-traced reasons: FR-RPT-005, FR-CRM-002, FR-CMS-001, FR-ADR-003, FR-ADR-010, FR-ORD-009,
  FR-AI-005, FR-CAT-012, FR-ACC-016; FR-JRN-014 rewritten as an unsupported-device gate; FR-ORD-004 rewritten as a plain filterable list).
  The six pre-existing WITHDRAWN rows also went to the options document (gift wrap, stocktake, Journey→product, expansions, POS capture) or were dropped (FR-CUR-004).
- **IDs renumbered contiguously** so the client document shows no gaps and no "withdrawn at v0.x" traces. Mapping in `docs/src/id-map-v0.9-to-v0.1.txt`.
  **Every internal document below (`REVIEW-FINDINGS-v0.8.md`, `PANEL-FINDINGS-v0.7.md`, `SCOPE-TRIAGE.md`, §3–§5 of this file) still uses v0.9 ids.**
- **§1.6 descope ladder rebuilt** from surviving S items (6 rungs), since all 11 old rungs were cut items.
- **D-list obligations softened**: NFR-SEC-002 (High/Critical only), NFR-AVL-001 (provider SLA + external monitoring), NFR-AVL-003 and NFR-SEC-009 (pre-launch / per-build, no perpetual duty), UI-006 + NFR-USA-001 (AA storefront, A + keyboard back office).
- **Review findings closed in passing**: R-5 (WRITTEN_OFF terminal), R-7 (Invoice void fields removed; cancellation by full credit note), R-8 (remittance entities append-only), R-9/R-12 (ladder), R-10 (AS-09 marker), R-11 (FR-DAT-003 → M), R-13/R-14 (offered as options OPT-E4, OPT-C1). Also fixed: §1.2/§2.2 claimed a product recommendation that OI-21 leaves open; footer said v0.7.
- **House style**: no em-dashes anywhere; brand `DardaChat`; revision history collapsed to one 0.1 row.
- Build now depends on `docs/src/node_modules` (`npm install docx` done). `node docs/src/build-srs.js <out.docx>` and `node docs/src/build-options.js <out.docx>`.
  After building, open in Word once and update the TOC field (done via COM for the shipped copy). v0.9 sources archived in `docs/src/archive-v0.9/`.

---

## Everything below is the v0.9 state, kept for provenance. Ids are v0.9 ids.

## 1. Where things stand

### Artifacts

| File | What it is |
|---|---|
| `docs/ORIGINAL-BRIEF.md` | **The client's request, verbatim.** Everything below derives from it. Read this first if you want to know what was actually asked for versus what was later inferred |
| `docs/REVIEW-BRIEF.md` | One-page business and system summary for handing to an external reviewer |
| `docs/SRS-DardChat-v0.9.docx` | The specification. Client-facing. Generated, not hand-written |
| `docs/SRS-DardChat-v0.9.md` | Plain-text extraction of the same, for grepping and for agent review |
| `docs/REVIEW-FINDINGS-v0.8.md` | Review of v0.8. Five findings fixed at v0.9; nine left as known issues, with reasons |
| `docs/src/` | The build sources — `build-srs.js`, `criteria.js`, and the Python check scripts |
| `docs/PANEL-FINDINGS-v0.7.md` | Raw output of the seven-reviewer panel — 56 findings, unfiltered. Superseded by §4 but kept for provenance |
| `docs/dardachat-client-form.gs` | Apps Script that builds the client questionnaire as a Google Form |
| `docs/HANDOFF.md` | This file |
| `notes.txt` (project root) | Obaida's raw notes from the client meeting. All items now applied — see §5 |
| `DardChat — أسئلة المشروع _ Project Questions.csv.zip` | The client's completed form responses |

### Version history

- **v0.1–v0.4** — drafting and two review cycles. v0.4 responded to an external agent review.
- **v0.5** — client answers applied. Nine assumptions closed, AS-05 and AS-11 overturned.
- **v0.6** — assistant model fixed as Google Gemini 2.5 Flash. No other change.
- **v0.7** — right-sized against the real product range and audience. Concurrency cut 10×, seasonality added, five requirements deferred or withdrawn.
- **v0.8** — defect remediation. All 16 blocking and 12 major entries from the v0.7 register closed. 26 requirements added, one withdrawn. Payment state split from fulfilment state; invoicing modelled; four decisions taken (§3).
- **v0.9** — four corrections to v0.8, found on review: invoice issuance at first dispatch, completion preconditions re-expressed as "no further money expected", the reservation sweep scoped to PENDING, and the Journey payload budget corrected to 1 MB with its derivation stated. No new scope; requirement count unchanged.

### Commercial position

Estimate stands at roughly **197 person-days** for the full scope including the 3D Journey,
plus **5–9 days** net from the v0.5 client answers, **minus** whatever v0.7's deferrals save.

v0.8 adds scope that was previously missing rather than merely misdescribed, and it should be
re-estimated before the next quote goes out. The material additions are the invoice and credit
note entities with their numbering and register (FR-ORD-024 to 026), the courier delivery-outcome
return path (FR-ORD-027, 028), reservation expiry and its sweep (FR-INV-012, 013), the cash
remittance model (FR-PAY-016), and the payment state machine itself. None of these are gold
plating — each closes a defect that would have surfaced in build — but none were in the 197.

E-invoicing remains unpriced until the certification route is known (OI-17) and should be quoted
as a separate line item. The Journey's reduced-fidelity path is now explicitly a **change order**
(OI-24), priced at nothing until its medium is agreed; see D-2 in §3. Day rate has never been
supplied, so all figures are stated against a $260/day placeholder.

---

## 2. Confirmed facts

Do not re-litigate these. They came from the client's completed questionnaire and from
Obaida's notes.

| | |
|---|---|
| **Market** | One country, ILS only. No second currency anywhere |
| **Products** | Boxed conversation games: question cards + challenge cards + physical props. At least one includes a printed board |
| **Range** | Five titles at launch, under 25 within two years. Standalone games, not variants or expansions of one another |
| **Seasonality** | Two of five titles are Ramadan-tied, published ahead of the season and withdrawn after |
| **Audience** | ~2,900 social followers, ~200 posts. Best-performing post 226 likes |
| **Channels** | Website (new) + third-party shops that stock the brand + events. Shops are supplied outside this system |
| **Stock** | The website sells from a quantity **allocated to it**. Shop and event sales do not consume it |
| **Dispatch** | **Two origins from day one** — a store room and a household address |
| **Courier** | ESP. No API, and **no customer-facing tracking numbers** |
| **Payments** | Business banking exists; **no merchant account**. Intended providers named. Cash on delivery offered |
| **Tax** | **Electronic invoicing to the tax authority is required.** VAT registration status still unknown |
| **Messaging** | No verified WhatsApp Business account. Social media only, no email platform to retain |
| **Team** | A small team. Two back-office roles: Owner and Staff |
| **Approver** | Raneem Nasser Al-Din |
| **Assistant model** | Google Gemini 2.5 Flash |
| **History** | Past orders and receipts exist **on paper**. Whether any is loaded at launch is undecided |
| **Workshops** | Run separately from products, possibly prepaid. **Out of scope**, recorded as a future need |

---

## 3. Decisions and blockers

### Decisions taken at v0.8 — closed

All four were open at v0.7. Three took the handoff's own recommendation; one was referred to Obaida.

| # | Decision | Resolution |
|---|---|---|
| D-1 | Can checkout accept an out-of-stock order? | **No.** FR-INV-005 holds at checkout; backorder exists only for a shortfall discovered at picking, against stock the system believed it held. FR-ORD-022 rewritten, and the shortfall is now a real quantity on the order line (FR-INV-014) rather than a reservation against stock that does not exist |
| D-2 | What medium is the Journey's reduced-fidelity path? | **Left open, raised as a priced change order** (OI-24, FR-JRN-027). FR-JRN-015 now states the obligations that hold whatever medium is chosen — same scenes, same choices, same server-side scoring, same result, same time-to-interactive. Note when pricing it that NFR-USA-002 already commits us to a text alternative path as a Must, so the cheap end of the range is partly paid for already |
| D-3 | Is the order record event-sourced or mutable-with-audit? | **Mutable current-state rows, journaled.** FR-DAT-006 now names the six append-only entities explicitly and makes everything else a current-state row with a journal behind it. §4.6 and §4.12 are not re-priced |
| D-4 | When is an invoice issued — prepaid vs COD? | **On the first dispatch of any line for prepaid, on the first delivery for COD** (FR-ORD-024, tightened at v0.9 — the original wording left a two-consignment order uninvoiced). One invoice per order; a later consignment does not issue a second. A cancelled order that never reached its trigger carries no invoice and needs no credit note |

### Blocking — from the client

Now all five in the **Blocking** table of Appendix C. OI-17 was promoted from Administrative at v0.8,
where it had been gating a Floor-level Must from the lowest tier of the register with no owner.

| Ref | Question | Note |
|---|---|---|
| OI-01 | Payment provider onboarding — not started | **Longest lead item in the project** |
| OI-02 | The Journey concept document — still not supplied | §4.15 cannot be completed without it, and it gates OI-24 |
| OI-17 | E-invoicing certification route, submission format, test environment | **Second long-lead item.** Gates six requirements below the Floor |
| OI-23 | The ESP courier file format. Nobody holds it | FR-ORD-008 is now written to a configurable column set, so its absence no longer blocks the build — but it still blocks acceptance |
| OI-25 | Which data protection regime applies | Five Must requirements are specified against a regime nobody has named |

### Material — still open

| Ref | Question |
|---|---|
| OI-07 | VAT registration status. **Ask again.** They answered "e-invoicing: yes" but "VAT: not sure", and those normally travel together. One answer is probably wrong |
| OI-13 | Whether any paper order history is entered at launch, and by whom |
| OI-19 | Customer reviews with photos — in scope or not? |
| OI-20 | Is gift buying a significant use case? |
| OI-21 | Does the Journey exist to sell games, or is it purely brand? |
| OI-22 | Which titles actually sell? Engagement favours two heavily, but the top performers are video posts and engagement is not sales |
| OI-24 | The Journey fallback medium — change order, see D-2 |

---

## 4. Defect register — status at v0.8

Every entry from the v0.7 register is closed. The table records where each was fixed so a
reviewer can check the fix rather than take this file's word for it.

### Blocking — all 16 closed

| # | Was | Fixed by |
|---|---|---|
| B-1 | State model could not express a refund | Payment state split out into Appendix A.3 and A.4. REFUNDED removed from the fulfilment model; PAID→CANCELLED and COD_CONFIRMED→CANCELLED added; FR-PAY-013 |
| B-2 | COD refunds had no path | FR-PAY-014, FR-PAY-015. A refund is now permitted from any state in which money was received, without requiring a return |
| B-3 | VAT double-counted in the total | FR-CRT-009 rewritten to non-additive: subtotal − discount + delivery = total, VAT shown as an "of which" line. FR-CRT-012 states delivery VAT and discount allocation |
| B-4 | E-invoicing mandatory, invoice did not exist | Invoice and CreditNote entities in §5.2; FR-ORD-024 (issuance trigger), 025 (gapless series, distinct from the order reference), 026 (register) |
| B-5 | Backorder contradicted no-oversell | D-1. FR-ORD-022 rewritten; FR-INV-014 gives the shortfall a real quantity |
| B-6 | Immutability made the system unbuildable | D-3. FR-DAT-006 names the append-only entities; FR-DAT-008 reconciles it with the erasure duty |
| B-7 | Reserved stock never released | FR-INV-012 — configurable TTL, five-minute sweep, cancellation and customer notification |
| B-8 | Payment retry did not re-reserve | FR-INV-013, and the A.2 transition now carries the side effect |
| B-9 | FR-CUR-004 mandated conversion CON-01 forbids | Withdrawn. FR-CUR-002, 003, 005 raised to Must. CON-10's exchange-rate reference removed |
| B-10 | One dispatch origin, but AS-09 closed at two | FR-ADR-009 raised to Must at two origins; FR-ADR-011 adds the assignment rule; Order carries `origin_location_id` |
| B-11 | Assistant inherited session privileges | FR-AI-020 — fixed service identity, closed tool grant, unavailable in back office routes. §2.3 rewritten |
| B-12 | Corpus promotion was a persistent injection channel | FR-AI-016 widened to every input the assistant did not author; FR-AI-011 requires Owner-authored wording; FR-AI-021 records the corpus revision per response |
| B-13 | Journey performance targets arithmetically impossible | FR-JRN-024 sets time-to-interactive at 8 s; NFR-PERF-007 derived from it at 1.5 MB; NFR-PERF-008's blanket exemption narrowed |
| B-14 | Fallback path had no defined medium | D-2. FR-JRN-015 states the obligations, FR-JRN-027 holds the medium open at OI-24 |
| B-15 | Journey telemetry captured before consent | FR-JRN-019 rewritten: aggregate counters only before consent, per-choice data and joinable tokens only after |
| B-16 | Data-subject rights undefined at the point of risk | FR-DAT-009 defines a verified request and refuses to automate anything weaker; FR-DAT-010 states the window as 30 days |

### Major — all 12 closed

| # | Was | Fixed by |
|---|---|---|
| M-1 | Stale §4.8 note asserting the reverse of AS-05 | Deleted. Swept for other stale conditional notes; none remain |
| M-2 | §5.2 enums missing wallet/transfer, carrying withdrawn reason codes | `payment_method` now card, wallet, instant_transfer, cod. `StockMovement.reason` drops sale_pos, sale_event, stocktake and gains loss_in_transit |
| M-3 | Descope ladder offered already-deferred rungs | Both removed; ladder renumbered; row 5's AS-16 contradiction fixed |
| M-4 | NFR-PRV-006 parked on a closed assumption | Split. The regime is now blocking at OI-25 in its own right |
| M-5 | CANCELLED defined pre-dispatch, reachable post-dispatch | A.1 redefines it; FR-ORD-011 and FR-ORD-018 reconciled |
| M-6 | COD remittance not modelled | CashRemittance and RemittanceAllocation in §5.1 and §5.2; FR-PAY-010 and FR-PAY-016 |
| M-7 | Courier interface read as "confirmed" with no outstanding work | §3.3 now reads "Channel confirmed; file format NOT held (OI-23)" in red |
| M-8 | Delivery outcomes had no route back in | FR-ORD-027 (outcome intake), FR-ORD-028 (ageing list and lost-in-transit write-off), LOST_IN_TRANSIT state |
| M-9 | Messaging flows unclassified | FR-MSG-008 classifies each. Back-in-stock is transactional, which resolves the FR-INV-011 contradiction |
| M-10 | Arabic stemming was an unreachable Must | FR-SRC-002 now occupies rung 7 of the descope ladder |
| M-11 | NFR-SEC-002 criterion weaker than the requirement | Rewritten: no unremediated finding at any severity; acceptances require a written Owner rationale |
| M-12 | OI-17 filed as Administrative | Promoted to Blocking with an owner |

### Minor — all 5 closed

m-1 cover date now 2 September 2026 · m-2 FR-ADR-001 now lists six fields to match its criterion ·
m-3 landed cost removed from FR-CAT-013 and from §1.3 · m-4 §2.3 visitor volume reconciled with
NFR-SCL-001 · m-5 FR-JRN-025 covers a mid-experience fidelity switch.

### Raised during remediation, fixed in the same pass

Not in the v0.7 register; found while making the above changes.

- FR-ORD-006 rendered "a VAT invoice" with no invoice record behind it. Now renders the Invoice entity, carrying its number.
- Appendix A.2 had no PARTIALLY_DISPATCHED→DELIVERY_FAILED transition, so a split order whose consignment failed had nowhere to go. Added, with a note stating that outcomes are per consignment and the order state is the aggregate.
- §7's verification instrument for 4.9 still cited landed-cost allocation, withdrawn at v0.7.

---

## 5. notes.txt — all items applied

Kept for audit. Every line of Obaida's meeting notes is now reflected in the document.

| Note | Where |
|---|---|
| Insufficient stock → delay, not cancel | FR-ORD-022, and D-1 bounds it to picking-time shortfall |
| Support agent | §4.14 |
| Warehouse/manager/admin are the same person | Two roles, Owner and Staff (FR-ACC-010) |
| Payment providers, neutral wording | CON-03, §4.4 note |
| CON-05 all numbers · clarify CON-06, 07, 08 | Rewritten at v0.5 in plain language |
| AS-08, AS-10, AS-13, AS-15 | Closed or rewritten at v0.5 |
| AS-16 delete language axis | v0.5, and the last surviving mention removed from §1.6 at v0.8 |
| AS-19 every two weeks · AS-21 60 months | FR-MSG-010, FR-DAT-002 |
| AS-23 remove | Withdrawn; identifiers are permanent so the row remains marked withdrawn |
| Remove USD entirely | Completed at v0.8 — FR-CUR-004 was the last survivor |
| No QR support | §1.2, §3.2 |

One note is not a software requirement and is deliberately not in the SRS: **running costs**.
Hosting, the model API, WhatsApp template fees, object storage and the search service all carry
monthly cost, and the client has never been given a figure. That belongs in the commercial
proposal, not here, but it should not be forgotten — the assistant and the Journey CDN are the
two that scale with success.

---

## 6. How to rebuild the document

**The .docx is generated. Do not hand-edit it** — the next build overwrites your changes.

Source now lives in the repository at `docs/src/`, not in a session scratchpad:

```
build-srs.js     the document: structure, requirements, tables, appendices
criteria.js      acceptance criteria, keyed by requirement ID
```

Build:

```bash
node docs/src/build-srs.js "D:/Personal/Projects/DardaChat-E-store/docs/SRS-DardChat-v0.9.docx"
```

**Dependency note.** `build-srs.js` requires the `docx` npm package, which is *not* installed
in `docs/src`. It currently resolves from an old session scratchpad via `NODE_PATH`:

```bash
NODE_PATH="C:/Users/Obaida/AppData/Local/Temp/claude/D--Personal-Projects-DardaChat-E-store/ad469dfb-e549-48c3-984a-69b6d2d05b2b/scratchpad/node_modules" node docs/src/build-srs.js <out.docx>
```

That directory is temporary and will eventually be cleaned up. Before the next revision, run
`npm init -y && npm install docx` inside `docs/src` so the build stops depending on it.

Two build gates will refuse to produce a file:

- every requirement must have an acceptance criterion in `criteria.js`
- every `[ASSUMPTION]` marker must cite an `AS-##` register entry

Requirement IDs are permanent. Adding one by splitting another keeps the next free
number; the generator sorts rows for display so they still read in sequence. Withdrawn
requirements stay in place marked `W`, never deleted.

Rendering and checking (LibreOffice is not installed; Word COM is used instead). Set
`PYTHONIOENCODING=utf-8` or the Arabic-token check crashes on the cp1252 console:

```bash
python docs/src/docx2md.py <docx> <md>    # flatten to markdown for grepping / agent review
python docs/src/check.py <docx>            # XML integrity, counts, Arabic survival
python docs/src/extract.py                 # requirement count and priority spread
python docs/src/pageaudit.py <pdf>         # blank pages, orphans, short pages
```

Word must be closed before overwriting a docx it has open, or the write fails with a
file lock.

**v0.8 build state:** 56 pages, 284 requirements (196 M / 73 S / 9 C / 6 W, plus 4 reserved
placeholders), 52 tables, 36 Arabic tokens intact, no malformed XML, no blank pages. The three
short pages flagged by `pageaudit.py` are the title page, the end of the contents, and the
closing status line — all expected.

---

## 7. Provenance, and what this round did not do

The v0.7 panel was seven independent reviewers, each with a distinct lens: requirements
engineering, internal consistency, security and privacy, e-commerce domain, buildability,
the Journey and assistant specifically, and a completeness critic. All seven completed and
produced 56 findings.

**Its adversarial verification stage never ran.** The workflow script passed `parallel()`
an array of promises instead of thunks, which killed all 96 verification agents; a session
usage limit then ended the run. Sixteen entries were later verified by hand.

**What v0.8 did about that.** Every register entry marked *unverified* was confirmed against
the v0.7 text before being acted on — the `.md` extraction makes this about one grep per
finding. All of them held up, which is worth knowing but was not knowable in advance. No
finding was dismissed as false; several had their severity honoured rather than argued with.

**What v0.8 did not do.**

- It did not re-run the panel. Every fix above is unreviewed by anyone but its author, which
  is precisely the condition that produced the v0.7 defects in the first place.
- It did not verify the fixes against a fresh adversarial pass. A remediation session is the
  worst possible judge of its own remediation.
- It took three of the four blocked decisions on the handoff's own recommendation rather than
  on Obaida's confirmation. Each is recorded in §3 and each is defensible, but they are
  supplier decisions on client-affecting matters and should be confirmed rather than assumed.

**Next: re-run the panel against v0.8 with the `parallel()` bug fixed**, so verification
actually runs. That is what separates real findings from plausible ones, and neither round
has had it yet.
