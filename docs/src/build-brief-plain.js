// Client-facing brief, plain-language edition: same content and styling as
// build-brief.js, rewritten in shorter sentences and everyday words.
const fs = require('fs');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = d;

const CW = 9026;
const INK = '1F2933', ACCENT = '9B2242', MUTED = '5C6670', LINE = 'D8DEE3', HEADFILL = 'EFF2F4', NOTEFILL = 'F4F6F8';
const P = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 160, line: 276 }, children: [new TextRun({ text, bold: o.bold, italics: o.italics, color: o.color || INK, size: o.size || 21 })] });
const H1 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 440, after: 180 } });
const H2 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 300, after: 120 } });
const BUL = t => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 70, line: 270 }, children: [new TextRun({ text: t, size: 20 })] });
const NUM = (t, ref) => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 70, line: 270 }, children: [new TextRun({ text: t, size: 20 })] });
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
  ['A shop built for Arabic readers on phones',
   'Most of your customers use a phone, on a normal network, and read Arabic. We design for that from the start.',
   ['Arabic is the default. English is one tap away. The whole layout flips for right-to-left, not just the words.',
    'Each game has its photos and video, what is in the box, who it is for, and which occasion it suits.',
    'Seasonal games (the Ramadan games) stay visible all year. Customers can see when they come back and ask to be notified.',
    'Fast on a mid-range Android phone with a slow connection. That is the device we test on, not a laptop on office wifi.',
    'Usable by people with disabilities, following the standard accessibility rules.']],
  ['Buying in a few taps, paying the way people pay here',
   'Anyone can buy without creating an account, and pay the way they prefer.',
   ['The cart is saved for 30 days. Customers can check out as a guest and create an account afterwards without typing their details again.',
    'Payment by cash on delivery, card, or the wallet and instant-transfer options your payment provider supports.',
    'Card details never go through your website. They are entered on the payment provider\'s own secure page. This keeps you out of card-security compliance requirements.',
    'Addresses work without postal codes: governorate, area, directions, a landmark, and an optional map pin that the courier receives.',
    'You set your own delivery zones. Each zone has its own price, whether cash on delivery is allowed, and the delivery time customers see.',
    'Prices include VAT. The receipt shows the VAT amount, but it is not added on top.']],
  ['Orders you can trust, from click to doorstep',
   'Every order follows one clear path. The shop can never sell a box it does not have. No order is ever forgotten.',
   ['An order is always in one of these states: unpaid, paid, being packed, shipped, delivered, returned or cancelled. You can always see which.',
    'Payment and delivery are tracked separately. A refund never confuses the shipping status.',
    'Stock is reserved the moment an order is placed, so two customers cannot buy the last box. If an order stays unpaid, the box is released after a set time.',
    'If you find a shortage while packing, the order is put on hold and the customer is told. It is not cancelled.',
    'Shipments are sent to ESP as a file in their format. Delivery results (delivered, failed, refused, returned) are recorded in the system. A parcel with no news shows up on a list before it becomes a loss.',
    'Failed deliveries, redeliveries, returns, exchanges, and full or partial refunds each have a clear process. This includes cash refunds on cash orders.',
    'Customers can see their order status and history. Staff can see everything and can fix an address before dispatch.']],
  ['Cash on delivery treated like money',
   'Cash collected by the courier is matched to the orders it belongs to.',
   ['Each cash hand-over from the courier is recorded and split across the orders it covers. Any amount not yet matched stays visible until it reaches zero.',
    'A report shows what was delivered against what was paid, by date and by courier.',
    'Overdue cash is flagged. An owner can write it off with a reason, so the books stay accurate.']],
  ['Invoicing that satisfies the tax authority',
   'Every sale creates a proper invoice, sent electronically. Every refund creates a credit note.',
   ['One invoice per order, issued at the right moment: on dispatch for prepaid orders, on delivery for cash orders.',
    'Invoice numbers run in an unbroken sequence, separate from the order number customers see, and are never reused.',
    'Invoices and credit notes are sent to the tax authority automatically. Their status is tracked, and any failures are shown to you, not hidden.',
    'An invoice list your accountant can filter by period and export.',
    'The VAT rate is a setting with a start date. Old orders keep the rate that applied when they were sold.']],
  ['Stock across your two locations, kept simple',
   'The website sells from its own share of stock, held at the store room and the household address.',
   ['Quantity per game per location, with a permanent record of every movement and who made it.',
    'Transfers between locations and manual adjustments with a reason, instead of repeated stock counts.',
    'Each order is assigned to a dispatch location by a rule you set. It can be changed before packing.',
    'Suppliers, their lead times, and purchase orders with partial deliveries, because a Ramadan game cannot be reprinted once the season has started.',
    'Unit cost per game, visible to the owner only, never to customers.']],
  ['One record per customer, and messaging they agreed to',
   'Everything about a customer in one place, and messages that respect consent and do not annoy.',
   ['Orders, addresses, consents and Journey results on one customer record, with number of orders, total spend and average order value.',
    'Customer groups defined by rules (for example: bought twice, or no order in six months) that update automatically.',
    'WhatsApp first, email second. Order confirmations, payment and dispatch updates, delivery notices and account messages go out automatically in the customer\'s language.',
    'Campaign messages to a group, scheduled, with a delivery status for each message.',
    'Consent is recorded per channel. Every marketing message has an opt-out. No customer gets more than one marketing message every fourteen days.',
    'WhatsApp message templates need Meta\'s approval before use. The system tracks this and will not send an unapproved template.']],
  ['An assistant that answers from your catalogue, in your customers\' Arabic',
   'A chat assistant on every page that helps people choose, answers questions, and passes to a human when needed.',
   ['It answers only from your product pages, policies and FAQ. It will not invent a price, a stock level or a delivery promise. If it does not know, it says so.',
    'It understands and replies in everyday Levantine Arabic as well as English.',
    'It can search the catalogue, recommend a game, check stock, give delivery times, and look up a signed-in customer\'s own orders. It cannot change anything.',
    'It offers a hand-over to you on WhatsApp when it is unsure, when asked, or after two failed attempts at the same question.',
    'It is clearly labelled as automated, protected against misuse, and has a monthly cost limit you set.',
    'It runs on Google Gemini 2.5 Flash. Customer phone numbers, emails and addresses are removed before anything is sent to the model provider.']],
  ['The Journey',
   'A multi-stage 3D experience. The player makes choices, and at the end gets one result with a written explanation of what their choices mean.',
   ['Everyone sees the same scenes in the same order. Choices change what happens inside a scene and how it ends.',
    'Choices build up a trait profile, which leads to one result from a fixed set, with explanation text in the player\'s language.',
    'It can be played without giving any personal details. Saving or sharing the result may ask for contact details, with a clear consent notice.',
    'Results are shared through the phone\'s own share menu. Nothing is posted anywhere automatically.',
    'It is presented as entertainment, not a psychological test, and says so before showing the result.',
    'It loads to a playable first scene within eight seconds on a mid-range phone. Devices that cannot run it are told so, instead of seeing a blank screen.',
    'The story, scenes and result set come from your concept document. The specification covers everything around them.']],
  ['A back office for a small team',
   'Two roles only: Owner and Staff.',
   ['Staff handle enquiries, pick, pack, dispatch, adjust stock and update the catalogue, including from a phone in the store room.',
    'Owner can also set prices, approve refunds, buy stock, run campaigns and manage users. Anything that moves money is Owner-only.',
    'Two-factor sign-in for everyone, and a permanent log of who changed what.',
    'A dashboard showing revenue, orders, average order value and conversion rate for any period compared with the previous one; sales by game; the purchase funnel. Every report can be exported to a spreadsheet.',
    'Static pages you can edit yourself, and policy pages (delivery, returns, privacy, terms) with their change history.']],
];

const body = [];
body.push(new Paragraph({ spacing: { before: 1600, after: 0 }, children: [new TextRun({ text: 'COMPANION TO SRS-DARDACHAT-001', size: 20, bold: true, color: ACCENT, characterSpacing: 60 })] }));
body.push(new Paragraph({ spacing: { before: 240, after: 0 }, children: [new TextRun({ text: 'DardaChat Commerce Platform', size: 56, bold: true, color: INK, font: 'Calibri Light' })] }));
body.push(new Paragraph({ spacing: { before: 40, after: 400 }, children: [new TextRun({ text: 'What we are building, in simple terms', size: 56, bold: true, color: MUTED, font: 'Calibri Light' })] }));
body.push(TBL(null, [
  [{ t: 'Document ID', bold: true, color: MUTED }, 'SRS-DARDACHAT-001-BRIEF'],
  [{ t: 'Version', bold: true, color: MUTED }, '0.1 (goes with SRS draft v0.1)'],
  [{ t: 'Date', bold: true, color: MUTED }, '17 September 2026'],
], [2400, 6626]));
body.push(SP(300));
body.push(NOTE('This is the short version of the requirements document. It explains the main parts of the platform and what each one does for you, without the technical detail. Where a technical point affects you, it is mentioned under the part it belongs to. The full specification is still the document we agree on and build from.'));

body.push(H1('1. In one paragraph'));
body.push(P('One website, one database, five jobs:', { after: 100 }));
[
  'An online shop in Arabic and English where people browse the games and buy them, paying by cash on delivery or card.',
  'A back office where your team handles orders, tracks stock in two locations, buys from suppliers and sees the numbers.',
  'A customer list and a messaging tool (WhatsApp first) to stay in touch with people who bought.',
  'An AI assistant that answers questions using your own product information.',
  'The Journey: a 3D experience where the player makes choices and gets a personal result at the end.',
].forEach(t => body.push(NUM(t, 'jobs')));
body.push(SP(60));
body.push(P('Everything works in Arabic and English, is built for phones on normal networks, and creates the electronic invoices the tax authority requires.'));

body.push(H1('2. The main parts'));
IDEAS.forEach(([title, summary, bullets], i) => {
  body.push(H2(`2.${i + 1} ${title}`));
  body.push(P(summary, { italics: true, color: MUTED, after: 100 }));
  bullets.forEach(b => body.push(BUL(b)));
  body.push(SP(60));
});

body.push(H1('3. Foundations everything relies on'));
body.push(P('You will not see these on a screen, but every part above depends on them.'));
body.push(TBL(['Foundation', 'What it means for you'], [
  ['Arabic and English everywhere', 'Every screen, message, PDF and error is in both languages. Arabic is the default and the layout flips correctly for it.'],
  ['One system, one source of truth', 'The shop, back office, assistant and Journey share one database. Stock, orders and customers are always in step.'],
  ['Money in shekels, to the agora', 'One currency, no conversion, no rounding surprises. Every total on screen, invoice and report matches.'],
  ['Privacy and data rights', 'Consent is asked for clearly and recorded. Customers can ask for a copy of their data or have it deleted. We check who they are first and act within a set time. Journey answers are treated as more sensitive, with their own consent and retention rules.'],
  ['Security', 'Encrypted everywhere, no card data on your systems, two-factor sign-in for staff, limits against abuse, and a security review before release.'],
  ['Reliability', 'Automatic backups that can restore to any point in time, a restore test before launch, outside monitoring, a test copy of the site, and every release can be undone.'],
  ['Performance on real devices', 'Every speed target is measured on a mid-range Android phone on a slow connection, because that is where your customers are.'],
  ['Room to grow', 'Sized for your audience today (a few dozen visitors at once, a few hundred at Ramadan peak), and built so growing means changing settings, not rebuilding.'],
], [2600, 6426]));

body.push(H1('4. What we still need from you'));
body.push(P('Five items block parts of the specification and should start now. The first and third take a long time to arrange.'));
[
  'A merchant account with one of the payment providers you named, and access to its documentation.',
  'The Journey concept document: story, scenes, and the traits the result describes.',
  'How the business sends electronic invoices: which channel or software, in what format, and whether a test environment exists (your accountant will know).',
  'One sample of the file ESP uses to receive shipments.',
  'Which data protection law the business must follow, or permission for us to propose one.',
].forEach(t => body.push(NUM(t, 'needs')));
body.push(SP(120));
body.push(P('Anything beyond what is described here (promotions, deeper reporting, more Journey features, and others) is listed in the companion document of priced options. Each is available as a separate item.', { color: MUTED, size: 20 }));

const numbered = ref => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] });
const doc = new Document({
  creator: 'DardaChat Project', title: 'DardaChat Commerce Platform: What we are building, in simple terms',
  styles: { default: {
    document: { run: { font: 'Calibri', size: 21, color: INK } },
    heading1: { run: { font: 'Calibri Light', size: 32, bold: true, color: INK }, paragraph: { spacing: { before: 400, after: 180 } } },
    heading2: { run: { font: 'Calibri Light', size: 25, bold: true, color: ACCENT }, paragraph: { spacing: { before: 300, after: 120 } } },
  } },
  numbering: { config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] },
    numbered('jobs'), numbered('needs'),
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new d.Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: 'SRS-DARDACHAT-001-BRIEF  v0.1  |  ', size: 16, color: MUTED }), new TextRun({ children: [d.PageNumber.CURRENT], size: 16, color: MUTED }) ] })] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(process.argv[2], buf); console.log('written:', process.argv[2], buf.length, 'bytes'); });
