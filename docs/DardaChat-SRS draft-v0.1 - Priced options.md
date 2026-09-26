COMPANION TO SRS-DARDACHAT-001
DardaChat Commerce Platform
Priced options

| Document ID | SRS-DARDACHAT-001-OPT |
|---|---|
| Version | 0.1 (draft for client review) |
| Date | 13 September 2026 |
| Relates to | DardaChat SRS draft v0.1 |

How to use this document. The Software Requirements Specification describes the complete, functioning shop, back office, assistant and Journey that the project delivers. This companion lists the extensions the same platform can carry. None of them is needed for launch, every one of them is priced separately, and each can be added later without redesign because the specification was written to leave room for it. Tick what you want, and the proposal will price it as its own line.

# 1. Summary
Forty-four options in eight groups. Where an option depends on another, or on a decision still open in Appendix C of the specification, the dependency is stated in its row.

| Group | Theme | Options |
|---|---|---|
| A | Catalogue and merchandising | 6 |
| B | Search and discovery | 3 |
| C | Promotions and conversion | 6 |
| D | Customer engagement | 7 |
| E | Operations and stock | 6 |
| F | Reporting and insight | 6 |
| G | Assistant operations | 4 |
| H | The Journey | 6 |

A few of these are worth calling out because they interact with decisions the client has not yet taken:
OPT-C5 gift wrapping and OPT-D2 reviews wait on OI-20 and OI-19.
OPT-H6, the Journey recommending a product, waits on OI-21. Nothing in the specification prevents adding it later.
OPT-H1 and OPT-H2 are cheapest when chosen together, because a text medium satisfies both.
OPT-F1 needs OPT-E6, and OPT-F5 and OPT-G2 need OPT-G1.

# 2. Options by group

## A. Catalogue and merchandising
The launch range is five standalone titles. These options matter once the range grows or begins to vary.

| ID | Option | What it does | Builds on | Price |
|---|---|---|---|---|
| OPT-A1 | Editions and sizes (variant axes) | Configurable variant axes so one title can be sold in several editions or sizes, each with its own SKU, price and stock, without a schema change. | The Variant model in 4.1 |  |
| OPT-A2 | Bundles | A product composed of two or more other products, priced independently and decrementing each component on sale. | Catalogue and stock ledger |  |
| OPT-A3 | Expansion packs | A product that depends on a base game, shown and recommended alongside it. | Catalogue |  |
| OPT-A4 | Scheduled publication | A product or collection published automatically at a set date and time, alongside the seasonal window already specified. | FR-CAT-009 |  |
| OPT-A5 | Rule-populated collections and related products | Collections that fill themselves by rule (tag, occasion, group), and a related-products strip on each product page, manual or rule-driven. | FR-CAT-006 |  |
| OPT-A6 | Bulk catalogue import and export | CSV import and export of the whole catalogue with row-level validation reporting. | Catalogue |  |


## B. Search and discovery
With five titles, discovery is carried by layout and collections. These options become worthwhile as the catalogue approaches the two-year target of 25 titles.

| ID | Option | What it does | Builds on | Price |
|---|---|---|---|---|
| OPT-B1 | Arabic search tolerance | Search that ignores diacritics, treats alef, hamza and taa-marbuta variants as equal, and tolerates common misspellings. Requires a normalisation pipeline or a dedicated search service. | FR-SRC-001 |  |
| OPT-B2 | Faceted filtering | Filters by group, occasion, player count, age, duration, price range and availability, with counts per facet and filter state kept in the URL for sharing and back-navigation. | FR-CAT-004 |  |
| OPT-B3 | No-result recovery | A zero-result search that offers relaxed filters, popular products and a hand-off to the assistant instead of an empty page. | FR-SRC-001, FR-AI-001 |  |


## C. Promotions and conversion
Levers for driving sales. Each is a marketing decision as much as a feature, so they are priced separately.

| ID | Option | What it does | Builds on | Price |
|---|---|---|---|---|
| OPT-C1 | Promotion codes | Owner creates codes with a value, product scope, validity dates and usage cap; customers redeem at checkout and see the discount as its own line. The VAT arithmetic for discounts is already specified. | FR-CRT-007, FR-CRT-009 |  |
| OPT-C2 | Free-delivery threshold | A configurable order value per zone above which delivery is free. | FR-ADR-006 |  |
| OPT-C3 | Delivery rates by weight or order value | Rate tables by total weight or by order value band, in addition to the flat rate per zone. | FR-ADR-006 |  |
| OPT-C4 | Abandoned checkout recovery | Records the stage at which a checkout was abandoned and sends a consented follow-up message. | Cart and checkout, 4.11 |  |
| OPT-C5 | Gift wrapping and gift messaging | A gift option at checkout with a printed message, and the fulfilment step to go with it. Held at OI-20 pending the client decision on gift buying. | Checkout, fulfilment |  |
| OPT-C6 | Wishlist and one-tap reorder | Customers save products for later and rebuild a previous order in one action. | Customer accounts |  |


## D. Customer engagement
The specification covers consent, transactional messages, broadcast campaigns and segments. These options automate and deepen it.

| ID | Option | What it does | Builds on | Price |
|---|---|---|---|---|
| OPT-D1 | Automated messaging flows | Event-triggered flows: post-purchase follow-up, lapsed-customer win-back and review request, each consented and counted against the frequency cap. | FR-MSG-002, FR-MSG-008 |  |
| OPT-D2 | Customer reviews with photos | Verified-purchase reviews with photo upload and Owner moderation. Held at OI-19 pending the client decision. | Product page, customer accounts |  |
| OPT-D3 | Browser push notifications | Web push as an additional channel, offered only where the platform supports it. Reach on iPhone is close to zero, which is why it is optional. | 4.11 |  |
| OPT-D4 | Message engagement tracking | Delivery, failure and engagement recorded per message and per channel, beyond the delivery status already specified. | FR-MSG-007 |  |
| OPT-D5 | Predefined segments | Ready-made segments: new, repeat, lapsed, high value, and Journey completer without purchase. | FR-CRM-003 |  |
| OPT-D6 | Customer timeline, tags and notes | A chronological activity timeline per customer, plus staff tags and internal notes on the record. | FR-CRM-001 |  |
| OPT-D7 | Segment export | Export of any segment to CSV, permission-gated and audit-logged. | FR-CRM-003 |  |


## E. Operations and stock
The specified back office covers picking, dispatch, COD reconciliation and purchasing. These options add controls a larger operation would want.

| ID | Option | What it does | Builds on | Price |
|---|---|---|---|---|
| OPT-E1 | Low-stock alerts | A configurable threshold per variant that notifies nominated users once when crossed. | FR-INV-001 |  |
| OPT-E2 | Stocktake mode | A formal count with variance reporting against the ledger, instead of reconciling by manual adjustment. | FR-INV-006 |  |
| OPT-E3 | COD risk controls | Failed and refused deliveries counted per customer, with an administrator able to require prepayment above a threshold. | FR-ORD-014, FR-PAY-001 |  |
| OPT-E4 | Order amendment after placement | Change a quantity, remove a line or apply a goodwill discount before dispatch, keeping the order reference and invoice position instead of cancelling and re-placing. | FR-ORD-013, Appendix A |  |
| OPT-E5 | Saved order views and bulk actions | Saved filter sets on the order list and bulk actions on a selection. | FR-ORD-004 |  |
| OPT-E6 | Cost history and reorder suggestions | Cost basis retained per receipt so past margin is reported against the cost at the time; purchase history and lead time per variant; suggested reorder quantities from sales velocity and lead time. | FR-PUR-004 |  |


## F. Reporting and insight
The specified dashboard covers revenue, orders, average order value, conversion, sales by product and the purchase funnel. These add depth.

| ID | Option | What it does | Builds on | Price |
|---|---|---|---|---|
| OPT-F1 | Margin reporting | Gross margin by product and by order, using the cost in force at the time of sale. Requires OPT-E6. | FR-CAT-008 |  |
| OPT-F2 | Inventory valuation, turnover and ageing | Stock value, turnover and ageing reconciled to the ledger. | FR-INV-003 |  |
| OPT-F3 | Customer cohorts | Cohorts by first-order month with repeat purchase rate. | FR-RPT-001 |  |
| OPT-F4 | Journey analytics | Anonymous aggregate counters before consent and per-choice events after it, with a report of starts, completions and completion rate by scene. | 4.15, FR-JRN-009 |  |
| OPT-F5 | Assistant metrics | Conversation volume, containment rate, escalation rate and unanswered questions. Requires OPT-G1. | 4.14 |  |
| OPT-F6 | Scheduled report delivery | Nominated reports emailed on a schedule. | FR-RPT-004 |  |


## G. Assistant operations
The specified assistant is grounded, rate-limited and safe by design. These options give the business a window into it and a way to improve it over time.

| ID | Option | What it does | Builds on | Price |
|---|---|---|---|---|
| OPT-G1 | Conversation retention and back-office console | Transcripts retained against the customer record under the retention policy; a back-office view of transcripts and an unanswered-question queue. | FR-AI-001, 5.3 |  |
| OPT-G2 | Knowledge curation | Promote an answer from the unanswered queue into the assistant corpus, with the wording authored by an Owner and the corpus revision recorded per response so a bad entry can be traced. Requires OPT-G1. | FR-AI-002, FR-AI-013 |  |
| OPT-G3 | Tool invocation logging | Which tools the assistant called and what they returned, per conversation, for support diagnosis and privacy audit. | FR-AI-006 |  |
| OPT-G4 | Continuous evaluation suite | The acceptance evaluation set maintained after launch and run in the release pipeline, so a failing score blocks a release. | 4.14, section 7 |  |


## H. The Journey
The specified Journey is the full 3D experience with an unsupported-device gate. These options widen who can play it and what it does afterwards.

| ID | Option | What it does | Builds on | Price |
|---|---|---|---|---|
| OPT-H1 | Reduced-fidelity path | A second presentation of the same scenes, choices and scoring for devices without WebGL 2.0 or that cannot sustain 30 frames per second, with a mid-play switch that keeps choices intact. The medium (stills, video, 2D or text) spans a wide cost range and is settled after the concept document (OI-02). | FR-JRN-010, FR-JRN-017 |  |
| OPT-H2 | Text-based alternative path | A documented text path delivering the same narrative, choices and result, for screen-reader users. Shares most of its work with OPT-H1 when the text medium is chosen. | NFR-USA-002 |  |
| OPT-H3 | Resume on the same device | An interrupted session resumes at the same scene. | FR-JRN-002 |  |
| OPT-H4 | Shareable result image | A server-rendered result card in a vertical social format with correct Arabic shaping, handed to the device share sheet. | FR-JRN-007 |  |
| OPT-H5 | Replay and result history | Unlimited replays, with prior results kept against the customer account. | FR-JRN-005, FR-CRM-001 |  |
| OPT-H6 | Product recommendation and purchase attribution | The result maps to a recommended title, and purchases made after a Journey are attributed to it. Held at OI-21 pending the client decision on the Journey's commercial role. | FR-JRN-005, FR-RPT-001 |  |


# 3. How an option enters the specification
An accepted option is written into the specification as numbered requirements with acceptance criteria, in the section named in its "Builds on" column, and the revision is recorded in Appendix D. Options accepted before build start are priced as part of the delivery; options accepted after it are priced as change orders, because work already done may need to be revisited.
Prices in this document are for the software only. Running costs (hosting, the model API, WhatsApp template fees, object storage) are stated in the commercial proposal.