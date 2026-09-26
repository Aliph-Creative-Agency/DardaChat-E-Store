// Builds the priced-options companion to the SRS. Everything listed here is an
// extension the platform can carry without redesign; none of it is required for
// the functioning shop the SRS specifies. Price column is left for the proposal.
const fs = require('fs');
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat,
} = d;

const CW = 9026;
const INK = '1F2933', ACCENT = '9B2242', MUTED = '5C6670', LINE = 'D8DEE3', HEADFILL = 'EFF2F4', NOTEFILL = 'F4F6F8';

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 160, line: 276 },
  children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, color: opts.color || INK, size: opts.size || 21 })],
});
const H1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 480, after: 200 } });
const H2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 320, after: 160 } });
const NOTE = (t) => new Paragraph({
  spacing: { after: 200, line: 276 }, shading: { type: ShadingType.CLEAR, fill: NOTEFILL },
  indent: { left: 200, right: 200 },
  children: [new TextRun({ text: t, size: 19, color: INK })],
});
const BUL = (t) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 80, line: 276 }, children: [new TextRun({ text: t, size: 21 })] });
const SP = (n) => new Paragraph({ spacing: { after: n ?? 160 }, children: [] });

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: LINE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};
function cell(content, width, opts = {}) {
  const c = typeof content === 'string' ? { t: content } : content;
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders: cellBorders,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ alignment: c.align || AlignmentType.LEFT, spacing: { after: 0, line: 260 },
      children: [new TextRun({ text: c.t, bold: c.bold || opts.bold, size: c.size || opts.size || 18, color: c.color || opts.color || INK, font: c.font })] })],
  });
}
function TBL(header, rows, widths) {
  const out = [];
  if (header) out.push(new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { bold: true, fill: HEADFILL, size: 17, color: MUTED })) }));
  rows.forEach(r => out.push(new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i])) })));
  return new Table({ columnWidths: widths, width: { size: CW, type: WidthType.DXA }, rows: out });
}

// ---------- catalogue of options ----------
// [id, name, what it does, builds on]
const PACKS = [
  ['A', 'Catalogue and merchandising', 'The launch range is five standalone titles. These options matter once the range grows or begins to vary.', [
    ['OPT-A1', 'Editions and sizes (variant axes)', 'Configurable variant axes so one title can be sold in several editions or sizes, each with its own SKU, price and stock, without a schema change.', 'The Variant model in 4.1'],
    ['OPT-A2', 'Bundles', 'A product composed of two or more other products, priced independently and decrementing each component on sale.', 'Catalogue and stock ledger'],
    ['OPT-A3', 'Expansion packs', 'A product that depends on a base game, shown and recommended alongside it.', 'Catalogue'],
    ['OPT-A4', 'Scheduled publication', 'A product or collection published automatically at a set date and time, alongside the seasonal window already specified.', 'FR-CAT-009'],
    ['OPT-A5', 'Rule-populated collections and related products', 'Collections that fill themselves by rule (tag, occasion, group), and a related-products strip on each product page, manual or rule-driven.', 'FR-CAT-006'],
    ['OPT-A6', 'Bulk catalogue import and export', 'CSV import and export of the whole catalogue with row-level validation reporting.', 'Catalogue'],
  ]],
  ['B', 'Search and discovery', 'With five titles, discovery is carried by layout and collections. These options become worthwhile as the catalogue approaches the two-year target of 25 titles.', [
    ['OPT-B1', 'Arabic search tolerance', 'Search that ignores diacritics, treats alef, hamza and taa-marbuta variants as equal, and tolerates common misspellings. Requires a normalisation pipeline or a dedicated search service.', 'FR-SRC-001'],
    ['OPT-B2', 'Faceted filtering', 'Filters by group, occasion, player count, age, duration, price range and availability, with counts per facet and filter state kept in the URL for sharing and back-navigation.', 'FR-CAT-004'],
    ['OPT-B3', 'No-result recovery', 'A zero-result search that offers relaxed filters, popular products and a hand-off to the assistant instead of an empty page.', 'FR-SRC-001, FR-AI-001'],
  ]],
  ['C', 'Promotions and conversion', 'Levers for driving sales. Each is a marketing decision as much as a feature, so they are priced separately.', [
    ['OPT-C1', 'Promotion codes', 'Owner creates codes with a value, product scope, validity dates and usage cap; customers redeem at checkout and see the discount as its own line. The VAT arithmetic for discounts is already specified.', 'FR-CRT-007, FR-CRT-009'],
    ['OPT-C2', 'Free-delivery threshold', 'A configurable order value per zone above which delivery is free.', 'FR-ADR-006'],
    ['OPT-C3', 'Delivery rates by weight or order value', 'Rate tables by total weight or by order value band, in addition to the flat rate per zone.', 'FR-ADR-006'],
    ['OPT-C4', 'Abandoned checkout recovery', 'Records the stage at which a checkout was abandoned and sends a consented follow-up message.', 'Cart and checkout, 4.11'],
    ['OPT-C5', 'Gift wrapping and gift messaging', 'A gift option at checkout with a printed message, and the fulfilment step to go with it. Held at OI-20 pending the client decision on gift buying.', 'Checkout, fulfilment'],
    ['OPT-C6', 'Wishlist and one-tap reorder', 'Customers save products for later and rebuild a previous order in one action.', 'Customer accounts'],
  ]],
  ['D', 'Customer engagement', 'The specification covers consent, transactional messages, broadcast campaigns and segments. These options automate and deepen it.', [
    ['OPT-D1', 'Automated messaging flows', 'Event-triggered flows: post-purchase follow-up, lapsed-customer win-back and review request, each consented and counted against the frequency cap.', 'FR-MSG-002, FR-MSG-008'],
    ['OPT-D2', 'Customer reviews with photos', 'Verified-purchase reviews with photo upload and Owner moderation. Held at OI-19 pending the client decision.', 'Product page, customer accounts'],
    ['OPT-D3', 'Browser push notifications', 'Web push as an additional channel, offered only where the platform supports it. Reach on iPhone is close to zero, which is why it is optional.', '4.11'],
    ['OPT-D4', 'Message engagement tracking', 'Delivery, failure and engagement recorded per message and per channel, beyond the delivery status already specified.', 'FR-MSG-007'],
    ['OPT-D5', 'Predefined segments', 'Ready-made segments: new, repeat, lapsed, high value, and Journey completer without purchase.', 'FR-CRM-003'],
    ['OPT-D6', 'Customer timeline, tags and notes', 'A chronological activity timeline per customer, plus staff tags and internal notes on the record.', 'FR-CRM-001'],
    ['OPT-D7', 'Segment export', 'Export of any segment to CSV, permission-gated and audit-logged.', 'FR-CRM-003'],
  ]],
  ['E', 'Operations and stock', 'The specified back office covers picking, dispatch, COD reconciliation and purchasing. These options add controls a larger operation would want.', [
    ['OPT-E1', 'Low-stock alerts', 'A configurable threshold per variant that notifies nominated users once when crossed.', 'FR-INV-001'],
    ['OPT-E2', 'Stocktake mode', 'A formal count with variance reporting against the ledger, instead of reconciling by manual adjustment.', 'FR-INV-006'],
    ['OPT-E3', 'COD risk controls', 'Failed and refused deliveries counted per customer, with an administrator able to require prepayment above a threshold.', 'FR-ORD-014, FR-PAY-001'],
    ['OPT-E4', 'Order amendment after placement', 'Change a quantity, remove a line or apply a goodwill discount before dispatch, keeping the order reference and invoice position instead of cancelling and re-placing.', 'FR-ORD-013, Appendix A'],
    ['OPT-E5', 'Saved order views and bulk actions', 'Saved filter sets on the order list and bulk actions on a selection.', 'FR-ORD-004'],
    ['OPT-E6', 'Cost history and reorder suggestions', 'Cost basis retained per receipt so past margin is reported against the cost at the time; purchase history and lead time per variant; suggested reorder quantities from sales velocity and lead time.', 'FR-PUR-004'],
  ]],
  ['F', 'Reporting and insight', 'The specified dashboard covers revenue, orders, average order value, conversion, sales by product and the purchase funnel. These add depth.', [
    ['OPT-F1', 'Margin reporting', 'Gross margin by product and by order, using the cost in force at the time of sale. Requires OPT-E6.', 'FR-CAT-008'],
    ['OPT-F2', 'Inventory valuation, turnover and ageing', 'Stock value, turnover and ageing reconciled to the ledger.', 'FR-INV-003'],
    ['OPT-F3', 'Customer cohorts', 'Cohorts by first-order month with repeat purchase rate.', 'FR-RPT-001'],
    ['OPT-F4', 'Journey analytics', 'Anonymous aggregate counters before consent and per-choice events after it, with a report of starts, completions and completion rate by scene.', '4.15, FR-JRN-009'],
    ['OPT-F5', 'Assistant metrics', 'Conversation volume, containment rate, escalation rate and unanswered questions. Requires OPT-G1.', '4.14'],
    ['OPT-F6', 'Scheduled report delivery', 'Nominated reports emailed on a schedule.', 'FR-RPT-004'],
  ]],
  ['G', 'Assistant operations', 'The specified assistant is grounded, rate-limited and safe by design. These options give the business a window into it and a way to improve it over time.', [
    ['OPT-G1', 'Conversation retention and back-office console', 'Transcripts retained against the customer record under the retention policy; a back-office view of transcripts and an unanswered-question queue.', 'FR-AI-001, 5.3'],
    ['OPT-G2', 'Knowledge curation', 'Promote an answer from the unanswered queue into the assistant corpus, with the wording authored by an Owner and the corpus revision recorded per response so a bad entry can be traced. Requires OPT-G1.', 'FR-AI-002, FR-AI-013'],
    ['OPT-G3', 'Tool invocation logging', 'Which tools the assistant called and what they returned, per conversation, for support diagnosis and privacy audit.', 'FR-AI-006'],
    ['OPT-G4', 'Continuous evaluation suite', 'The acceptance evaluation set maintained after launch and run in the release pipeline, so a failing score blocks a release.', '4.14, section 7'],
  ]],
  ['H', 'The Journey', 'The specified Journey is the full 3D experience with an unsupported-device gate. These options widen who can play it and what it does afterwards.', [
    ['OPT-H1', 'Reduced-fidelity path', 'A second presentation of the same scenes, choices and scoring for devices without WebGL 2.0 or that cannot sustain 30 frames per second, with a mid-play switch that keeps choices intact. The medium (stills, video, 2D or text) spans a wide cost range and is settled after the concept document (OI-02).', 'FR-JRN-010, FR-JRN-017'],
    ['OPT-H2', 'Text-based alternative path', 'A documented text path delivering the same narrative, choices and result, for screen-reader users. Shares most of its work with OPT-H1 when the text medium is chosen.', 'NFR-USA-002'],
    ['OPT-H3', 'Resume on the same device', 'An interrupted session resumes at the same scene.', 'FR-JRN-002'],
    ['OPT-H4', 'Shareable result image', 'A server-rendered result card in a vertical social format with correct Arabic shaping, handed to the device share sheet.', 'FR-JRN-007'],
    ['OPT-H5', 'Replay and result history', 'Unlimited replays, with prior results kept against the customer account.', 'FR-JRN-005, FR-CRM-001'],
    ['OPT-H6', 'Product recommendation and purchase attribution', 'The result maps to a recommended title, and purchases made after a Journey are attributed to it. Held at OI-21 pending the client decision on the Journey\'s commercial role.', 'FR-JRN-005, FR-RPT-001'],
  ]],
];

const body = [];
body.push(new Paragraph({ spacing: { before: 1800, after: 0 }, children: [new TextRun({ text: 'COMPANION TO SRS-DARDACHAT-001', size: 20, bold: true, color: ACCENT, characterSpacing: 60 })] }));
body.push(new Paragraph({ spacing: { before: 240, after: 0 }, children: [new TextRun({ text: 'DardaChat Commerce Platform', size: 56, bold: true, color: INK, font: 'Calibri Light' })] }));
body.push(new Paragraph({ spacing: { before: 40, after: 400 }, children: [new TextRun({ text: 'Priced options', size: 56, bold: true, color: MUTED, font: 'Calibri Light' })] }));
body.push(TBL(null, [
  [{ t: 'Document ID', bold: true, color: MUTED }, 'SRS-DARDACHAT-001-OPT'],
  [{ t: 'Version', bold: true, color: MUTED }, '0.1 (draft for client review)'],
  [{ t: 'Date', bold: true, color: MUTED }, '13 September 2026'],
  [{ t: 'Relates to', bold: true, color: MUTED }, 'DardaChat SRS draft v0.1'],
], [2400, 6626]));
body.push(SP(300));
body.push(NOTE('How to use this document. The Software Requirements Specification describes the complete, functioning shop, back office, assistant and Journey that the project delivers. This companion lists the extensions the same platform can carry. None of them is needed for launch, every one of them is priced separately, and each can be added later without redesign because the specification was written to leave room for it. Tick what you want, and the proposal will price it as its own line.'));

body.push(H1('1. Summary'));
body.push(P('Forty-four options in eight groups. Where an option depends on another, or on a decision still open in Appendix C of the specification, the dependency is stated in its row.'));
body.push(TBL(['Group', 'Theme', 'Options'], PACKS.map(([k, name, , items]) => [k, name, String(items.length)]), [1200, 5826, 2000]));
body.push(SP(120));
body.push(P('A few of these are worth calling out because they interact with decisions the client has not yet taken:'));
body.push(BUL('OPT-C5 gift wrapping and OPT-D2 reviews wait on OI-20 and OI-19.'));
body.push(BUL('OPT-H6, the Journey recommending a product, waits on OI-21. Nothing in the specification prevents adding it later.'));
body.push(BUL('OPT-H1 and OPT-H2 are cheapest when chosen together, because a text medium satisfies both.'));
body.push(BUL('OPT-F1 needs OPT-E6, and OPT-F5 and OPT-G2 need OPT-G1.'));

body.push(H1('2. Options by group'));
for (const [k, name, intro, items] of PACKS) {
  body.push(H2(`${k}. ${name}`));
  body.push(P(intro, { color: MUTED, size: 20 }));
  body.push(TBL(['ID', 'Option', 'What it does', 'Builds on', 'Price'],
    items.map(([id, n, what, on]) => [{ t: id, font: 'Consolas', size: 15 }, { t: n, bold: true }, what, { t: on, color: MUTED, size: 16 }, '']),
    [1000, 1900, 3826, 1500, 800]));
  body.push(SP(120));
}

body.push(H1('3. How an option enters the specification'));
body.push(P('An accepted option is written into the specification as numbered requirements with acceptance criteria, in the section named in its "Builds on" column, and the revision is recorded in Appendix D. Options accepted before build start are priced as part of the delivery; options accepted after it are priced as change orders, because work already done may need to be revisited.'));
body.push(P('Prices in this document are for the software only. Running costs (hosting, the model API, WhatsApp template fees, object storage) are stated in the commercial proposal.'));

const doc = new Document({
  creator: 'DardaChat Project',
  title: 'DardaChat Commerce Platform: Priced options',
  styles: { default: {
    document: { run: { font: 'Calibri', size: 21, color: INK } },
    heading1: { run: { font: 'Calibri Light', size: 34, bold: true, color: INK }, paragraph: { spacing: { before: 400, after: 200 } } },
    heading2: { run: { font: 'Calibri Light', size: 27, bold: true, color: ACCENT }, paragraph: { spacing: { before: 320, after: 160 } } },
  } },
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new d.Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: 'SRS-DARDACHAT-001-OPT  v0.1  |  ', size: 16, color: MUTED }),
      new TextRun({ children: [d.PageNumber.CURRENT], size: 16, color: MUTED }),
    ] })] }) },
    children: body,
  }],
});

const total = PACKS.reduce((n, p) => n + p[3].length, 0);
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(process.argv[2], buf);
  console.log('written:', process.argv[2], buf.length, 'bytes;', total, 'options');
});
