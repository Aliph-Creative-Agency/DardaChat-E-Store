# DardChat SRS — briefing for reviewers

Read this before reviewing `SRS-DardChat-v0.9.docx`. It exists so your effort goes on
real defects rather than on things that are deliberate.

---

## The business

A very small brand selling **boxed conversation games in Arabic**. A box holds deep
social and psychological question cards, challenge cards, and the physical props needed
to carry the challenges out; at least one title also includes a printed board. **Five
titles at launch, fewer than 25 within two years** — they are standalone games, not
variants or expansions of one another.

**Two of the five are tied to Ramadan**, published ahead of the season and withdrawn
after it, so demand is seasonal rather than flat. The brand has roughly **2,900 social
followers** and sells today through shops that stock it and at events. **A small team
runs the whole operation.**

Constraints that shape the whole specification:

- One country, **ILS only** — no second currency anywhere in the system
- **Cash on delivery** is a primary payment method, and no merchant account exists yet
- **Electronic invoicing to a tax authority is mandatory**
- The courier has **no API and issues no customer-facing tracking numbers** — fulfilment
  handoff is a manual CSV export
- **Two dispatch origins from day one**, one of which is a household address
- Addresses have no reliable postal codes; they are captured as landmarks plus a map pin
- The website sells from a stock quantity **allocated to it**; shop and event sales do
  not consume that allocation

## What is being built

One web application over one database, in five parts:

1. **Storefront** — bilingual Arabic/English with full right-to-left layout, catalogue,
   cart, checkout
2. **Back office** — orders, stock across two locations, purchasing, reporting. Two
   roles only: Owner and Staff
3. **Customer records and outbound messaging** — WhatsApp-first, because web push barely
   reaches iPhone users
4. **AI assistant** — retrieval-grounded on the real catalogue, Google Gemini 2.5 Flash
5. **"The Journey"** — a multi-stage, choice-driven 3D (WebGL) experience that resolves
   to a single outcome and presents a written psychological interpretation of the
   player's choices

## What the document is

ISO/IEC/IEEE 29148:2018 SRS. **v0.9, 56 pages, ~284 numbered requirements**, each
carrying its own acceptance criterion. **Not baselined.**

---

## Before you file a finding

**1. Judge proportionality.** A small team, five products, tens of orders a week.
Over-engineering is as much a defect as under-specification. A requirement that would be
correct for an enterprise and is wrong at this scale **is** a finding — say so.

**2. Three sections carry deliberate blocking placeholders. Do not report them as
incomplete:**

| Section | Why it is blocked |
|---|---|
| **§4.4 Payments** | No merchant account exists, so there is no provider API to specify against |
| **§4.15 The Journey** | The client has not supplied their concept document |
| **NFR-PRV-006** | Nobody has named the applicable data protection regime (OI-25) |

Do report anything wrong with what *is* written in them.

**3. §2.7 lists deliberate exclusions.** Stocktake mode, gift wrapping, customer reviews,
native apps, loyalty, gift cards, subscriptions, POS mode, accounting integration,
barcode and QR scanning, any currency other than ILS, languages beyond Arabic and
English. These are absent by decision, not by oversight.

**4. Appendix C tracks the known open issues.** Re-reporting one is not a finding.

**5. Cite the requirement ID and quote the text you object to.** Do not invent IDs — if
you are unsure one exists, do not cite it. Do not paraphrase a requirement into a
strawman.

---

## Where review effort pays best

- **Contradictions between requirements written at different revisions.** The document
  was built incrementally across nine drafts; that is its most likely failure mode.
- **Requirements that cannot both be implemented** — pairs that a developer would have
  to choose between.
- **The money and tax paths**: the cash-on-delivery lifecycle, refunds, invoice issuance
  and credit notes. This is where errors cost real money.
- **Anything in the Journey or the assistant that is specified but not testable** —
  targets that cannot be measured, or acceptance criteria that do not test their
  requirement.

A companion file, `REVIEW-FINDINGS-v0.8.md`, records nine issues already known and
deliberately not actioned, with reasons. Check it before reporting — if you find one of
those, say whether you think the reason given is wrong, which is more useful than
re-reporting it.
