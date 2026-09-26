// Client-facing brief: the core ideas in the SRS, in plain language. Technical
// points sit under the idea they serve; things every idea relies on sit in §3.
const fs = require('fs');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = d;

const CW = 9026;
const INK = '1F2933', ACCENT = '9B2242', MUTED = '5C6670', LINE = 'D8DEE3', HEADFILL = 'EFF2F4', NOTEFILL = 'F4F6F8';
const P = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 160, line: 276 }, children: [new TextRun({ text, bold: o.bold, italics: o.italics, color: o.color || INK, size: o.size || 21 })] });
const PR = (runs, o = {}) => new Paragraph({ spacing: { after: o.after ?? 160, line: 276 }, children: runs.map(r => new TextRun({ size: 21, color: INK, ...r })) });
const H1 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 440, after: 180 } });
const H2 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 300, after: 120 } });
const BUL = t => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 70, line: 270 }, children: [new TextRun({ text: t, size: 20 })] });
const NOTE = t => new Paragraph({ spacing: { after: 200, line: 276 }, shading: { type: ShadingType.CLEAR, fill: NOTEFILL }, indent: { left: 200, right: 200 }, children: [new TextRun({ text: t, size: 19 })] });
const SP = n => new Paragraph({ spacing: { after: n ?? 160 }, children: [] });
const cellBorders = { top: { style: BorderStyle.SINGLE, size: 4, color: LINE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } };
function cell(content, width, o = {}) {
  const c = typeof content === 'string' ? { t: content } : content;
  return new TableCell({ width: { size: width, type: WidthType.DXA }, borders: cellBorders, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined, margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ spacing: { after: 0, line: 260 }, children: [new TextRun({ text: c.t, bold: c.bold || o.bold, size: c.size || o.size || 18, color: c.color || o.color || INK })] })] });
}
function TBL(header, rows, widths) {
  const out = [];
  if (header) out.push(new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], { bold: true, fill: HEADFILL, size: 17, color: MUTED })) }));
  rows.forEach(r => out.push(new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i])) })));
  return new Table({ columnWidths: widths, width: { size: CW, type: WidthType.DXA }, rows: out });
}

// idea, one-line summary, what you get (bullets)
const IDEAS = [
  ['A storefront built for Arabic readers on phones',
   'Your customers are mostly on mobile, on ordinary networks, reading Arabic. The site is designed from that starting point, not adapted to it afterwards.',
   ['Arabic by default, English one tap away, with the whole layout mirrored for right-to-left, not just the words translated.',
    'Each game presented with its photos and video, what is in the box, who it is for and which occasion it suits.',
    'Seasonal titles (the Ramadan games) stay visible out of season, show when they return, and let customers ask to be told when they are back.',
    'Fast on a mid-range Android phone on a slow connection: that is the device we test against, not a laptop on office wifi.',
    'Usable by people with disabilities to the recognised accessibility standard.']],
  ['Buying in a few taps, the way people actually pay here',
   'Anyone can buy without creating an account, and pay the way they prefer.',
   ['Cart that survives 30 days, guest checkout, and an account offered afterwards without retyping anything.',
    'Cash on delivery, card, and the wallet and instant-transfer methods your payment provider offers. Card details never touch your website; they are entered on the provider\'s own secure page, which keeps you out of card-security compliance scope.',
    'Addresses that work without postal codes: governorate, locality, directions, a landmark and an optional map pin the courier receives.',
    'Delivery zones you configure yourself, each with its own rate, whether cash on delivery is allowed, and the delivery time customers are shown.',
    'Prices shown inclusive of VAT, with the VAT amount stated on the receipt rather than added on top.']],
  ['Orders you can trust from click to doorstep',
   'Every order follows one clear path, the shop can never sell a box it does not have, and nothing goes silent.',
   ['An order is either unpaid, paid, being packed, shipped, delivered, returned or cancelled, and you can always see which. Money is tracked separately from the parcel, so a refund never confuses the shipping status.',
    'Stock is reserved the moment an order is placed. Two customers cannot buy the last box. An unpaid order releases its box automatically after a set time.',
    'If a shortfall is found while packing, the order is held and the customer told, rather than cancelled.',
    'Shipments go to ESP as a file in their format; delivery outcomes (delivered, failed, refused, returned) are recorded back in, and a parcel nobody has heard from shows up on a list before it becomes a loss.',
    'Failed deliveries, redeliveries, returns, exchanges and full or partial refunds all have a defined path, including cash refunds on cash orders.',
    'Customers see their order status and history; staff see everything and can correct an address before dispatch.']],
  ['Cash on delivery handled like money, not like a note on a parcel',
   'Cash collected by the courier is matched to the orders it belongs to.',
   ['Each remittance the courier hands over is recorded, split across the orders it covers, and its unallocated balance shown until it reaches zero.',
    'A reconciliation report shows what was delivered against what was paid, by date and courier.',
    'Cash that is overdue is flagged, and an owner can write it off with a reason so the books stay honest.']],
  ['Invoicing that satisfies the tax authority',
   'Every sale produces a proper invoice, submitted electronically, and every refund a credit note.',
   ['One invoice per order, issued at the right tax point: on dispatch for prepaid orders, on delivery for cash orders.',
    'Invoice numbers run in an unbroken sequence, separate from the order number customers see, and are never reused.',
    'Invoices and credit notes are sent to the tax authority automatically, their clearance status tracked, and failures shown to you rather than hidden.',
    'An invoice register your accountant can filter by period and export.',
    'The VAT rate is a setting with an effective date; old orders keep the rate that applied when they were sold.']],
  ['Stock across your two locations, without warehouse ceremony',
   'The website sells from its own allocation of stock, held at the store room and the household address.',
   ['Quantities per title per location, with a permanent ledger of every movement and who made it.',
    'Deliberate transfers between locations and manual adjustments with a reason, instead of counting rituals.',
    'Each order is assigned to a dispatch location by a rule you set, and can be reassigned before packing.',
    'Suppliers, their lead times and purchase orders with partial receipts, because a Ramadan title cannot be reprinted once the season has started.',
    'Unit cost per title, visible to the owner only, never to customers.']],
  ['One record per customer, and messaging they agreed to',
   'Everything about a customer in one place, and outbound messaging that respects consent and does not nag.',
   ['Orders, addresses, consents and Journey results on one customer record, with order count, lifetime value and average order per customer.',
    'Segments defined by rules (for example, bought twice, or has not ordered in six months) that update themselves.',
    'WhatsApp first, email second: order confirmations, payment and dispatch updates, delivery notices and account messages go out automatically in the customer\'s language.',
    'Broadcast campaigns to a segment, scheduled, with delivery status per message.',
    'Consent recorded per channel, an opt-out in every marketing message, and at most one marketing message per customer every fourteen days.',
    'WhatsApp templates need Meta\'s approval before they can be sent; the system tracks that status and refuses to send an unapproved one.']],
  ['An assistant that answers from your catalogue, in your customers\' Arabic',
   'A chat assistant on every page that helps people choose and answers questions, and hands over to a human when it should.',
   ['Answers only from your product pages, policies and FAQ. It will not invent a price, a stock level or a delivery promise; if it does not know, it says so.',
    'Understands and replies in colloquial Levantine Arabic as well as English.',
    'Can search the catalogue, recommend a game, check stock, quote delivery times, and look up a signed-in customer\'s own orders. It cannot change anything.',
    'Offers a handover to you on WhatsApp when it is unsure, when asked, or after two failed attempts on the same question.',
    'Clearly labelled as automated, protected against misuse, and with a monthly cost ceiling you set.',
    'Runs on Google Gemini 2.5 Flash; customer phone numbers, emails and addresses are stripped before anything reaches the model provider.']],
  ['The Journey',
   'A multi-stage, choice-driven 3D experience that ends in a single result and a written interpretation of the player\'s choices.',
   ['Same scenes in the same order for everyone; choices change what happens within a scene and how it ends.',
    'Choices feed a trait profile that resolves to one result from a defined set, with interpretation text in the player\'s language.',
    'Playable without giving any personal details; saving or sharing the result may ask for contact details, with a clear consent statement.',
    'Shareable through the phone\'s own share sheet; nothing is posted anywhere automatically.',
    'Presented as entertainment, not a psychological assessment, and says so before the result.',
    'Loads to an interactive first scene within eight seconds on a mid-range phone; devices that cannot run it are told so rather than left on a blank screen.',
    'The story, scenes and result set come from your concept document; the specification covers everything around them.']],
  ['A back office for a small team',
   'Two roles, no more: Owner and Staff.',
   ['Staff handle enquiries, pick, pack, dispatch, adjust stock and maintain the catalogue, including from a phone in the store room.',
    'Owner additionally sets prices, approves refunds, buys stock, runs campaigns and manages users; anything that moves money is Owner-only.',
    'Two-factor sign-in for everyone, and a permanent log of who changed what.',
    'A dashboard of revenue, orders, average order value and conversion for any period against the previous one; sales by title; the purchase funnel; every report exportable to a spreadsheet.',
    'Static pages editable by you, and policy pages (delivery, returns, privacy, terms) kept with their history.']],
];

const body = [];
body.push(new Paragraph({ spacing: { before: 1600, after: 0 }, children: [new TextRun({ text: 'COMPANION TO SRS-DARDACHAT-001', size: 20, bold: true, color: ACCENT, characterSpacing: 60 })] }));
body.push(new Paragraph({ spacing: { before: 240, after: 0 }, children: [new TextRun({ text: 'DardaChat Commerce Platform', size: 56, bold: true, color: INK, font: 'Calibri Light' })] }));
body.push(new Paragraph({ spacing: { before: 40, after: 400 }, children: [new TextRun({ text: 'What we are building, in brief', size: 56, bold: true, color: MUTED, font: 'Calibri Light' })] }));
body.push(TBL(null, [
  [{ t: 'Document ID', bold: true, color: MUTED }, 'SRS-DARDACHAT-001-BRIEF'],
  [{ t: 'Version', bold: true, color: MUTED }, '0.1 (accompanies SRS draft v0.1)'],
  [{ t: 'Date', bold: true, color: MUTED }, '17 September 2026'],
], [2400, 6626]));
body.push(SP(300));
body.push(NOTE('This is the short version of the requirements specification. It describes the ideas the platform is built around and what you get from each, without the technical detail. Where a technical point matters to you, it appears under the idea it serves. The specification itself remains the document that is accepted and built against.'));

body.push(H1('1. In one paragraph'));
body.push(P('One website, one database, five jobs. A bilingual storefront where people browse the games and buy them, paying by cash on delivery or card. A back office where your team fulfils orders, manages stock in two locations, buys from suppliers and reads the numbers. A customer record and a messaging engine, WhatsApp first, that keep in touch with the people who bought. An AI assistant that answers questions from your own catalogue. And the Journey, a 3D choice-driven experience that gives each player a personal result. Everything runs in Arabic and English, is designed for phones on ordinary networks, and produces the electronic invoices the tax authority requires.'));

body.push(H1('2. The core ideas'));
IDEAS.forEach(([title, summary, bullets], i) => {
  body.push(H2(`2.${i + 1} ${title}`));
  body.push(P(summary, { italics: true, color: MUTED, after: 100 }));
  bullets.forEach(b => body.push(BUL(b)));
  body.push(SP(60));
});

body.push(H1('3. Foundations every idea relies on'));
body.push(P('These are not features you will see on a screen, but each of the ideas above depends on them.'));
body.push(TBL(['Foundation', 'What it means for you'], [
  ['Arabic and English throughout', 'Every screen, message, PDF and error is written in both languages. Arabic is the default and the layout mirrors properly for it.'],
  ['One system, one source of truth', 'Storefront, back office, assistant and Journey share one database. Stock, orders and customers are never out of step with each other.'],
  ['Money in shekels, to the agora', 'One currency, no conversion, no rounding surprises. Every total on screen, invoice and report reconciles.'],
  ['Privacy and data rights', 'Consent is asked for specifically and recorded. Customers can request a copy or deletion of their data, verified first, and it is done within a stated window. Journey answers are treated as a more sensitive category with their own consent and retention.'],
  ['Security', 'Encrypted everywhere, no card data on your systems, two-factor sign-in for staff, rate limits against abuse, and a security review before release.'],
  ['Reliability', 'Automated backups with point-in-time recovery, a restore rehearsed before launch, external monitoring, a staging copy for testing, and every release reversible.'],
  ['Performance on real devices', 'Every speed target is measured on a mid-range Android phone on a throttled connection, because that is where your customers are.'],
  ['Room to grow', 'Sized for your audience today (a few dozen concurrent visitors, a few hundred at Ramadan peak) and built so that growing means changing configuration, not rebuilding.'],
], [2600, 6426]));

body.push(H1('4. What we still need from you'));
body.push(P('Five items block parts of the specification and should start now; the first and third have long lead times.'));
[
  'A merchant account with one of the payment providers you named, and access to its documentation.',
  'The Journey concept document: story, scenes and the traits the result describes.',
  'The electronic-invoicing route: which channel or software the business submits through, in what format, and whether a test environment exists (your accountant will know).',
  'One sample of the file ESP uses to receive shipments.',
  'Which data protection law the business is subject to, or a go-ahead for us to propose a basis.',
].forEach(t => body.push(BUL(t)));
body.push(SP(120));
body.push(P('Extensions beyond what is described here (promotions, deeper reporting, more Journey features, and others) are listed in the companion document of priced options, each available as its own line.', { color: MUTED, size: 20 }));

const doc = new Document({
  creator: 'DardaChat Project', title: 'DardaChat Commerce Platform: What we are building, in brief',
  styles: { default: {
    document: { run: { font: 'Calibri', size: 21, color: INK } },
    heading1: { run: { font: 'Calibri Light', size: 32, bold: true, color: INK }, paragraph: { spacing: { before: 400, after: 180 } } },
    heading2: { run: { font: 'Calibri Light', size: 25, bold: true, color: ACCENT }, paragraph: { spacing: { before: 300, after: 120 } } },
  } },
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new d.Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: 'SRS-DARDACHAT-001-BRIEF  v0.1  |  ', size: 16, color: MUTED }), new TextRun({ children: [d.PageNumber.CURRENT], size: 16, color: MUTED }) ] })] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(process.argv[2], buf); console.log('written:', process.argv[2], buf.length, 'bytes'); });
