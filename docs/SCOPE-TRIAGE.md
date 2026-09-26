# Scope triage — draft v0.1 vs the original brief

> **Applied 13 September 2026.** See `HANDOFF.md` §0 for what was cut, what was kept against this triage and why, and the id map. Ids below are v0.9 ids.

The brief is 14 sentences. The SRS is 288 requirements, 187 marked Must.
Priority was set on engineering judgement, not on what the client asked for.
So "Must" in this document does not mean "the client demanded it".

Rule used: **CORE** = traces to a line in `ORIGINAL-BRIEF.md`. **FORCED** = not asked,
but the business can't legally or operationally run without it. **INVENTED** = everything else.

---

## A — CORE (~145 reqs). Asked for. Already priced. Build it.

Catalogue basics · cart and checkout · card payment · orders · inventory ·
accounts and admin roles · purchasing · customer records · messaging ·
basic reports · AI assistant · the Journey · policy pages · responsive UI

---

## B — FORCED (~50 reqs). Not asked. Unavoidable. Charge as separate lines.

| Block | Refs | Why | Watch |
|---|---|---|---|
| E-invoicing | FR-ORD-019, 020, 021, 024, 025, 026 | Legally required | Can't be priced until OI-17 |
| COD + cash remittance | FR-PAY-001, 008, 010, 011, 014, 015, 016 | Client offers COD | A small accounting subsystem |
| Payment state machine | FR-PAY-013, App. A.3/A.4 | Refunds impossible without it | Invisible to client |
| Two dispatch origins | FR-ADR-009, 011 | Confirmed at two | Was assumed one |
| Courier, both ways | FR-ORD-008, 027, 028 | ESP has no API | Manual out, manual back |
| Reservation expiry | FR-INV-012, 013, 014 | Else abandoned carts empty the shop | |
| VAT-inclusive maths | FR-CRT-009, 012, FR-CUR-006, 007 | Market convention | Wrong = every total wrong |
| Full RTL | UI-002, NFR-LOC-001 to 006 | Market | Layout inversion, not translation. Big |
| WhatsApp / Meta | FR-MSG-005, 006 | Meta gates approval | No delivery date possible |
| Data rights | FR-DAT-004, 005, 009, 010, NFR-PRV-* | Legal | Regime unknown (OI-25) |

**None of this is in the 197-day estimate.**

---

## C — INVENTED (~70 reqs). Nobody asked. Cut.

### Cut hard

| Ref | What | Why cut |
|---|---|---|
| FR-SRC-002 | Arabic stemming | Marked Must. Doc's own words: most expensive optional item. Five products |
| FR-JRN-014, 015, 025, 026, 027 | Dual-fidelity Journey | A second full build. 50× cost range. Already a change order (OI-24) |
| NFR-USA-002 | Text-alternative Journey | A third build of the same content. Marked Must |
| FR-CAT-003, 004 | Variant axes, bundles | Neither exists in the range |
| FR-CAT-011 | Bulk CSV import | Five products |
| FR-SRC-003 | Faceted filtering | Five products |
| FR-AI-013 | Eval set gating releases | An AI test harness, maintained forever |
| FR-RPT-003, 004 | Margin, stock valuation | Accounting done elsewhere |
| FR-RPT-005, 006 | Funnel, cohorts | Analytics product, not a shop |
| FR-CRM-002, 003, 005 | LTV, timeline, 6 segments | CRM-001 + 004 already covers the ask |
| FR-MSG-008 | 4 marketing flows | Each is its own product |
| FR-MSG-009 | Web push | Marked Must, yet CON-08 says iOS reach ≈ 0 |
| FR-CMS-001, 002, 003 | CMS, blog, banner | Static pages would do |
| FR-PUR-005, 006, 007 | Cost history, reorder suggestion | PUR-001 to 004 covers "purchasing" |

### Trade — cheap, but name a price before giving it away

FR-CAT-009 scheduled publish · FR-CAT-010 rule collections · FR-CAT-012 SEO + redirects ·
FR-SRC-004 URL filters · FR-SRC-005 related products · FR-SRC-006 no-result recovery ·
FR-CRT-007 promo codes · FR-CRT-011 abandoned checkout · FR-ACC-008 wishlist ·
FR-ACC-016 breached passwords · FR-ADR-003 map pin · FR-ADR-007 weight rates ·
FR-ADR-008 free delivery · FR-ADR-010 delivery estimate · FR-ORD-004 saved views ·
FR-ORD-009 returns · FR-ORD-015 prepay threshold · FR-INV-010 low stock ·
FR-INV-011 back in stock · FR-CRM-006 tags · FR-CRM-007 segment export ·
FR-MSG-011 engagement events · FR-RPT-008 assistant metrics · FR-RPT-010 scheduled email ·
FR-AI-005 streaming · FR-AI-010 transcripts · FR-AI-011 corpus promotion ·
FR-AI-018 tool logging · FR-AI-019 abuse handling · FR-AI-021 corpus revisions ·
FR-JRN-005 resume · FR-JRN-009 share image · FR-JRN-013 replay history · FR-JRN-019 analytics

---

## D — OBLIGATIONS. Not features. These are the ones that hurt. Renegotiate before signing.

| Ref | Commitment | Exposure |
|---|---|---|
| NFR-SEC-002 | Zero OWASP findings, **any** severity | Blank cheque. Any tester finds a Low |
| NFR-AVL-001 | 99.5% uptime SLA | We don't run the infrastructure |
| NFR-AVL-003, NFR-SEC-009 | Annual restore drills, 7-day patching | Forever, unpaid, no maintenance contract |
| NFR-USA-001 | WCAG 2.2 AA, incl. back office | Easy to fail. Back office serves two people |
| NFR-PERF-001 to 009 | Hard numbers on a Galaxy A54 | An acceptance stick |
| FR-DAT-010 | 30-day data requests | Legal promise, law nobody has named |
| FR-INV-005, FR-ORD-025 | Concurrency proofs under load | Load tests, uncosted |
| NFR-SCL-001 | Load test 50 / 300 / 1,000 | Uncosted |
| NFR-MNT-001, 002, 003 | IaC, staging, rollback | Three extra deliverables |

---

## The fix

1. **Signed spec** = A + B, with every B item a visible priced line.
2. **Annex B, priced options** = all of C. Client ticks what they want. Turns 70 free features into a second sale.
3. **D** gets renegotiated clause by clause, before signature.

**Where the damage came from.** Three phrases in the brief:
*"complete e-commerce store"*, *"future scalability"*, *"analytics, reports"*.
One line each from the client; dozens of requirements each in the document.
Pin those down in writing before baselining.
