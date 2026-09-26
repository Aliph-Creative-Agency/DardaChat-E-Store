const fs = require('fs');
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  TableOfContents, PageBreak, PageOrientation, LevelFormat, convertInchesToTwip
} = d;

const CW = 9026;               // content width in DXA for A4 with 1" margins
const INK = '1F2933';
const ACCENT = '9B2242';
const MUTED = '5C6670';
const LINE = 'D8DEE3';
const HEADFILL = 'EFF2F4';
const WARNFILL = 'FBEEF1';

// ---------- helpers ----------
const P = (text, opts = {}) => new Paragraph({
  spacing: { before: opts.before ?? 0, after: opts.after ?? 120, line: 276 },
  alignment: opts.align,
  indent: opts.indent,
  border: opts.border,
  shading: opts.shading,
  children: [new TextRun({
    text,
    bold: opts.bold, italics: opts.italics,
    color: opts.color ?? INK,
    size: opts.size ?? 21,
    font: opts.font ?? 'Calibri',
  })],
});

// paragraph from an array of {text, bold, italics, color, font}
const PR = (runs, opts = {}) => new Paragraph({
  spacing: { before: opts.before ?? 0, after: opts.after ?? 120, line: 276 },
  alignment: opts.align,
  shading: opts.shading,
  border: opts.border,
  indent: opts.indent,
  bidirectional: opts.rtl,
  children: runs.map(r => new TextRun({
    text: r.text,
    bold: r.bold, italics: r.italics,
    color: r.color ?? INK,
    size: r.size ?? 21,
    font: r.font ?? 'Calibri',
    rightToLeft: r.rtl,
  })),
});

// keepNext stops a heading being orphaned at the foot of a page from the table
// or paragraph it introduces. pageBreakBefore replaces standalone PageBreak
// paragraphs, which produced fully blank pages when the prior page was full.
const H1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 520, after: 200 } });
const H1B = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, keepNext: true, pageBreakBefore: true, spacing: { before: 0, after: 200 } });
const H2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 320, after: 160 } });
const H3 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 240, after: 120 } });

const BUL = (t) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { after: 80, line: 276 },
  children: [new TextRun({ text: t, size: 21, color: INK, font: 'Calibri' })],
});

const MONO = (t) => new Paragraph({
  spacing: { after: 0, line: 240 },
  children: [new TextRun({ text: t, size: 16, font: 'Consolas', color: INK })],
});

const NOTE = (t) => new Paragraph({
  spacing: { before: 120, after: 200, line: 276 },
  indent: { left: 220 },
  shading: { type: ShadingType.CLEAR, fill: WARNFILL },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } },
  children: [new TextRun({ text: t, size: 20, italics: true, color: INK, font: 'Calibri' })],
});

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  left: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  right: { style: BorderStyle.SINGLE, size: 2, color: LINE },
};

function cell(content, width, opts = {}) {
  const kids = Array.isArray(content) ? content : [content];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: kids.map(c => typeof c === 'string'
      ? PR([{ text: c, bold: opts.bold, size: opts.size ?? 19, color: opts.color, font: opts.font, rtl: opts.rtl }],
           { after: 0, rtl: opts.rtl, align: opts.align })
      : c),
  });
}

// generic table: header array, rows array of arrays, widths array
function TBL(header, rows, widths) {
  const trs = [];
  if (header) {
    trs.push(new TableRow({
      tableHeader: true,
      children: header.map((h, i) => cell(h, widths[i], { bold: true, fill: HEADFILL, size: 18, color: MUTED })),
    }));
  }
  rows.forEach(r => {
    trs.push(new TableRow({
      children: r.map((c, i) => {
        if (c && typeof c === 'object' && !Array.isArray(c) && c.t !== undefined) {
          return cell(c.t, widths[i], c);
        }
        return cell(c, widths[i], {});
      }),
    }));
  });
  return new Table({
    columnWidths: widths,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: trs,
  });
}

// requirement table: ID | Requirement | Pri
const AC = require('./criteria.js');
const MISSING_AC = [];
const BARE_ASSUMPTIONS = [];
function checkAssumption(id, txt) {
  if (txt.indexOf('[ASSUMPTION') !== -1 && !/AS-\d+/.test(txt)) BARE_ASSUMPTIONS.push(id);
}
const RW = [1120, 3706, 3200, 1000];
// Identifiers are permanent, so requirements added by splitting an existing one
// keep the next free number and would otherwise display out of sequence.
// Sort for presentation instead of renumbering.
function reqKey(id) {
  const m = id.match(/^(.*?)-(\d+)$/);
  return m ? [m[1], parseInt(m[2], 10)] : [id, 0];
}
function REQ(rows) {
  rows = rows.slice().sort((a, b) => {
    const ka = reqKey(a[0]), kb = reqKey(b[0]);
    return ka[0] === kb[0] ? ka[1] - kb[1] : ka[0].localeCompare(kb[0]);
  });
  return TBL(['ID', 'Requirement', 'Acceptance criterion', 'Pri'],
    rows.map(([id, req, pri]) => {
      const ac = AC[id];
      if (!ac) MISSING_AC.push(id);
      checkAssumption(id, req);
      return [
        { t: id, font: 'Consolas', size: 15 },
        { t: req, size: 18 },
        { t: ac || '[CRITERION NOT DEFINED]', size: 16, color: ac ? MUTED : ACCENT },
        { t: pri, align: AlignmentType.CENTER, bold: true, size: 18 },
      ];
    }), RW);
}
const SP = (n) => new Paragraph({ spacing: { after: n ?? 160 }, children: [] });

// ---------- document body ----------
const body = [];

// Title page
body.push(new Paragraph({ spacing: { before: 1800, after: 0 }, children: [
  new TextRun({ text: 'SOFTWARE REQUIREMENTS SPECIFICATION', size: 20, bold: true, color: ACCENT, font: 'Calibri', characterSpacing: 60 })
] }));
body.push(new Paragraph({ spacing: { before: 240, after: 0 }, children: [
  new TextRun({ text: 'DardChat Commerce Platform', size: 56, bold: true, color: INK, font: 'Calibri Light' })
] }));
body.push(new Paragraph({ spacing: { before: 40, after: 400 }, children: [
  new TextRun({ text: '& Interactive Experience', size: 56, bold: true, color: MUTED, font: 'Calibri Light' })
] }));
body.push(TBL(null, [
  [{ t: 'Document ID', bold: true, color: MUTED, size: 18 }, 'SRS-DARDCHAT-001'],
  [{ t: 'Version', bold: true, color: MUTED, size: 18 }, '0.9 — Draft for review'],
  [{ t: 'Date', bold: true, color: MUTED, size: 18 }, '3 September 2026'],
  [{ t: 'Standard', bold: true, color: MUTED, size: 18 }, 'ISO/IEC/IEEE 29148:2018'],
  [{ t: 'Status', bold: true, color: MUTED, size: 18 }, { t: '3 blocking sections; 10 assumptions closed, 13 open', color: ACCENT, bold: true }],
  [{ t: 'Approver', bold: true, color: MUTED, size: 18 }, { t: 'Raneem Nasser Al-Din', bold: true }],
], [2400, 6626]));
body.push(SP(400));
body.push(NOTE('How to read this document. Requirements are uniquely identified and individually testable. Two markers appear throughout: [ASSUMPTION] means we chose a sensible default that should be confirmed or corrected; [PLACEHOLDER] means the requirement cannot yet be specified and is blocking. All open items are consolidated in Appendix C.'));
// TOC. The title is a styled paragraph, not a Heading 1, so that "Contents"
// does not list itself as the first entry of its own table of contents.
body.push(new Paragraph({
  pageBreakBefore: true, keepNext: true, spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: 'Contents', font: 'Calibri Light', size: 34, bold: true, color: INK })],
}));
body.push(new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }));

// ===== 1 Introduction =====
body.push(H1B('1. Introduction'));

body.push(H2('1.1 Purpose'));
body.push(P('This document specifies the functional and non-functional requirements for the DardChat Commerce Platform, a web-based system comprising an online store, an operations back office, a customer messaging engine, an AI customer assistant, and a standalone interactive 3D experience.'));
body.push(P('It is written for two audiences. Sections 1 to 3 describe the system in business terms and constitute the basis of client acceptance. Sections 4 to 7 are the implementation specification and the basis of test design.'));

body.push(H2('1.2 Scope'));
body.push(P('The system shall be a single web application backed by one relational database, serving both the public storefront and the internal back office, deployed to managed cloud infrastructure.'));
body.push(PR([{ text: 'In scope: ', bold: true }, { text: 'product catalogue and merchandising; cart and checkout; payment capture; shipping calculation and courier handoff; order lifecycle management; inventory across multiple physical locations; supplier and purchase order management; customer records and segmentation; outbound messaging via WhatsApp, email and web push; sales and operations reporting; a retrieval-grounded AI assistant; and "The Journey", a choice-driven 3D web experience producing a personal profile and a product recommendation.' }]));
body.push(PR([{ text: 'Explicitly out of scope for this release: ', bold: true }, { text: 'native mobile applications; general ledger or tax-filing accounting functions; a point-of-sale terminal application; wholesale and B2B pricing tiers; subscription commerce; loyalty programmes; barcode or QR scanning of any kind; and the sale of workshops or ticketed events, which the client runs separately from products and which is recorded as a future need in section 2.7.' }]));

body.push(H2('1.3 Definitions and abbreviations'));
body.push(TBL(['Term', 'Definition'], [
  ['SKU', 'Stock Keeping Unit — a uniquely identifiable sellable item (a specific game, in a specific edition and size)'],
  ['Variant', 'A purchasable configuration of a Product; each Variant carries exactly one SKU'],
  ['Bundle', 'A Product composed of two or more other Products, sold at a single price'],
  ['The Journey', 'The interactive 3D experience specified in section 4.15'],
  ['Trait Profile', 'The output of the Journey scoring model; an entertainment-grade characterisation, not a psychometric instrument'],
  ['Point of Sale (POS)', 'A physical location where DardChat products are sold offline'],
  ['RTL', 'Right-to-left text and layout direction'],
  ['OTP', 'One-time password used for phone-based authentication'],
  ['RAG', 'Retrieval-Augmented Generation — grounding model output in retrieved source documents'],
  ['COD', 'Cash on Delivery'],
  ['ILS', 'Israeli new shekel, the system base currency'],
  ['PITR', 'Point-in-time recovery'],
  ['CWV', 'Core Web Vitals'],
  ['Collection', 'A named, ordered grouping of Products used for merchandising'],
  ['Location', 'A stocked place — warehouse, shop or event — against which stock is held'],
  ['Segment', 'A set of Customers selected by rule over their attributes and behaviour'],
  ['Consignment', 'A parcel handed to the courier, carrying its own tracking reference'],
  ['Agora', 'The minor unit of the shekel; one hundredth of an ILS. All monetary values are stored as an integer count of agorot'],
  ['Local time', 'The IANA timezone Asia/Jerusalem, chosen so that reporting and settlement boundaries align with the payment providers the business banks through. Every reference to local time, a business day, a period boundary or an effective date in this document means this zone, per CON-10'],
], [2000, 7026]));

body.push(H2('1.4 References'));
body.push(BUL('ISO/IEC/IEEE 29148:2018 — Systems and software engineering: life cycle processes, requirements engineering'));
body.push(BUL('W3C Web Content Accessibility Guidelines (WCAG) 2.2'));
body.push(BUL('WhatsApp Business Platform policy and template approval documentation'));
body.push(BUL('[PLACEHOLDER] Payment service provider API documentation — pending provider selection'));
body.push(BUL('[PLACEHOLDER] DardChat Journey concept document — pending client delivery'));

body.push(H2('1.5 Document conventions'));
body.push(PR([{ text: '"Shall" ', bold: true }, { text: 'denotes a mandatory requirement. ' }, { text: '"Should" ', bold: true }, { text: 'denotes a recommendation. ' }, { text: '"May" ', bold: true }, { text: 'denotes an option.' }]));
body.push(P('Requirement identifiers follow FR-<MODULE>-<NNN> for functional and NFR-<CATEGORY>-<NNN> for non-functional requirements. Identifiers are permanent; withdrawn requirements are marked obsolete rather than renumbered.'));
body.push(P('Priority uses MoSCoW: M (Must — release blocking), S (Should — required for a complete release, deferrable under pressure), C (Could — include if capacity allows), W (Won’t — recorded, deferred to a later phase).'));
body.push(P('Every [ASSUMPTION] marker in this document cites an entry in the register at section 2.6, and every register entry states what changes if the assumption proves wrong. A bare marker with no identifier is a defect, and the document build refuses to produce a file containing one.'));
body.push(P('Every requirement carries an acceptance criterion stating the single check that decides whether it is met. A requirement without a criterion is not considered specified, and none are shipped in that state; section 7 assigns the verification method by group and the criterion column carries the per-requirement test.'));
body.push(NOTE('On the Must count. Roughly two thirds of the requirements in this document are Must, which is high. That is a property of the system rather than a failure of prioritisation: a store that cannot take payment, reserve stock or issue an invoice is not a store. Because MoSCoW alone therefore carries little scheduling information here, section 1.6 states an explicit descope order instead.'));

body.push(H2('1.6 Descope order'));
body.push(P('If the schedule comes under pressure, requirements shall be withdrawn in the order below, and only in that order. Withdrawal is by written agreement and is recorded in the revision history. Nothing below the line marked Floor may be withdrawn without renegotiating the contract, because the result would not be a functioning shop.'));
body.push(TBL(['#', 'Withdraw', 'Consequence accepted'], [
  ['1', 'FR-RPT-006, FR-RPT-010 — cohort reporting and scheduled report delivery', 'Reports are pulled manually'],
  ['2', 'FR-PUR-006, FR-PUR-007 — purchase history view and reorder suggestion', 'Buying decisions stay on judgement'],
  ['3', 'FR-CMS-003 — announcement banner', 'Announcements go out by WhatsApp only'],
  ['4', 'FR-CAT-003 — configurable variant axes', 'The five titles stay distinct Products; adding an edition or size later becomes a schema change (AS-16)'],
  ['5', 'FR-CRM-005 — predefined segments', 'Segments built by hand from rules'],
  ['6', 'FR-JRN-019 — Journey analytics events', 'Journey performance is not measurable until added'],
  ['7', 'FR-SRC-002 — Arabic stemming and orthographic tolerance', 'Search matches literal strings only. On a five-title catalogue browsing carries most discovery, and this is the single most expensive discretionary requirement in the document'],
  ['8', 'FR-CAT-011 — bulk CSV import and export', 'Catalogue maintained one product at a time'],
  ['9', 'FR-ACC-008 — wishlist and one-tap reorder', 'Customers rebuild carts manually'],
  ['10', 'FR-SRC-003 — faceted filtering', 'Discovery relies on search and collections'],
  ['11', 'FR-RPT-003, FR-RPT-004 — margin and inventory valuation reporting', 'Margin calculated outside the system'],
  ['—', 'FLOOR — nothing below this line is withdrawable', ''],
  ['', 'Catalogue, cart, checkout, payment, COD lifecycle, stock reservation and expiry, order lifecycle, invoicing and e-invoicing submission, delivery outcome intake, accounts, consent and messaging basics, security, privacy, accessibility, localisation', 'These constitute a functioning shop'],
], [700, 5326, 3000]));
body.push(SP(120));
body.push(NOTE('Two rungs were removed at v0.8. Gift wrapping (FR-CRT-008) and stocktake mode (FR-INV-009) were already deferred at v0.7, so offering them again as schedule relief overstated by two rungs what this ladder can actually buy. FR-SRC-002 takes a rung instead: it is a Must for a five-product catalogue, it is the most expensive discretionary item in the document, and until now the descope tool could not reach it.'));

// ===== 2 Overall Description =====
body.push(H1('2. Overall Description'));

body.push(H2('2.1 Product perspective'));
body.push(P('The system is a new, self-contained product with no predecessor. [ASSUMPTION AS-01: no existing website, customer database or order history requires migration.]'));
body.push(P('The range is seasonal in part: of the five launch titles, two are tied to Ramadan and are published ahead of the season and withdrawn after it. Demand is therefore not flat across the year, which shapes both catalogue availability (FR-CAT-014) and purchasing lead time (section 4.9). A product is a box containing question cards, challenge cards and the physical props needed to perform the challenges, so it is not modelled as a simple deck. It sits within an existing business that already supplies shops and sells at events. The system is therefore not the only channel, but it does hold its own allocation of stock rather than competing for a shared pool, so the inventory model has a single writer. Stock reaches the online allocation by deliberate transfer, which a person performs and the system records.'));
body.push(SP(80));
[
  '                    +------------------------------+',
  '   Customers ------>|      Public Storefront       |',
  '                    |  + The Journey (WebGL route) |',
  '                    +---------------+--------------+',
  '                                    |',
  '                    +---------------v--------------+',
  '   Staff    ------> |   Application + Database     | <--- AI Assistant',
  '                    |   (single shared datastore)  |',
  '                    +---------------+--------------+',
  '                                    |',
  '        +----------+----------------+---------------+----------+',
  '        v          v                v               v          v',
  '    Payment    Courier          WhatsApp          Email     Object',
  '    Provider   Service        Business API       Service    Storage',
].forEach(l => body.push(MONO(l)));
body.push(SP(200));

body.push(H2('2.2 Product functions'));
body.push(P('At the highest level the system shall:'));
[
  'Present DardChat’s brand and catalogue in Arabic and English',
  'Allow customers to purchase products and track their orders',
  'Allow staff to fulfil orders and manage stock, suppliers and purchasing',
  'Maintain a unified customer record and enable segmented outbound messaging',
  'Answer customer questions and recommend products through an AI assistant',
  'Deliver the Journey experience and convert its outcome into a product recommendation',
  'Report on sales, margin, inventory and customer behaviour',
].forEach(t => body.push(BUL(t)));

body.push(H2('2.3 User classes and characteristics'));
body.push(TBL(['Class', 'Description', 'Proficiency', 'Frequency'], [
  ['Visitor', 'Unauthenticated browser of the public site', 'Low', 'Most numerous class, short sessions; volume is modest in absolute terms — see NFR-SCL-001'],
  ['Customer', 'Authenticated purchaser with an account', 'Low', 'Periodic'],
  ['Journey Player', 'May be anonymous; becomes a Customer on capture', 'Low', 'Single or few sessions'],
  ['Staff', 'Handles enquiries, picks and dispatches orders, adjusts stock, maintains the catalogue. One person may do all of it', 'Low to moderate', 'Daily, often on mobile'],
  ['Owner', 'Everything Staff can do, plus pricing, refunds, purchasing, campaigns, user management and anything that moves money', 'Moderate', 'Daily'],
  ['AI Assistant', 'System actor holding its own fixed service identity, never the privileges of the session it serves. Its authority is the closed tool grant in FR-AI-006 and nothing else, whoever is signed in (FR-AI-020)', '—', 'Continuous'],
], [1900, 3826, 1500, 1800]));
body.push(SP(120));
body.push(P('Customers are expected to be predominantly mobile users on variable-quality mobile networks, reading Arabic. The interface shall not assume a fast connection, a large screen, or familiarity with e-commerce conventions.'));

body.push(H2('2.4 Operating environment'));
body.push(TBL(null, [
  [{ t: 'Client — storefront', bold: true, color: MUTED }, 'Chrome, Safari, Edge, Firefox — latest 2 major versions; iOS 15+; Android 10+'],
  [{ t: 'Client — Journey', bold: true, color: MUTED }, 'As above, plus a WebGL 2.0 capable GPU; a non-WebGL fallback path is mandatory (section 4.15)'],
  [{ t: 'Client — back office', bold: true, color: MUTED }, 'Desktop browsers as above; warehouse functions usable on a mobile viewport'],
  [{ t: 'Server', bold: true, color: MUTED }, 'Managed cloud runtime, Node.js LTS'],
  [{ t: 'Datastore', bold: true, color: MUTED }, 'Managed PostgreSQL with automated backup and point-in-time recovery'],
  [{ t: 'Network', bold: true, color: MUTED }, 'Public internet; design target assumes intermittent 4G with high latency variance'],
], [2400, 6626]));

body.push(H2('2.5 Design and implementation constraints'));
body.push(TBL(['ID', 'Constraint', 'Origin'], [
  [{ t: 'CON-01', font: 'Consolas', size: 17 }, 'ILS is the only currency. All monetary values shall be stored as an integer count of agorot. No conversion, secondary display currency or exchange rate exists anywhere in the system', 'Client answer'],
  [{ t: 'CON-02', font: 'Consolas', size: 17 }, 'The system shall support full RTL layout inversion, not merely translated strings', 'Market'],
  [{ t: 'CON-03', font: 'Consolas', size: 17 }, 'Card and wallet payment shall integrate a provider that will onboard the client’s registered banking entity. The globally common providers (Stripe, PayPal) will not do so and shall not be assumed available', 'Market'],
  [{ t: 'CON-04', font: 'Consolas', size: 17 }, 'Address capture shall not require a postal code and shall not assume structured street addressing', 'Market'],
  [{ t: 'CON-05', font: 'Consolas', size: 17 }, 'Phone number handling shall accept any international dialling code, normalising to E.164 for storage', 'Market'],
  [{ t: 'CON-06', font: 'Consolas', size: 17 }, 'WhatsApp messaging depends on approvals granted by Meta, not by this project. Meta must verify the business before any messaging works, and must approve each marketing message template individually. Either can be refused or delayed, so message delivery cannot be committed to a date', 'Third party'],
  [{ t: 'CON-07', font: 'Consolas', size: 17 }, 'A web page cannot post to Instagram on a user’s behalf — Instagram’s API does not allow it, and no workaround exists. Sharing therefore hands the finished image to the device, and the person chooses where to post it', 'Third party'],
  [{ t: 'CON-08', font: 'Consolas', size: 17 }, 'On iPhone, browser notifications work only after the person adds the site to their home screen, which almost nobody does. Reach on iOS is therefore close to zero and web push shall be treated as a secondary channel behind WhatsApp and email', 'Platform'],
  [{ t: 'CON-09', font: 'Consolas', size: 17 }, 'Online stock is a quantity allocated to the website and is not consumed by shop or event sales (AS-05, confirmed). Movements between the online allocation and other stock are deliberate transfers, not automatic', 'Business'],
  [{ t: 'CON-10', font: 'Consolas', size: 17 }, 'All timestamps shall be stored in UTC. Every business-meaningful boundary — reporting periods, cohort months, VAT effective dates, invoice issuance dates, maintenance windows, retention ages and frequency caps — shall be evaluated in Asia/Jerusalem local time, including across daylight-saving transitions', 'Market'],
], [1100, 6426, 1500]));

body.push(H2('2.6 Assumptions and dependencies'));
body.push(TBL(['ID', 'Assumption', 'Impact if wrong'], [
  [{ t: 'AS-01', font: 'Consolas', size: 17 }, 'No legacy system requires migration. The client does hold historical orders and receipts on paper; whether any of it is loaded into the system at launch is unresolved (OI-13)', 'Loading history adds a data-entry and cleansing task'],
  [{ t: 'AS-02', font: 'Consolas', size: 17 }, 'Products are physical only; no digital goods or downloads', 'Adds fulfilment and licensing logic'],
  [{ t: 'AS-03', font: 'Consolas', size: 17 }, 'CONFIRMED — the shops carrying the brand are third parties supplied outside this system. The website sells to consumers only', 'Resolved; no B2B pricing or credit terms required'],
  [{ t: 'AS-04', font: 'Consolas', size: 17 }, 'CLOSED — 1 to 10 products at launch, under 25 within two years', 'Resolved; a small catalogue throughout'],
  [{ t: 'AS-05', font: 'Consolas', size: 17 }, 'CLOSED — the website sells from a quantity allocated to it. Shop and event sales do not consume it', 'Resolved; FR-INV-007 withdrawn and the reservation model simplified'],
  [{ t: 'AS-06', font: 'Consolas', size: 17 }, 'Prices are displayed inclusive of VAT. Whether the business is VAT-registered is still unconfirmed (OI-07)', 'Affects price display, invoicing, reporting'],
  [{ t: 'AS-07', font: 'Consolas', size: 17 }, 'The applicable VAT rate is configurable and set by an administrator; no rate is hard-coded', 'Deliberate design decision, not an assumption to correct'],
  [{ t: 'AS-08', font: 'Consolas', size: 17 }, 'Cash on delivery is offered. The courier collects cash from the customer and later remits it, so the system must track which delivered orders have been paid for and which are still owed. Without that, cash collected in the field cannot be matched to orders', 'Removes a payment method and the reconciliation report'],
  [{ t: 'AS-09', font: 'Consolas', size: 17 }, 'CLOSED — two dispatch origins at launch, a store room and a second household location. Multi-origin is in use from day one, not deferred', 'Resolved; origin assignment is required at launch'],
  [{ t: 'AS-10', font: 'Consolas', size: 17 }, 'CLOSED — the courier is ESP. It provides neither an API nor customer-facing tracking numbers. Handoff is manual by CSV export, and the customer is told dispatch and expected delivery rather than given a tracking link', 'Resolved'],
  [{ t: 'AS-11', font: 'Consolas', size: 17 }, 'CLOSED — the client has confirmed electronic invoicing to the tax authority IS required. See 4.6 and the interface in 3.3', 'Resolved; scope increased accordingly'],
  [{ t: 'AS-12', font: 'Consolas', size: 17 }, 'CLOSED — no verified WhatsApp Business account exists. Obtaining one is a project task with external lead time outside our control', 'Resolved; messaging readiness depends on Meta'],
  [{ t: 'AS-13', font: 'Consolas', size: 17 }, 'CLOSED — the client markets through social media only and holds no email platform to retain', 'Resolved; no migration required'],
  [{ t: 'AS-14', font: 'Consolas', size: 17 }, 'Journey narrative and result copy are drafted by the supplier from the client concept, subject to two revision rounds', 'Affects effort and schedule'],
  [{ t: 'AS-15', font: 'Consolas', size: 17 }, 'The Journey plays the same scenes in the same order for everyone. Choices change what happens within a scene and what the ending is, but never which scenes a player visits. This keeps the amount of 3D work proportional to the number of scenes rather than to the number of paths through them', 'Branching paths multiply scene production and QA effort'],
  [{ t: 'AS-16', font: 'Consolas', size: 17 }, 'No variant axis is in use at launch. The five titles are distinct Products. The variant model is retained so a future edition or size can be added without schema change', 'A third axis changes catalogue and stock modelling'],
  [{ t: 'AS-17', font: 'Consolas', size: 17 }, 'WITHDRAWN at v0.7 — gift wrapping and gift messaging are deferred pending a client decision (OI-20)', 'Removes a checkout option and a fulfilment step'],
  [{ t: 'AS-18', font: 'Consolas', size: 17 }, 'OTP is delivered by WhatsApp first and SMS second, reflecting regional deliverability', 'If reversed, sign-in reliability depends on SMS routes of uncertain quality'],
  [{ t: 'AS-19', font: 'Consolas', size: 17 }, 'A customer receives at most one marketing message in any fourteen-day period, across all channels combined', 'A different cap changes campaign design and unsubscribe rates'],
  [{ t: 'AS-20', font: 'Consolas', size: 17 }, 'The Journey result is viewable without giving contact details; only saving or sharing is gated', 'This decides whether the Journey is an open share loop or a lead-capture funnel, and therefore what it is worth commercially'],
  [{ t: 'AS-21', font: 'Consolas', size: 17 }, 'Personal data is retained for 60 months of inactivity before anonymisation', 'A shorter period shortens the window for repeat-purchase marketing'],
  [{ t: 'AS-22', font: 'Consolas', size: 17 }, 'Peak load is 50 concurrent users normally and 300 at a seasonal peak. Derived from an audience of roughly 3,000 followers and a catalogue under 25 products, not from measurement. The Journey share loop is the one component that could exceed it, and it is served as static assets (NFR-SCL-004)', 'Sized down from 500/5,000 at v0.7 on audience evidence. Revisit against real traffic after the first season; the architecture is required to scale by configuration rather than redesign'],
  [{ t: 'AS-23', font: 'Consolas', size: 17 }, 'WITHDRAWN at v0.5 — there is no barcode or QR scanning anywhere in the system. Stock is identified by selecting the product, not by scanning it', 'None; the assumption no longer exists'],
], [1100, 5126, 2800]));
body.push(SP(120));
body.push(PR([{ text: 'External dependencies. ', bold: true }, { text: 'Delivery is dependent on: a merchant account approved in DardChat’s name; Meta business verification; supply of brand assets and product photography; supply of the Journey concept document; and client responses to Appendix C within agreed timeframes.' }]));

body.push(H2('2.7 Apportioning of requirements — deferred to later phases'));
body.push(NOTE('Workshops. The client runs workshops separately from the product range, and has indicated they may be paid for in advance. Selling them properly needs a scheduled sellable item with a capacity, a seat count, an attendee list and a cancellation policy — none of which the product model provides. It is out of scope for this release by agreement. The order and catalogue models should not be written in a way that forecloses adding it, but no requirement in this document covers it.'));
body.push(NOTE('Two clauses previously carried here as NFR-MNT-005 and NFR-MNT-006 — client training and documentation, and client ownership of third-party accounts — have been removed. They place obligations on the parties rather than on the system, and belong in the statement of work. They remain contractual commitments; they are simply not requirements on the software.'));
body.push(P('Recorded for architectural awareness, not built in this release: stocktake mode with variance reporting (FR-INV-009); gift wrapping and gift messaging (FR-CRT-008); a Journey result that recommends a product, and purchase attribution from it (FR-JRN-008); customer reviews and photo upload, never specified and awaiting a client decision; native mobile application; loyalty and points; gift cards; subscription boxes; affiliate tracking; offline-capable POS mode; accounting system integration; any currency other than ILS; languages beyond Arabic and English; barcode or QR scanning.'));

// ===== 3 External Interfaces =====
body.push(H1('3. External Interface Requirements'));

body.push(H2('3.1 User interfaces'));
body.push(REQ([
  ['UI-001', 'The system shall present all customer-facing interfaces in Arabic and English, with Arabic as the default locale', 'M'],
  ['UI-002', 'Selecting a locale shall invert layout direction, mirror directional iconography, and localise numerals, dates and currency formatting', 'M'],
  ['UI-003', 'Locale shall be reflected in the URL path and shall persist across sessions for authenticated users', 'M'],
  ['UI-004', 'All interfaces shall be responsive across viewport widths from 320 px upward', 'M'],
  ['UI-005', 'Back office functions required for picking and dispatch shall be operable on a mobile viewport', 'S'],
  ['UI-006', 'The system shall meet WCAG 2.2 Level AA on storefront and back office interfaces (see NFR-USA-002 for the Journey)', 'M'],
]));

body.push(H2('3.2 Hardware interfaces'));
body.push(P('The system requires no dedicated hardware. There is no barcode or QR scanning: stock and orders are identified by selection on screen, not by scanning (AS-23, withdrawn).'));

body.push(H2('3.3 Software interfaces'));
body.push(TBL(['Interface', 'Direction', 'Purpose', 'Status'], [
  ['Payment Service Provider', 'Bidirectional', 'Hosted card capture, authorisation, refund, webhook notification', { t: '[PLACEHOLDER] not selected', color: ACCENT, bold: true }],
  ['Courier service (ESP)', 'Outbound', 'Manual handoff by CSV export. No API and no customer-facing tracking (AS-10). Delivery outcomes come back by manual entry from the courier report (FR-ORD-027)', { t: 'Channel confirmed; file format NOT held (OI-23)', color: ACCENT, bold: true }],
  ['WhatsApp Business Platform', 'Bidirectional', 'Template messages, session messages, delivery receipts', 'Pending verification'],
  ['Transactional email service', 'Outbound', 'Order and account email', 'Supplier to select'],
  ['Web Push service', 'Outbound', 'Browser notifications', 'Standard Web Push'],
  ['Large language model API', 'Outbound', 'AI assistant inference', 'Google Gemini 2.5 Flash'],
  ['Object storage / CDN', 'Bidirectional', 'Product media, Journey assets, generated share images', 'Supplier to select'],
  ['Analytics and error monitoring', 'Outbound', 'Product analytics, exception capture', 'Supplier to select'],
  ['Search index', 'Bidirectional', 'Arabic and English full-text indexing and retrieval for FR-SRC-001 and FR-SRC-002', 'Supplier to select; see the note in 4.2'],
  ['Tax authority e-invoicing', 'Bidirectional', 'Submission of invoices and credit notes, and retrieval of their clearance status', 'REQUIRED — confirmed by client; certification route to be established'],
], [2100, 1500, 3426, 2000]));

body.push(H2('3.4 Communications interfaces'));
body.push(REQ([
  ['CI-001', 'All client-server communication shall use HTTPS with TLS 1.2 or higher', 'M'],
  ['CI-002', 'Payment provider callbacks shall be authenticated by signature verification and shall be idempotent', 'M'],
  ['CI-003', 'Outbound integrations shall implement timeout, retry with exponential backoff, and a dead-letter path for permanent failures', 'M'],
  ['CI-004', 'The system shall degrade gracefully when any single external service is unavailable, and shall surface the degradation to administrators', 'M'],
]));

// ===== 4 Functional =====
body.push(H1('4. Functional Requirements'));

body.push(H2('4.1 Catalogue management'));
body.push(REQ([
  ['FR-CAT-001', 'The system shall allow an authorised user to create, edit, duplicate, archive and delete Products', 'M'],
  ['FR-CAT-002', 'A Product shall support one or more Variants; each Variant shall carry a unique SKU, its own price, cost, weight and stock record', 'M'],
  ['FR-CAT-003', 'The catalogue shall support variant axes, and shall be configurable. No variant axis is in use at launch: the launch titles are separate Products, not variants of one another [ASSUMPTION AS-16]', 'C'],
  ['FR-CAT-004', 'The system shall support Bundle Products composed of two or more other Products, priced independently and decrementing each component on sale. No bundle exists in the range today; the model is specified so one can be added without schema change', 'C'],
  ['FR-CAT-005', 'WITHDRAWN at v0.7. The five launch titles are standalone games, not expansions of one another. No base-game dependency exists in the range', 'W'],
  ['FR-CAT-006', 'Every Product shall carry Arabic and English values for name, description and play instructions; a Product shall not be publishable with an incomplete locale', 'M'],
  ['FR-CAT-007', 'Products shall carry structured attributes reflecting how the range is actually merchandised: intended group (family, friends, couples), occasion or season, and category tags. Player count, minimum age and play duration shall be optional fields, populated where meaningful', 'S'],
  ['FR-CAT-008', 'The system shall support an ordered media gallery per Product, accepting images and video, with per-image alternative text per locale', 'M'],
  ['FR-CAT-009', 'Products shall have lifecycle states of Draft, Scheduled, Published and Archived, with scheduled publication at a specified date and time', 'S'],
  ['FR-CAT-010', 'The system shall support Collections: named, ordered, manually or rule-populated groupings of Products', 'S'],
  ['FR-CAT-011', 'The system shall support bulk import and export of the catalogue in CSV, with row-level validation reporting', 'S'],
  ['FR-CAT-012', 'Each Product shall carry per-locale SEO metadata and a stable, human-readable URL slug; changing a slug shall create a permanent redirect from the previous value', 'S'],
  ['FR-CAT-013', 'The system shall allow authorised users to record a unit cost per Variant, which shall never be exposed publicly', 'M'],
  ['FR-CAT-014', 'Products shall support a seasonal availability window with a start and end date. Outside the window a Product shall remain visible and indexable but not purchasable, and shall state when it returns', 'M'],
  ['FR-CAT-015', 'Each Product shall list the components it contains — question cards, challenge cards, physical props and boards — with counts where applicable, in both locales', 'S'],
]));

body.push(H2('4.2 Search and discovery'));
body.push(NOTE('Implementation note on Arabic search. FR-SRC-002 is not satisfiable by a default PostgreSQL text search configuration, which ships no Arabic stemmer. Meeting it requires either unaccent plus a custom normalisation pipeline plus pg_trgm for fuzzy matching, or a dedicated search service. That choice is a design decision, not a requirement, but it carries cost and an external dependency, and it is listed in the 3.3 interfaces table so it is not discovered late. The small launch catalogue assumed in AS-04 reduces the indexing burden; it does not make the normalisation work any smaller.'));
body.push(REQ([
  ['FR-SRC-001', 'The system shall provide full-text search across product name, description and tags, in both Arabic and English', 'M'],
  ['FR-SRC-002', 'Arabic search shall be tolerant of diacritics, of alef/hamza and taa-marbuta orthographic variation, and of common misspellings', 'M'],
  ['FR-SRC-003', 'The system shall provide faceted filtering by player count, age, duration, category, price range and availability', 'S'],
  ['FR-SRC-004', 'Filter and sort state shall be encoded in the URL and shall survive sharing, reloading and back-navigation', 'S'],
  ['FR-SRC-005', 'The system shall display related and complementary Products on a Product page, configurable manually and by rule', 'S'],
  ['FR-SRC-006', 'A search returning no results shall present recovery options: relaxed filters, popular products, and an entry point to the AI assistant', 'S'],
]));

body.push(H2('4.3 Cart and checkout'));
body.push(REQ([
  ['FR-CRT-001', 'A Visitor shall be able to add Variants to a cart without authenticating', 'M'],
  ['FR-CRT-002', 'An anonymous cart shall persist for a minimum of 30 days and shall merge into the customer cart on authentication', 'M'],
  ['FR-CRT-003', 'The cart shall permit quantity change and line removal, and shall recalculate totals immediately', 'M'],
  ['FR-CRT-004', 'The system shall re-validate price and availability at the moment of checkout initiation and shall notify the customer of any change before payment', 'M'],
  ['FR-CRT-005', 'Checkout shall be completable as a guest, and shall offer account creation after order placement without re-entry of data', 'M'],
  ['FR-CRT-006', 'Checkout shall collect, in order: contact details, delivery address, delivery method, payment method', 'M'],
  ['FR-CRT-007', 'The system shall accept a promotion code at checkout and shall display the resulting discount as a distinct line', 'S'],
  ['FR-CRT-008', 'DEFERRED at v0.7. Gift wrapping and gift messaging are not requirements for this release. Whether gift buying is a significant use case is an open question for the client (OI-20)', 'W'],
  ['FR-CRT-009', 'Order totals shall display subtotal, discount, delivery and grand total as separate additive lines, where subtotal minus discount plus delivery equals the grand total. Because prices are VAT-inclusive (AS-06), the VAT component shall be shown as a non-additive "of which VAT" line and shall never be added to the total', 'M'],
  ['FR-CRT-010', 'Placing an order shall be idempotent; repeated submission shall not create duplicate orders', 'M'],
  ['FR-CRT-011', 'The system shall record abandoned checkouts, with the stage reached, for recovery messaging', 'S'],
  ['FR-CRT-012', 'Delivery charges shall be treated as VAT-inclusive at the same rate as goods, and a discount shall reduce the VAT component in the proportion it reduces the line it applies to. The VAT component of an order shall equal the sum of the VAT components of its lines after discount, with rounding applied once at the order level', 'M'],
]));
body.push(SP(120));
body.push(NOTE('On the VAT line. Prices are quoted to the customer inclusive of VAT, which means VAT is a component of the subtotal and not an addend to it. Presenting five lines that sum to the total therefore double-counts the tax — at 16 per cent, an order genuinely charged 110.00 would display as 123.79. The rule stated in FR-CRT-009 is the one that holds for a VAT-inclusive market, and it carries through to the PDF invoice under FR-ORD-006 and to the cleared tax document under FR-ORD-019, where the arithmetic is not merely a display defect.'));

body.push(H2('4.4 Payments'));
body.push(NOTE('Still blocking, but narrowed. The client has named the intended providers and holds business banking, but has no merchant account and no online payment configured yet, so no integration documentation exists to specify against. What remains unwritable is provider-specific: redirect versus embedded capture, refund semantics, settlement timing and the webhook contract. Onboarding is the long pole and should start before anything else in this document is built. Its requirements depend on the selected payment service provider capabilities, which vary materially between the providers able to onboard the client. The requirements below are provider-independent and will hold. Provider-specific requirements — redirect versus embedded capture, 3-D Secure behaviour, refund semantics, settlement timing, webhook contract — cannot be written until reference 4 in section 1.4 is supplied.'));
body.push(REQ([
  ['FR-PAY-001', 'The system shall support Cash on Delivery as a payment method, configurable by delivery zone and subject to a maximum order value', 'M'],
  ['FR-PAY-002', 'The system shall support card payment through a hosted payment interface provided by the payment service provider', 'M'],
  ['FR-PAY-012', 'The system shall support the instant transfer and wallet methods offered by the selected providers, recording the provider reference against the order. Every such payment shall produce an invoice under FR-ORD-019', 'M'],
  ['FR-PAY-003', 'The system shall not receive, transmit, log or store primary account numbers, card verification values, or expiry dates under any circumstance', 'M'],
  ['FR-PAY-004', 'Payment authorisation results shall be recorded against the order with the provider transaction reference', 'M'],
  ['FR-PAY-005', 'The system shall treat the provider asynchronous notification, not the customer browser return, as the authoritative record of payment', 'M'],
  ['FR-PAY-006', 'The system shall support full and partial refunds initiated from the back office against any payment method, and shall record the refund reference, the amount, the method by which the money was returned and the initiating user. Cumulative refunds against an order shall never exceed the amount paid', 'M'],
  ['FR-PAY-007', 'A payment failure shall preserve the cart and present a retry path without data re-entry', 'M'],
  ['FR-PAY-008', 'The system shall provide a COD reconciliation report matching cash collected against orders marked delivered, by date and by the courier party recorded on the remittance', 'M'],
  ['FR-PAY-010', 'The system shall allow an authorised user to record a cash remittance received from a courier, capturing total amount, date, the remitting party and the user who received it', 'M'],
  ['FR-PAY-011', 'The system shall flag any COD order that remains delivered but unreconciled beyond a configurable number of days, and shall allow an Owner to write the amount off with a recorded reason', 'S'],
  ['FR-PAY-013', 'Every order shall carry a payment state, per Appendix A.3, held and transitioned independently of its fulfilment state. No fulfilment state shall be used to record whether money has moved', 'M'],
  ['FR-PAY-014', 'The system shall record a refund made in cash or by manual transfer against a COD order, capturing amount, date, method and the user who made it, and shall advance the payment state to PART_REFUNDED or REFUNDED accordingly', 'M'],
  ['FR-PAY-015', 'A refund shall be permitted from any payment state in which money has been received — PAID, COD_SETTLED or PART_REFUNDED — irrespective of the order fulfilment state, and shall not require the order to have been returned', 'M'],
  ['FR-PAY-016', 'A single cash remittance shall be allocable across several COD orders, and an order shall not be settled beyond the amount owed against it. The unallocated balance of a remittance shall be visible until it reaches zero', 'M'],
  ['FR-PAY-009', 'Provider-specific requirements — [PLACEHOLDER]', '—'],
]));

body.push(H2('4.5 Address and delivery'));
body.push(REQ([
  ['FR-ADR-001', 'The address form shall capture six values, each as a discrete field: governorate, city or locality, free-text directions, landmark description, recipient name, and recipient phone number', 'M'],
  ['FR-ADR-002', 'Postal code shall be optional and shall never block submission', 'M'],
  ['FR-ADR-003', 'The system shall allow a customer to attach a map coordinate to an address, and shall include that coordinate in fulfilment output', 'S'],
  ['FR-ADR-004', 'Phone input shall accept any international format, shall normalise to E.164 for storage, and shall display in the format local to the number', 'M'],
  ['FR-ADR-005', 'Authenticated customers shall maintain an address book with a nominated default', 'M'],
  ['FR-ADR-006', 'The system shall support delivery zones defined by governorate and locality, each with its own rate rules and COD eligibility', 'M'],
  ['FR-ADR-007', 'Delivery rates shall be computable by flat rate, by order value band, and by total weight', 'S'],
  ['FR-ADR-008', 'The system shall support a configurable free-delivery threshold per zone', 'S'],
  ['FR-ADR-009', 'The system shall support multiple dispatch origins and shall record an origin against every order. Two origins shall be configured at launch — a store room and a household address — and multi-origin operation is in use from day one [ASSUMPTION AS-09, closed]', 'M'],
  ['FR-ADR-010', 'The system shall compute and display an estimated delivery window per zone, configurable by an administrator, on the product page, at checkout and to the AI assistant (FR-AI-006)', 'S'],
  ['FR-ADR-011', 'The system shall assign an order to a dispatch origin by a configurable rule — by delivery zone, by which origin can satisfy the whole order from stock, or by a default — and shall allow an authorised user to override the assignment before picking, recording who changed it', 'M'],
]));

body.push(H2('4.6 Order management'));
body.push(NOTE('On invoicing. Electronic submission to the tax authority is confirmed and mandatory (AS-11), which makes the invoice a first-class record rather than a rendering of the order. It is modelled as its own entity in section 5.2, with a gapless sequential number that is deliberately not the order reference — FR-ORD-001 requires that reference to be non-sequential so it cannot be guessed, and a tax authority requires the opposite of an invoice series. The two cannot be the same field. FR-ORD-024 states when an invoice is issued, which differs between prepaid and cash-on-delivery orders because the tax point does; FR-ORD-025 governs the numbering; FR-ORD-026 gives the accountant somewhere to read them.'));
body.push(REQ([
  ['FR-ORD-001', 'Every order shall receive a unique, non-sequential, human-communicable reference', 'M'],
  ['FR-ORD-002', 'Orders shall progress through the state model defined in Appendix A', 'M'],
  ['FR-ORD-003', 'The system shall record an immutable, timestamped, attributed history of every order state change and edit', 'M'],
  ['FR-ORD-004', 'The back office shall provide a filterable order list with saved views, and bulk actions on selected orders', 'C'],
  ['FR-ORD-005', 'The system shall support partial fulfilment and multiple shipments against one order', 'S'],
  ['FR-ORD-006', 'The system shall generate a packing slip as PDF, and shall render the Invoice record (5.2) as a PDF VAT invoice carrying its invoice number, in the customer locale', 'M'],
  ['FR-ORD-007', 'The system shall record a dispatch reference per shipment for internal use. The courier does not supply customer-facing tracking numbers (AS-10), so the system shall communicate dispatch and expected delivery to the customer rather than a tracking link', 'M'],
  ['FR-ORD-008', 'The system shall export pending consignments as a CSV whose columns are configurable without a code change, so that the file can be matched to the courier template once that template is supplied (OI-23) [ASSUMPTION AS-10]', 'M'],
  ['FR-ORD-009', 'The system shall support returns and exchanges with a reason code, and shall restore stock on receipt of returned goods', 'S'],
  ['FR-ORD-010', 'Staff shall be able to attach internal notes to an order; internal notes shall never be visible to customers', 'S'],
  ['FR-ORD-011', 'The system shall support cancellation from any state prior to dispatch, and from DELIVERY_FAILED once the goods are back at the origin Location, releasing or restoring stock as Appendix A.1 states and raising a refund in the payment model where money has been received', 'M'],
  ['FR-ORD-012', 'A customer shall be able to view the status and history of their own orders, and no others', 'M'],
  ['FR-ORD-013', 'Authorised staff shall be able to correct the delivery address, recipient name and phone number of an order prior to dispatch; each correction shall be recorded in the order history', 'M'],
  ['FR-ORD-014', 'The system shall support a failed-delivery outcome covering both unsuccessful delivery attempts and refusal at the door', 'M'],
  ['FR-ORD-016', 'A failed delivery shall require a reason to be recorded from a configurable list', 'S'],
  ['FR-ORD-017', 'The system shall restore stock when goods from a failed delivery are received back at the origin Location', 'M'],
  ['FR-ORD-018', 'A failed delivery shall permit either redelivery or cancellation, and shall record which was chosen', 'S'],
  ['FR-ORD-019', 'The system shall submit every invoice electronically to the tax authority in the required format, and shall record the submission reference and clearance status against the invoice', 'M'],
  ['FR-ORD-020', 'Where an electronic submission fails, the system shall retry, shall surface the failure to an Owner, and shall not present the invoice as cleared', 'M'],
  ['FR-ORD-021', 'The system shall issue and submit a credit note for every refund and for every write-off of an issued invoice, referencing the original invoice and carrying the refunded amount', 'M'],
  ['FR-ORD-022', 'Checkout shall not accept an order beyond Available quantity (FR-INV-005). Backorder shall apply only where a shortfall is discovered at picking against stock the system believed it held — through damage, miscount or an adjustment — in which case the order shall be placed on backorder with a revised expectation and shall not be cancelled', 'M'],
  ['FR-ORD-023', 'An order on backorder shall return to normal fulfilment automatically once the shortfall on its lines is cleared by a receipt or an adjustment, and shall notify the customer at that point', 'M'],
  ['FR-ORD-024', 'The system shall issue one invoice for the whole order, on the first dispatch of any line for a prepaid order and on the first delivery of any consignment for a cash-on-delivery order, and shall not issue one before the applicable trigger. A later consignment against the same order shall not issue a second invoice. A cancelled order that never reached its trigger shall carry no invoice and shall require no credit note', 'M'],
  ['FR-ORD-025', 'Invoices and credit notes shall each be numbered from a gapless sequential series, distinct from the order reference and from each other. A number shall be allocated only at issuance, shall never be reused, and a void shall be recorded rather than leaving a gap', 'M'],
  ['FR-ORD-026', 'The system shall present an invoice register listing every invoice and credit note with its number, order, amount, issuance date, submission reference and clearance status, filterable by period and exportable for the accountant', 'M'],
  ['FR-ORD-027', 'The system shall record a delivery outcome per consignment — delivered, failed, refused or returned to origin — with its date, entered by an authorised user from the courier report. The absence of any outcome shall itself be a reportable state', 'M'],
  ['FR-ORD-028', 'The system shall present an ageing list of consignments dispatched without a recorded outcome beyond a configurable number of days, and shall allow an Owner to close one as lost in transit, writing the stock off with reason code loss_in_transit and raising a refund where the order was prepaid', 'M'],
  ['FR-ORD-015', 'The system shall count failed and refused deliveries per customer and shall allow an administrator to require prepayment from a customer above a configurable threshold', 'S'],
]));
body.push(SP(120));
body.push(NOTE('Why the courier path is two-directional. AS-10 fixes the outbound handoff as a manual CSV, and it is tempting to treat the whole interface that way. It cannot be: a parcel that leaves the building and is never heard of again leaves stock decremented, cash uncollected and an invoice possibly issued. FR-ORD-027 and FR-ORD-028 give outcomes a way back in and give an unresolved consignment a deadline, so that "we do not know" becomes a state the business can see rather than a silent overstatement of stock.'));

body.push(H2('4.7 Accounts, authentication and authorisation'));
body.push(REQ([
  ['FR-ACC-001', 'The system shall support registration and authentication by email and password', 'M'],
  ['FR-ACC-002', 'The system shall support authentication by phone number and one-time password', 'M'],
  ['FR-ACC-003', 'OTP delivery shall use WhatsApp as the primary channel and SMS as fallback [ASSUMPTION AS-18 — reflects regional deliverability]', 'M'],
  ['FR-ACC-004', 'OTP codes shall expire within 5 minutes, shall be single-use, and shall be rate-limited per number and per IP address', 'M'],
  ['FR-ACC-005', 'Passwords shall be stored using a memory-hard hashing function; plaintext passwords shall never be logged or stored', 'M'],
  ['FR-ACC-006', 'The system shall provide self-service password reset via a single-use, time-limited token', 'S'],
  ['FR-ACC-007', 'A customer shall be able to view and edit their profile, addresses, locale preference and notification preferences', 'M'],
  ['FR-ACC-008', 'A customer shall be able to maintain a wishlist and to reorder a previous order in a single action', 'S'],
  ['FR-ACC-009', 'A customer shall be able to request export of their personal data and deletion of their account from within an authenticated session, subject to the verification in FR-DAT-009 and the service window in FR-DAT-010', 'M'],
  ['FR-ACC-010', 'Back office access shall be governed by two roles, Owner and Staff. Permissions shall be enforced server-side on every request', 'M'],
  ['FR-ACC-011', 'Authorisation shall be denied by default; access shall require explicit grant', 'M'],
  ['FR-ACC-012', 'The system shall maintain an audit log of back office actions recording actor, action, target, before and after values, and timestamp', 'M'],
  ['FR-ACC-013', 'Back office authentication shall require a second factor for every user, of either role', 'M'],
  ['FR-ACC-014', 'An Owner shall be able to create, suspend, reinstate and permanently revoke back office user accounts', 'M'],
  ['FR-ACC-015', 'Revoking a back office account shall terminate its active sessions immediately and shall retain its audit history', 'S'],
  ['FR-ACC-016', 'Back office passwords shall be subject to a configurable minimum length and shall be checked against a list of known-breached passwords at the point of being set', 'S'],
]));

body.push(H2('4.8 Inventory'));
body.push(NOTE('On scale. Stock is held per Location because two dispatch origins genuinely exist (AS-09) — a store room and a household address. That much is required. What has been deferred is warehouse ceremony: FR-INV-009 stocktake mode is out (see 2.7), and FR-INV-008 transfer stays only as a paired movement one person records, not a picking-and-receiving workflow.'));
body.push(NOTE('No longer blocking. The client has confirmed that the website sells from a quantity allocated to it, not from a pool shared with the shops that stock the brand. FR-INV-007 is therefore withdrawn, and the reservation model below has only one writer to contend with rather than an uncontrolled offline channel. Stock still moves between the online allocation and other stock, but as a deliberate transfer under FR-INV-008, which a person performs and the ledger records.'));
body.push(REQ([
  ['FR-INV-001', 'The system shall maintain a stock quantity per Variant per Location', 'M'],
  ['FR-INV-002', 'The system shall distinguish On Hand, Reserved and Available quantities, where Available equals On Hand minus Reserved', 'M'],
  ['FR-INV-003', 'Every change to stock shall create an immutable ledger entry recording quantity delta, reason code, actor, timestamp and reference document', 'M'],
  ['FR-INV-004', 'Placing an order shall reserve stock; dispatch shall decrement On Hand and release the reservation; cancellation shall release the reservation without decrementing', 'M'],
  ['FR-INV-005', 'The system shall prevent the sale of stock beyond Available quantity, and shall resolve concurrent claims to the same unit without oversell', 'M'],
  ['FR-INV-006', 'The system shall support manual stock adjustment with a mandatory reason code, restricted to authorised roles', 'M'],
  ['FR-INV-007', 'WITHDRAWN at v0.5. Automatic capture of shop and event sales is not required: the website sells from its own allocation (AS-05, confirmed). Stock moves in by transfer under FR-INV-008', 'W'],
  ['FR-INV-008', 'The system shall support stock transfer between Locations as a two-sided movement', 'S'],
  ['FR-INV-009', 'DEFERRED at v0.7. A formal stocktake mode with variance reporting is ceremony at this scale. Counts are reconciled by manual adjustment under FR-INV-006, which records a reason code and an actor', 'W'],
  ['FR-INV-010', 'The system shall raise a configurable low-stock alert per Variant and shall notify nominated users', 'S'],
  ['FR-INV-011', 'Where a Variant is unavailable, the system shall offer a back-in-stock notification request, and shall send that notification as a transactional message to everyone holding a request when stock becomes available (FR-MSG-008)', 'S'],
  ['FR-INV-012', 'A reservation held by an order in PENDING — awaiting a prepayment that has not arrived — shall carry a configurable time to live. A sweep shall run at least every five minutes, cancel PENDING orders whose reservation has expired, release the stock and notify the customer that the order lapsed. Cash-on-delivery orders are not subject to this sweep: they are unpaid by design until delivery, and are held by COD_CONFIRMED rather than PENDING', 'M'],
  ['FR-INV-013', 'Returning an order to PENDING after a payment failure shall re-acquire the reservation before the retry is offered. Where the stock is no longer available the retry shall be refused with an explanatory message, and the order shall remain in PAYMENT_FAILED', 'M'],
  ['FR-INV-014', 'A shortfall discovered at picking shall be recorded against the order line as a quantity, and Reserved shall be reduced to the quantity actually held. The system shall not carry a reservation against stock it does not have', 'M'],
]));
body.push(SP(120));
body.push(NOTE('Why reservations expire. Stock is reserved the moment an order is placed and released only by dispatch or cancellation, which means an abandoned unpaid checkout removes a unit from sale indefinitely. On a catalogue of five titles with a Ramadan peak, a handful of abandoned orders can empty the shop while the shelves are full. FR-INV-012 gives the reservation the same finite life the cart already has, and FR-INV-013 stops a retried payment from claiming a reservation that lapsed underneath it.'));

body.push(H2('4.9 Purchasing'));
body.push(NOTE('Why this section stays. Two of the five launch titles are tied to Ramadan, and a seasonal product cannot be reordered once the season has started — the lead time is the whole game. Supplier lead time (FR-PUR-001) and the reorder signal (FR-PUR-007) therefore earn their place for a business this size, where a general purchasing module would not. What has been cut back is landed cost: FR-PUR-004 no longer models freight and duty allocation across a shipment, because a locally printed run has one invoice and a unit price, not an import cost structure.'));
body.push(REQ([
  ['FR-PUR-001', 'The system shall maintain Supplier records with contact details, payment terms and lead time', 'M'],
  ['FR-PUR-002', 'The system shall support Purchase Orders progressing through Draft, Issued, Partially Received, Received and Cancelled', 'M'],
  ['FR-PUR-003', 'The system shall support partial receipt against a Purchase Order, generating stock movements for received quantities only', 'S'],
  ['FR-PUR-004', 'The system shall allow a unit cost to be recorded against each received Purchase Order line, inclusive of any delivery or handling charge, entered as a single figure', 'S'],
  ['FR-PUR-005', 'The system shall update a Product cost basis on receipt and shall retain the historical basis, so that margin on a past order is reported against the cost in force when it was sold', 'S'],
  ['FR-PUR-006', 'The system shall present purchase history and current lead time per Variant', 'C'],
  ['FR-PUR-007', 'The system shall suggest reorder quantities derived from sales velocity, lead time and current Available quantity', 'C'],
]));

body.push(H2('4.10 Customer records and segmentation'));
body.push(REQ([
  ['FR-CRM-001', 'The system shall maintain a unified Customer record joining orders, addresses, sessions, assistant conversations, messaging consent and Journey results', 'M'],
  ['FR-CRM-002', 'The system shall compute per customer: order count, lifetime value, average order value, first and most recent order date', 'S'],
  ['FR-CRM-003', 'The system shall present a chronological activity timeline per customer', 'S'],
  ['FR-CRM-004', 'The system shall support Segments defined by rules over customer attributes and behaviour, evaluated dynamically', 'M'],
  ['FR-CRM-005', 'The system shall provide predefined segments: new, repeat, lapsed, high value, gift purchaser, Journey completer without purchase', 'C'],
  ['FR-CRM-006', 'Staff shall be able to apply tags and internal notes to a customer record', 'S'],
  ['FR-CRM-007', 'The system shall export a Segment to CSV, subject to role permission and audit logging', 'S'],
]));

body.push(H2('4.11 Messaging and campaigns'));
body.push(REQ([
  ['FR-MSG-001', 'The system shall record explicit, timestamped consent per customer per channel, and the source of that consent', 'M'],
  ['FR-MSG-002', 'The system shall not send marketing messages on any channel without recorded consent for that channel', 'M'],
  ['FR-MSG-003', 'Every marketing message shall carry a functioning unsubscribe or opt-out mechanism', 'M'],
  ['FR-MSG-004', 'The system shall send transactional messages for: order confirmation, payment outcome, dispatch, delivery, and account events', 'M'],
  ['FR-MSG-005', 'The system shall support WhatsApp template messages, submitted for Meta approval and stored with their approval status', 'M'],
  ['FR-MSG-006', 'The system shall not attempt to send a WhatsApp template that is not in an approved state, and shall surface the blockage to administrators', 'M'],
  ['FR-MSG-007', 'The system shall support broadcast campaigns to a Segment, with scheduling and per-message delivery status', 'S'],
  ['FR-MSG-008', 'The system shall support automated flows triggered by events, each classified as transactional or marketing and treated accordingly. Transactional: back in stock, where the customer asked to be told (FR-INV-011). Marketing, and therefore subject to consent (FR-MSG-002) and the cap in FR-MSG-010: abandoned cart, post-purchase follow-up, review request, lapsed-customer win-back', 'S'],
  ['FR-MSG-009', 'Web push shall be offered only where the platform supports it, and the system shall not present a push opt-in on iOS Safari outside an installed context', 'M'],
  ['FR-MSG-010', 'The system shall enforce a cap of one marketing message per customer per fourteen days, counted across all marketing channels combined [ASSUMPTION AS-19]', 'S'],
  ['FR-MSG-011', 'The system shall record delivery, failure and engagement events per message', 'S'],
]));

body.push(H2('4.12 Analytics and reporting'));
body.push(REQ([
  ['FR-RPT-001', 'The system shall present an operational dashboard covering revenue, order count, average order value and conversion rate over a selectable period with prior-period comparison', 'M'],
  ['FR-RPT-002', 'The system shall report sales by Product, Variant and Collection', 'S'],
  ['FR-RPT-003', 'The system shall report gross margin by Product and by order, using the cost basis in force at the time of sale', 'S'],
  ['FR-RPT-004', 'The system shall report inventory valuation, stock turnover and ageing', 'S'],
  ['FR-RPT-005', 'The system shall report acquisition source, funnel progression and drop-off between catalogue view, cart, checkout and purchase', 'S'],
  ['FR-RPT-006', 'The system shall report customer cohorts by first-order month, with repeat purchase rate', 'C'],
  ['FR-RPT-007', 'The system shall report Journey starts, completions and completion rate by stage. Reporting on any onward commercial effect depends on OI-21', 'S'],
  ['FR-RPT-008', 'The system shall report AI assistant volume, containment rate, escalation rate and unanswered questions', 'S'],
  ['FR-RPT-009', 'Every report shall be exportable to CSV', 'M'],
  ['FR-RPT-012', 'Reports shall present monetary values in ILS', 'M'],
  ['FR-RPT-013', 'Reports shall not present any currency other than ILS', 'M'],
  ['FR-RPT-010', 'The system shall support scheduled delivery of nominated reports by email', 'C'],
  ['FR-RPT-011', 'Reported figures shall be reproducible: the same query over the same period shall return the same result irrespective of when it is run', 'M'],
]));

body.push(H2('4.13 Currency and pricing'));
body.push(REQ([
  ['FR-CUR-001', 'All prices shall be authored, stored and transacted in ILS', 'M'],
  ['FR-CUR-002', 'The system shall present all prices, totals, invoices and reports in ILS only. No secondary display currency shall be offered', 'M'],
  ['FR-CUR-003', 'The system shall hold no exchange rate and shall perform no currency conversion', 'M'],
  ['FR-CUR-004', 'WITHDRAWN at v0.8. This requirement mandated display-only currency conversion, which CON-01 forbids outright. It survived the removal of the second currency at v0.5 and is now withdrawn; FR-CUR-002, 003 and 005 state the rule and are raised to Must', 'W'],
  ['FR-CUR-005', 'The order record shall store the ILS amount charged; no converted equivalent shall be stored', 'M'],
  ['FR-CUR-006', 'The system shall apply a configurable VAT rate, shall display prices inclusive of VAT, and shall itemise the VAT component on invoices [ASSUMPTION AS-06]', 'M'],
  ['FR-CUR-007', 'The VAT rate shall be an administrator-configurable value with an effective date; historical orders shall retain the rate applied at the time of sale', 'M'],
]));

body.push(H2('4.14 AI assistant'));
body.push(REQ([
  ['FR-AI-001', 'The system shall provide a conversational assistant accessible from every storefront page', 'M'],
  ['FR-AI-002', 'Assistant responses shall be grounded in a retrieval corpus comprising the product catalogue, policy pages and a curated FAQ', 'M'],
  ['FR-AI-003', 'The assistant shall not assert product attributes, prices, stock levels or delivery commitments that are not present in retrieved content or returned by an authorised tool', 'M'],
  ['FR-AI-004', 'The assistant shall respond in the language of the customer message, and shall accept colloquial Levantine Arabic input', 'M'],
  ['FR-AI-005', 'The assistant shall stream responses, with first output rendered within the target in NFR-PERF-004', 'S'],
  ['FR-AI-006', 'The assistant shall have read-only tool access to: catalogue search, product recommendation, stock availability, delivery estimate, and order status', 'M'],
  ['FR-AI-007', 'Order status lookup shall be available only within an authenticated session, and shall return only orders belonging to that customer', 'M'],
  ['FR-AI-008', 'The assistant shall have no write access to orders, customer records, payments or inventory in this release', 'M'],
  ['FR-AI-009', 'The assistant shall offer escalation to a human on WhatsApp when confidence is low, when the customer requests it, or after two unsuccessful exchanges on the same question. Escalation is a transactional message initiated by the customer within an open service conversation and is not subject to the marketing consent gate in FR-MSG-002', 'M'],
  ['FR-AI-010', 'The system shall retain conversation transcripts against the customer record where identified, subject to the retention policy in section 5.3', 'S'],
  ['FR-AI-011', 'The back office shall present transcripts, an unanswered-question queue, and the means to promote an answer into the retrieval corpus. Promotion shall require an Owner to approve the final wording, which shall be authored or edited by that user rather than accepted verbatim from customer text, and shall record who approved it', 'S'],
  ['FR-AI-012', 'The system shall enforce per-session and per-account rate limits and a monthly cost ceiling, degrading to a contact form when exceeded', 'M'],
  ['FR-AI-013', 'Assistant behaviour shall be validated against a maintained evaluation set covering factual accuracy, refusal behaviour, language handling and escalation triggers, executed before each release', 'M'],
  ['FR-AI-014', 'The assistant shall be visibly identified as automated at the start of every conversation', 'M'],
  ['FR-AI-015', 'Where retrieval returns no sufficiently relevant content, the assistant shall say so and offer escalation, and shall not answer from the model prior', 'M'],
  ['FR-AI-016', 'The system shall treat as untrusted every input that did not originate from the assistant configuration itself — customer messages, retrieved corpus entries, product and policy content, and tool return values. Instructions appearing anywhere in that content shall not alter the assistant instructions, its tool permissions or its escalation behaviour', 'M'],
  ['FR-AI-017', 'The system shall redact recognisable personal data - phone numbers, email addresses, full postal detail and payment references - from message content before transmission to the model provider, except where the customer has supplied it for an authorised tool lookup within the same turn', 'M'],
  ['FR-AI-018', 'The system shall record, per conversation, which tools were invoked and what they returned, for support diagnosis and privacy audit', 'S'],
  ['FR-AI-019', 'The assistant shall disengage and offer escalation on abusive or off-topic input rather than continuing the exchange', 'S'],
  ['FR-AI-020', 'The assistant shall execute under a fixed service identity holding exactly the tool grant in FR-AI-006, and shall never inherit the privileges of the signed-in user. A back office session shall confer no additional assistant capability, and the assistant shall be unavailable within back office routes', 'M'],
  ['FR-AI-021', 'Retrieved corpus content shall be delivered to the model as data within a labelled boundary, distinct from the assistant instructions, and the system shall record the corpus revision used for each response so that a corrupted entry can be traced to the conversations it affected', 'S'],
]));
body.push(SP(120));
body.push(NOTE('On the assistant privilege model. Describing the assistant as running with the privileges of the session it serves reads as convenience and is in fact the sharpest edge in the document: an Owner browsing the shop would hand a language model consuming untrusted text a session that can move money. FR-AI-020 fixes it to one service identity with a closed grant. FR-AI-016 is widened at the same time, because the corpus is not a trusted source either — staff promote entries into it from a queue of customer-authored questions, which is a route for an injection to become persistent and cross-customer, laundered through the very mechanism the assistant treats as authoritative. FR-AI-011 now requires a human to author the wording that gets promoted.'));

body.push(H2('4.15 The Journey'));
body.push(NOTE('What is settled and what is not. Settled: the Journey is a multi-stage, choice-driven 3D experience that resolves to a single outcome and presents a written psychological interpretation of the choices made. That much comes from the original brief and is specified below. Not settled: what commercial job it does. Whether the result recommends a product, and whether purchase attribution is tracked, are client decisions held at OI-21 — FR-JRN-008 is deferred and FR-RPT-007 reports engagement only. Nothing below forecloses adding the commercial tie-in later.'));
body.push(NOTE('This section is blocking. DardChat has confirmed the concept exists and that execution is the supplier responsibility. The narrative structure, scenario content, trait model and result taxonomy cannot be specified until the concept document (reference 5, section 1.4) is supplied. The requirements below are those that hold regardless of concept — the platform, engine, scoring framework, output and privacy behaviour. Content-dependent requirements are reserved at FR-JRN-020.'));
body.push(REQ([
  ['FR-JRN-001', 'The Journey shall be delivered as a distinct route within the same application, sharing authentication and customer records', 'M'],
  ['FR-JRN-002', 'The Journey shall present a sequence of scenes; at each decision point the player shall select from a discrete set of choices', 'M'],
  ['FR-JRN-003', 'Each choice shall contribute weighted values to one or more traits in a scoring model', 'M'],
  ['FR-JRN-004', 'The scene sequence shall be linear [ASSUMPTION AS-15]', 'M'],
  ['FR-JRN-021', 'Choices shall affect scene state and scoring, and shall not create divergent scene paths [ASSUMPTION AS-15 - revisit if the concept requires branching, which multiplies scene production and QA]', 'M'],
  ['FR-JRN-005', 'The system shall persist progress so that an interrupted session may be resumed on the same device', 'S'],
  ['FR-JRN-006', 'On completion the system shall compute a Trait Profile and shall resolve it to one result from a defined taxonomy', 'M'],
  ['FR-JRN-007', 'The result shall be presented with written interpretation in the player locale', 'M'],
  ['FR-JRN-008', 'DEFERRED at v0.7. Whether the result recommends a Product is a client decision (OI-21). The result taxonomy shall not be designed in a way that prevents a mapping being added later', 'W'],
  ['FR-JRN-009', 'The system shall generate a shareable result image server-side, in a format suited to vertical social formats', 'S'],
  ['FR-JRN-010', 'Sharing shall use the Web Share API where available, and shall fall back to image download and link copy where it is not. The system shall not attempt direct publication to any social platform', 'M'],
  ['FR-JRN-011', 'The result shall be viewable without providing personal data; saving or sharing may require contact capture [ASSUMPTION AS-20]', 'M'],
  ['FR-JRN-012', 'Where contact details are captured, the system shall present a specific consent statement covering both the contact data and the storage of choice data, and shall record that consent', 'M'],
  ['FR-JRN-022', 'A Journey Player shall become a Customer only at the point consent is recorded under FR-JRN-012; until then the session shall remain unlinked to any identity and shall be governed by FR-DAT-003', 'M'],
  ['FR-JRN-023', 'Trait scoring and result resolution shall be evaluated server-side by a single implementation, called by both the full-fidelity and the reduced-fidelity paths. Neither client path shall carry its own copy of the scoring rules', 'M'],
  ['FR-JRN-013', 'The Journey shall be replayable, and prior results shall be retained against an authenticated customer', 'S'],
  ['FR-JRN-014', 'The Journey shall detect device capability before loading scene assets and shall serve the reduced-fidelity path where WebGL 2.0 is unavailable, where the device fails a short capability probe, or where sustained performance falls below the threshold in NFR-PERF-006', 'M'],
  ['FR-JRN-015', 'The reduced-fidelity path shall present the same scenes in the same order, offer the same choices, call the same server-side scoring implementation (FR-JRN-023) and resolve to the same result for the same choice set. It shall meet the time-to-interactive budget in FR-JRN-024 on the NFR-PERF-009 reference configuration', 'M'],
  ['FR-JRN-027', 'The medium of the reduced-fidelity path — pre-rendered stills, video, 2D or text — is [PLACEHOLDER] pending the Journey concept document (OI-02) and shall be agreed as a priced change order (OI-24). The obligations in FR-JRN-015 hold whichever medium is chosen', '—'],
  ['FR-JRN-016', 'The Journey shall present an explicit statement that it is an entertainment experience and not a psychological assessment, before the result is shown', 'M'],
  ['FR-JRN-017', 'The Journey shall provide audio with a persistent, discoverable mute control, and shall not auto-play audio without interaction', 'M'],
  ['FR-JRN-018', 'The Journey shall honour the reduced-motion preference, substituting cuts for camera movement and disabling non-essential animation', 'M'],
  ['FR-JRN-019', 'Before consent the system shall emit only aggregate counters carrying no per-player identifier — starts, scene reached, completions and abandonment by scene. Per-choice behavioural events, the trait profile and any token capable of joining a session to an identity later shall be emitted and stored only once consent is recorded under FR-JRN-012', 'S'],
  ['FR-JRN-024', 'The Journey shall reach an interactive first scene within 8 seconds on the NFR-PERF-009 reference configuration, on both fidelity paths. The asset budget in NFR-PERF-007 is derived from this figure and not the other way round', 'M'],
  ['FR-JRN-025', 'Where the fidelity path switches during play, the system shall carry the player forward from the current scene with choices already made intact, and shall state plainly that the presentation has changed to suit the device. A switch shall never restart the experience or discard scoring', 'M'],
  ['FR-JRN-026', 'The system shall not switch fidelity path more than once in either direction within a single session, and shall require the performance threshold in NFR-PERF-006 to be breached continuously rather than momentarily before switching down', 'M'],
  ['FR-JRN-020', 'Scenario content, trait model definition, result taxonomy, scene count and scoring weights — [PLACEHOLDER]', '—'],
]));
body.push(SP(120));
body.push(NOTE('On the Journey performance budget. NFR-PERF-007 previously allowed an 8 MB initial payload, and NFR-PERF-009 fixes the acceptance network at 1.6 Mbps. Those two figures together are about forty seconds of download before a single frame decodes — and because NFR-PERF-008 exempts the Journey from every timing target, that blank screen was fully compliant. FR-JRN-024 states the outcome that actually matters, an interactive first scene within eight seconds, and NFR-PERF-007 is now derived from it. The remaining exemption in NFR-PERF-008 is narrowed so that the Journey is measured against its own budget rather than against none.'));
body.push(NOTE('On the fallback medium. FR-JRN-015 previously required the reduced-fidelity path to "differ only in visual fidelity", which cannot be met: without WebGL the path is a different medium, not the same one drawn less prettily. Which medium — stills, video, 2D or text — spans roughly a fifty-fold difference in production cost, and no honest estimate can be given before the concept document exists. FR-JRN-015 therefore now states the obligations that hold whatever is chosen (same scenes, same choices, same scoring, same result, same time-to-interactive), and FR-JRN-027 holds the medium open as a priced change order at OI-24. This is a deliberate deferral, not an oversight, and it is priced as nothing until it is agreed. One observation should inform that decision: NFR-USA-002 already requires a documented text-based alternative path carrying the same narrative, choices and result, as a Must, for accessibility. A text or stills-over-text fallback therefore reuses work the document already commits to, and sits at the cheap end of the range for reasons that have nothing to do with cutting corners.'));

body.push(H2('4.16 Content management'));
body.push(REQ([
  ['FR-CMS-001', 'Authorised users shall be able to edit the content of static pages in both locales without developer involvement', 'S'],
  ['FR-CMS-002', 'The system shall support articles with author, publication date, tags and per-locale SEO metadata', 'S'],
  ['FR-CMS-003', 'The system shall support a configurable announcement banner with scheduling', 'C'],
  ['FR-CMS-004', 'The system shall manage policy documents — delivery, returns, privacy, terms — as versioned content, retaining superseded versions', 'M'],
]));

// ===== 5 Data =====
body.push(H1('5. Data Requirements'));

body.push(H2('5.1 Principal entities'));
[
  'Customer --< Order --< OrderLine >-- Variant >-- Product',
  '   |           |                        |           |',
  '   |           +--< Shipment            |           +--< MediaAsset',
  '   |           +--< Payment             |           +--< ProductCollection',
  '   |           +--< OrderEvent          |',
  '   |           +--< Invoice --< CreditNote',
  '   |                                    +--< StockLevel >-- Location',
  '   +--< Address                         +--< StockMovement',
  '   +--< ConsentRecord            CashRemittance --< RemittanceAllocation',
  '   |                                     (allocated to COD Orders)',
  '   +--< JourneyResult               Supplier --< PurchaseOrder --< POLine',
  '   +--< Conversation --< Message',
  '   +--< SegmentMembership           User --< Role --< Permission',
  '                                      +--< AuditEntry',
].forEach(l => body.push(MONO(l)));
body.push(SP(200));

body.push(H2('5.2 Data dictionary — selected entities'));
body.push(P('Order', { bold: true, after: 80 }));
body.push(TBL(['Attribute', 'Type', 'Notes'], [
  ['reference', 'string', 'Unique, non-sequential, communicable aloud. Never used as an invoice number (FR-ORD-025)'],
  ['customer_id', 'FK, nullable', 'Null for guest orders'],
  ['status', 'enum', 'Fulfilment state, per Appendix A.1'],
  ['payment_state', 'enum', 'Per Appendix A.3. Advances independently of status (FR-PAY-013)'],
  ['origin_location_id', 'FK', 'Dispatch origin assigned under FR-ADR-011'],
  ['currency', 'string', 'Always ILS'],
  ['subtotal, discount, delivery, total', 'integer', 'Agorot. subtotal − discount + delivery = total'],
  ['vat_component', 'integer', 'Agorot. Contained within total, never added to it (FR-CRT-009)'],
  ['vat_rate', 'decimal', 'Rate in force at purchase'],
  ['payment_method', 'enum', 'card, wallet, instant_transfer, cod'],
  ['placed_at, dispatched_at, delivered_at', 'timestamp', ''],
], [3000, 2000, 4026]));
body.push(SP(160));
body.push(P('OrderLine', { bold: true, after: 80 }));
body.push(TBL(['Attribute', 'Type', 'Notes'], [
  ['order_id, variant_id', 'FK', ''],
  ['quantity', 'integer', 'Ordered quantity'],
  ['shortfall_qty', 'integer', 'Quantity found missing at picking (FR-INV-014). Zero on a normal line; non-zero puts the order in BACKORDERED'],
  ['unit_price, line_total, line_vat', 'integer', 'Agorot; VAT-inclusive pricing, so line_vat is contained within line_total'],
], [3000, 2000, 4026]));
body.push(SP(160));
body.push(P('Invoice', { bold: true, after: 80 }));
body.push(TBL(['Attribute', 'Type', 'Notes'], [
  ['number', 'string', 'Gapless sequential series, distinct from the order reference (FR-ORD-025)'],
  ['order_id', 'FK', ''],
  ['issued_at', 'timestamp', 'Dispatch for prepaid, delivery for COD (FR-ORD-024)'],
  ['net, vat, gross', 'integer', 'Agorot. gross is the amount charged; vat is contained within it'],
  ['vat_rate', 'decimal', 'Rate in force at the point of sale'],
  ['submission_reference', 'string, nullable', 'Returned by the tax authority (FR-ORD-019)'],
  ['clearance_status', 'enum', 'not_submitted, submitted, cleared, rejected'],
  ['voided_at, void_reason', 'timestamp, string', 'A void is recorded; the number is never reused and never left as a gap'],
], [3000, 2000, 4026]));
body.push(SP(160));
body.push(P('CreditNote', { bold: true, after: 80 }));
body.push(TBL(['Attribute', 'Type', 'Notes'], [
  ['number', 'string', 'Its own gapless series, distinct from the invoice series'],
  ['invoice_id', 'FK', 'The invoice being credited'],
  ['amount', 'integer', 'Agorot. May be partial; the sum of credit notes shall not exceed the invoice gross'],
  ['reason', 'enum', 'refund, return, write_off, correction'],
  ['submission_reference, clearance_status', 'string, enum', 'Submitted and cleared as an invoice is (FR-ORD-021)'],
], [3000, 2000, 4026]));
body.push(SP(160));
body.push(P('CashRemittance and RemittanceAllocation', { bold: true, after: 80 }));
body.push(TBL(['Attribute', 'Type', 'Notes'], [
  ['amount, received_at', 'integer, timestamp', 'The lump sum handed over, in agorot'],
  ['remitting_party', 'string', 'The courier party that handed the cash over'],
  ['received_by_user_id', 'FK', 'Who took it (FR-PAY-010)'],
  ['unallocated_balance', 'integer', 'Derived; visible until zero (FR-PAY-016)'],
  ['allocation: order_id, amount', 'FK, integer', 'One remittance splits across many COD orders; an order cannot be settled beyond what it owes'],
], [3000, 2000, 4026]));
body.push(SP(160));
body.push(P('StockMovement', { bold: true, after: 80 }));
body.push(TBL(['Attribute', 'Type', 'Notes'], [
  ['variant_id, location_id', 'FK', ''],
  ['delta', 'integer', 'Signed'],
  ['reason', 'enum', 'sale_online, purchase_receipt, return, adjustment, transfer_in, transfer_out, loss_in_transit'],
  ['reference_type, reference_id', 'polymorphic', 'Originating document'],
  ['actor_id, occurred_at', 'FK, timestamp', 'Append-only; never updated or deleted (FR-DAT-006)'],
], [3000, 2000, 4026]));
body.push(SP(160));
body.push(P('JourneyResult', { bold: true, after: 80 }));
body.push(TBL(['Attribute', 'Type', 'Notes'], [
  ['customer_id', 'FK, nullable', 'Null until contact captured'],
  ['session_token', 'string', 'Links anonymous play to later identification'],
  ['choices', 'JSON', 'Ordered choice record — PERSONAL DATA'],
  ['trait_scores', 'JSON', 'Computed profile — PERSONAL DATA'],
  ['result_key', 'string', 'Resolved taxonomy entry'],
  ['consent_record_id', 'FK, nullable', 'Required before customer_id may be set'],
  ['completed_at', 'timestamp', ''],
], [3000, 2000, 4026]));

body.push(H2('5.3 Retention, deletion and portability'));
body.push(REQ([
  ['FR-DAT-001', 'The system shall define and enforce a retention period per data category, configurable by an administrator', 'S'],
  ['FR-DAT-002', 'Journey choice and trait data linked to an identified customer shall be retained no longer than 60 months from last activity, then anonymised [ASSUMPTION AS-21]', 'M'],
  ['FR-DAT-003', 'Anonymous Journey sessions not linked to a customer within 90 days shall be reduced to aggregate analytics and the raw record deleted', 'S'],
  ['FR-DAT-004', 'On a verified deletion request (FR-DAT-009) the system shall erase or irreversibly anonymise the subject personal data within the service window stated in FR-DAT-010', 'M'],
  ['FR-DAT-007', 'Deletion shall retain the financial record required for accounting, in a form that no longer identifies the individual', 'M'],
  ['FR-DAT-005', 'On a verified request (FR-DAT-009) the system shall produce a machine-readable export of a customer personal data within the service window stated in FR-DAT-010', 'M'],
  ['FR-DAT-006', 'OrderEvent, Payment, StockMovement, AuditEntry, Invoice and CreditNote are append-only: once written, a row shall not be updated or deleted, and correction shall occur by a compensating entry. Order, OrderLine, Customer, Address and Variant are mutable current-state rows; every change to them shall be journaled to the corresponding append-only entity with actor, timestamp, and before and after values', 'M'],
  ['FR-DAT-008', 'The append-only rule in FR-DAT-006 shall yield to the erasure duty in FR-DAT-004 only by replacing identifying values within a retained row with a non-reversible placeholder, never by deleting the row. The financial and audit trail shall survive erasure intact but de-identified', 'M'],
  ['FR-DAT-009', 'A request shall count as verified when it is made from an authenticated session belonging to the subject and confirmed by a single-use code sent to the contact channel already held on the account. A request arriving by any other route shall not be actioned by the system, and shall be referred to an Owner for manual identity checking recorded against the customer', 'M'],
  ['FR-DAT-010', 'Export and deletion requests shall complete within 30 days of verification. The system shall record the request date, the verification date and the completion date, and shall alert an Owner where a request approaches the window unfulfilled', 'M'],
]));
body.push(SP(120));
body.push(NOTE('Why immutability had to be bounded. An earlier draft required that order, payment, stock and audit records be immutable once written. Read literally that forbids a status change, which every order makes a dozen times, and it forbids the address correction FR-ORD-013 requires — while also colliding with the erasure duty in FR-DAT-004. The rule as now written names the ledgers that are genuinely append-only and makes everything else a current-state row with a journal behind it, which is what the system can actually be built to do.'));
body.push(NOTE('Why "verified request" is now defined. The phrase carried the whole weight of the data-subject rights: an unverified export hands one person another person\'s address, order history and Journey profile, and an unverified deletion destroys a customer record on request from anyone who knows an email address. FR-DAT-009 states what verification means and refuses to automate anything weaker; FR-DAT-010 states the window in days rather than referring to one that appears nowhere else in the document.'));

// ===== 6 NFR =====
body.push(H1('6. Non-functional Requirements'));

body.push(H2('6.1 Performance'));
body.push(REQ([
  ['NFR-PERF-001', 'Storefront pages shall achieve Largest Contentful Paint under 2.5 s at the 75th percentile on the reference device and network defined in NFR-PERF-009', 'M'],
  ['NFR-PERF-002', 'Interaction to Next Paint shall be under 200 ms and Cumulative Layout Shift under 0.1 at the 75th percentile', 'M'],
  ['NFR-PERF-003', 'Server response for catalogue and search requests shall be under 400 ms at the 95th percentile, excluding network transit', 'S'],
  ['NFR-PERF-004', 'The AI assistant shall render first output within 2.5 s of message submission at the 90th percentile', 'S'],
  ['NFR-PERF-005', 'Back office list views shall render within 1.5 s at the 95th percentile for result sets up to 10,000 rows', 'S'],
  ['NFR-PERF-006', 'The Journey shall sustain 30 frames per second on the reference device defined in NFR-PERF-009. The frame rate shall be sampled only after a 5-second warm-up following scene entry, and shall trigger the reduced-fidelity path only after falling below the threshold for 5 continuous seconds, subject to the single-switch rule in FR-JRN-026', 'M'],
  ['NFR-PERF-007', 'The Journey initial interactive payload shall not exceed 1 MB. The figure is derived from FR-JRN-024 and the derivation is stated here so it can be checked: 8 seconds at the NFR-PERF-009 rate of 1.6 Mbps is 1.6 MB of transfer, less roughly 0.5 s of connection setup at a 150 ms round trip and roughly 2 s of parse, decode and first render, leaving about 1.1 MB — 1 MB carries the margin. Subsequent scene assets shall load progressively during play, ahead of the scene that needs them', 'M'],
  ['NFR-PERF-008', 'Journey assets shall be excluded from the storefront targets in NFR-PERF-001 and NFR-PERF-002, which measure catalogue and checkout routes. The Journey shall instead be measured against FR-JRN-024 and NFR-PERF-006, and shall not be exempt from a timing target altogether', 'M'],
  ['NFR-PERF-009', 'The reference device for every performance target shall be a Samsung Galaxy A54, or a device within 10 per cent of its benchmark score, on a network throttled to 1.6 Mbps down, 750 kbps up, 150 ms round trip. Acceptance measurements shall be taken on this configuration and no other', 'M'],
]));

body.push(H2('6.2 Availability and reliability'));
body.push(REQ([
  ['NFR-AVL-001', 'The system shall achieve 99.5% monthly availability, excluding planned maintenance capped at 4 hours per calendar month, scheduled outside 09:00 to 21:00 local time as defined in CON-10, and announced at least 72 hours in advance', 'M'],
  ['NFR-AVL-002', 'Recovery Point Objective shall not exceed 15 minutes; Recovery Time Objective shall not exceed 4 hours', 'M'],
  ['NFR-AVL-003', 'Database backups shall be automated and PITR enabled; a restore shall be rehearsed before launch and at least annually thereafter', 'M'],
  ['NFR-AVL-004', 'Failure of the AI assistant, analytics, or push services shall not impair browsing, checkout or order management', 'M'],
  ['NFR-AVL-005', 'Failure of the payment provider shall present an explicit, actionable message and shall preserve the cart', 'M'],
]));

body.push(H2('6.3 Security'));
body.push(REQ([
  ['NFR-SEC-001', 'All traffic shall be served over HTTPS with HSTS enabled', 'M'],
  ['NFR-SEC-002', 'The system shall carry no unremediated finding in any OWASP Top 10 class at release, at any severity. A finding judged not to warrant remediation shall be accepted in writing by an Owner with a stated rationale, and shall be re-reviewed at the next release', 'M'],
  ['NFR-SEC-003', 'Authorisation shall be enforced server-side on every request; no access decision shall rely on client-side state', 'M'],
  ['NFR-SEC-004', 'Authentication endpoints, OTP issuance, password reset and the assistant shall be rate-limited per identity and per address', 'M'],
  ['NFR-SEC-005', 'Secrets and credentials shall be held in a managed secret store, never in source control', 'M'],
  ['NFR-SEC-006', 'Personal data shall be encrypted at rest and in transit', 'M'],
  ['NFR-SEC-007', 'Application logs shall not contain payment data, authentication credentials, OTP values or session tokens', 'M'],
  ['NFR-SEC-008', 'Public forms and the assistant shall be protected against automated abuse', 'M'],
  ['NFR-SEC-009', 'Dependencies shall be monitored for known vulnerabilities, with critical advisories remediated within 7 days', 'S'],
  ['NFR-SEC-010', 'Administrative sessions shall expire after 12 hours of inactivity', 'S'],
  ['NFR-SEC-011', 'The system shall remain eligible for PCI DSS SAQ-A by ensuring cardholder data is captured, transmitted and stored entirely by the payment service provider. Any change that would place the application in the cardholder data flow shall be treated as a change of scope requiring written agreement', 'M'],
]));

body.push(H2('6.4 Privacy and compliance'));
body.push(REQ([
  ['NFR-PRV-001', 'Personal data collection shall be limited to what each stated purpose requires', 'M'],
  ['NFR-PRV-002', 'Consent shall be specific, informed, separately recorded per purpose, and withdrawable by the same effort required to give it', 'M'],
  ['NFR-PRV-003', 'A privacy notice shall state what is collected, why, how long it is retained, and how to exercise access and deletion rights, in both locales', 'M'],
  ['NFR-PRV-004', 'Non-essential analytics and marketing technologies shall not execute before consent', 'M'],
  ['NFR-PRV-005', 'Journey choice and trait data shall be treated as a distinct, more sensitive category with its own consent and retention treatment', 'M'],
  ['NFR-PRV-007', 'The hosting region for the primary datastore and for its backups shall be recorded in the privacy notice, and shall not change without written client agreement', 'M'],
  ['NFR-PRV-006', 'Applicable data protection regime — [PLACEHOLDER, blocking at OI-25]. NFR-PRV-001 to 005 are written to a defensible general standard and are testable as they stand, but the regime decides breach notification duties, the lawful basis recorded for each purpose, the permitted transfer of personal data outside the hosting region, and the statutory response window that FR-DAT-010 currently sets by choice rather than by law', '—'],
]));
body.push(SP(120));
body.push(NOTE('On the privacy regime. This placeholder previously read as dependent on AS-11, which closed at v0.5 when the client confirmed electronic invoicing. Closing the invoicing half left the genuinely open half — which data protection law the business is subject to — pointing at a resolved assumption and tracked nowhere. It is now a blocking open issue in its own right at OI-25. Five Must requirements are specified against a regime nobody has named, and while they are sound as general practice, the obligations that carry penalties cannot be confirmed until it is.'));

body.push(H2('6.5 Usability and accessibility'));
body.push(REQ([
  ['NFR-USA-001', 'Storefront and back office shall conform to WCAG 2.2 Level AA', 'M'],
  ['NFR-USA-002', 'The Journey shall conform to WCAG 2.2 Level AA in all non-canvas interface elements, shall be fully operable by keyboard, and shall provide a documented text-based alternative path delivering the same narrative, choices and result', 'M'],
  ['NFR-USA-003', 'All interactive controls shall present a visible keyboard focus indicator', 'M'],
  ['NFR-USA-004', 'Colour shall not be the sole carrier of meaning', 'M'],
  ['NFR-USA-005', 'Error messages shall state what went wrong and what to do next, in plain language, in the active locale', 'M'],
  ['NFR-USA-006', 'A customer shall be able to complete a purchase from product page to confirmation in no more than five screens', 'S'],
]));

body.push(H2('6.6 Localisation'));
body.push(REQ([
  ['NFR-LOC-001', 'All user-facing text shall be externalised; no literal text shall be embedded in application code', 'M'],
  ['NFR-LOC-002', 'Layout shall invert fully under RTL, including navigation, form alignment, tables, charts and directional iconography', 'M'],
  ['NFR-LOC-003', 'Arabic typography shall use a typeface with complete Arabic coverage and correct rendering of ligatures and diacritics', 'M'],
  ['NFR-LOC-004', 'Dates, numbers and currency shall be formatted per locale convention', 'S'],
  ['NFR-LOC-005', 'Mixed Arabic and Latin content shall render with correct bidirectional isolation and shall not corrupt punctuation order', 'M'],
  ['NFR-LOC-006', 'Generated PDFs shall render Arabic correctly, including shaping and direction', 'M'],
]));

body.push(H2('6.7 Scalability and maintainability'));
body.push(NOTE('NFR-MNT-005 and NFR-MNT-006 are intentionally absent. They were withdrawn at v0.3 because they placed obligations on the parties rather than on the system, and now sit in the statement of work. Their identifiers are retired and shall not be reused. See the note at the end of section 2.7.'));
body.push(REQ([
  ['NFR-SCL-001', 'The system shall sustain 50 concurrent users under normal load and 300 during a seasonal peak without breaching section 6.1. It shall degrade gracefully rather than fail at 1,000. Raising these figures shall be a hosting and configuration change, not a re-architecture [ASSUMPTION AS-22]', 'M'],
  ['NFR-SCL-002', 'The data model shall accommodate 100,000 orders and 100,000 customers without schema change', 'S'],
  ['NFR-SCL-003', 'The system shall scale horizontally at the application tier without session affinity', 'S'],
  ['NFR-SCL-004', 'Journey assets shall be served from a CDN rather than the application, so that a shared result driving sudden traffic consumes static bandwidth and does not load the checkout or back office', 'M'],
  ['NFR-MNT-001', 'All infrastructure shall be reproducible from configuration held in source control', 'S'],
  ['NFR-MNT-002', 'A staging environment shall mirror production configuration and shall hold no production personal data', 'M'],
  ['NFR-MNT-003', 'Deployment shall be automated, gated on passing tests, and reversible', 'M'],
  ['NFR-MNT-004', 'Errors shall be captured to a monitoring service with alerting on rate thresholds', 'M'],
  ['NFR-MNT-007', 'The system shall record a queryable business event history - order, payment, stock, messaging and assistant events - sufficient for support staff to reconstruct what happened to a given order or customer without database access', 'S'],
]));

// ===== 7 Verification =====
body.push(H1('7. Verification'));
body.push(P('Every requirement in this document shall be verified by one or more of: inspection (review of artefact or configuration), demonstration (observed operation), test (executed against defined criteria), or analysis (measurement or modelling).'));
body.push(TBL(['Requirement group', 'Primary method', 'Verification instrument'], [
  ['3.1 User interfaces', 'Inspection + Test', 'Locale and viewport matrix across every template'],
  ['3.3 Software interfaces', 'Demonstration', 'Each integration exercised against its sandbox or stub'],
  ['3.4 Communications interfaces', 'Test', 'Fault injection: timeout, retry exhaustion, replayed callback, invalid signature'],
  ['4.1 Catalogue', 'Test', 'Automated CRUD, variant, bundle and publication-state suite'],
  ['4.2 Search and discovery', 'Test', 'Arabic and English query corpus with expected result sets'],
  ['4.3 Cart and checkout', 'Test', 'End-to-end purchase suite including mid-session price and stock change'],
  ['4.4 Payments', 'Test', 'Provider sandbox: authorisation, decline, timeout, duplicate callback, full and partial refund; COD remittance split across orders'],
  ['4.5 Address and delivery', 'Test + Inspection', 'Postal-code-free and dual-country-code address cases; zone rate boundaries'],
  ['4.6 Order management', 'Test', 'Traversal of both Appendix A machines proving every listed transition and refusing all others; invoice numbering proved gapless under concurrent issuance'],
  ['4.7 Accounts and authorisation', 'Test', 'Per-role endpoint matrix by direct request; OTP and MFA cases'],
  ['4.8 Inventory', 'Test', 'Concurrency test proving no oversell under simultaneous claims; reservation expiry sweep over aged fixtures; ledger append-only enforcement'],
  ['4.9 Purchasing', 'Test', 'Purchase order lifecycle with partial receipt and cost-basis update'],
  ['4.10 Customer records and segmentation', 'Test', 'Seeded customer set with independently calculated metrics and segment membership'],
  ['4.11 Messaging', 'Demonstration', 'Consent gating and template approval states observed per channel'],
  ['4.12 Analytics and reporting', 'Analysis', 'Every reported figure reconciled to source records over a seeded period'],
  ['4.13 Currency and pricing', 'Test', 'Minor-unit arithmetic, rate-change isolation and VAT itemisation cases'],
  ['4.14 AI assistant', 'Test', 'Maintained evaluation set including grounding, injection, PII redaction and escalation'],
  ['4.15 The Journey', 'Test + Demonstration', 'Device matrix including the NFR-PERF-009 reference device; fallback trigger, mid-experience switch and pre-consent telemetry boundary all verified'],
  ['4.16 Content management', 'Demonstration', 'Non-developer edits and publishes in both locales; policy versions retrievable'],
  ['5.3 Data retention and portability', 'Test + Inspection', 'Purge job over aged fixtures; deletion and export requests executed end to end'],
  ['6.1 Performance', 'Analysis', 'Field and lab measurement on the NFR-PERF-009 configuration'],
  ['6.2 Availability and reliability', 'Demonstration', 'Restore drill against RPO and RTO; each dependency disabled in turn'],
  ['6.3 Security', 'Inspection + Test', 'Review, dependency scan, per-role authorisation test, log and traffic inspection'],
  ['6.4 Privacy and compliance', 'Inspection', 'Data map against stated purposes; pre-consent network capture; notice review'],
  ['6.5 Accessibility', 'Inspection + Test', 'Automated audit plus manual keyboard and screen reader pass'],
  ['6.6 Localisation', 'Inspection', 'Full-page RTL review of every screen by an Arabic reader; PDF shaping check'],
  ['6.7 Scalability and maintainability', 'Analysis + Demonstration', 'Load test at stated concurrency; rebuild from source control; rollback drill'],
], [2600, 2200, 4226]));
body.push(SP(120));
body.push(P('Coverage is complete: every numbered requirement in sections 3 to 6 falls within exactly one group above, and carries its own acceptance criterion in the requirement tables. A requirement is met when its criterion passes under the method assigned to its group.'));

// ===== Appendices =====
body.push(H1B('Appendix A — Order state model'));
body.push(NOTE('Two state machines, not one. An order carries a fulfilment state (A.1, A.2) and a payment state (A.3, A.4), and they advance independently. Splitting them is what allows a paid order to be cancelled, a cash refund to be recorded on a COD order, and a partial refund to exist at all — none of which a single machine could express. Every transition in either machine writes an OrderEvent per FR-ORD-003.'));
body.push(SP(60));
body.push(P('A.1 Fulfilment states', { bold: true, after: 80 }));
body.push(TBL(['State', 'Meaning', 'Stock effect'], [
  ['PENDING', 'Order created; payment not yet resolved', 'Reserved'],
  ['PAID', 'Prepayment confirmed by the provider — card, wallet or instant transfer (FR-PAY-012)', 'Reserved'],
  ['COD_CONFIRMED', 'Cash-on-delivery order accepted for fulfilment', 'Reserved'],
  ['PAYMENT_FAILED', 'Authorisation declined, timed out, or abandoned', 'Reservation released'],
  ['PROCESSING', 'Accepted for picking and packing', 'Reserved'],
  ['BACKORDERED', 'A shortfall was found at picking (FR-ORD-022). The order is held and the customer has been given a revised expectation. Never cancelled for this reason', 'Reservation retained for the quantity on hand; the shortfall is carried on the order line and is not a reservation against stock that does not exist'],
  ['PARTIALLY_DISPATCHED', 'One or more, but not all, lines dispatched (FR-ORD-005)', 'Decremented for dispatched lines only'],
  ['DISPATCHED', 'All lines handed to the courier', 'Decremented'],
  ['DELIVERED', 'Receipt confirmed. For COD, cash reconciliation becomes due', 'Decremented'],
  ['DELIVERY_FAILED', 'Courier could not deliver, or the customer refused the parcel', 'Restored on receipt back at the origin Location (FR-ORD-017)'],
  ['LOST_IN_TRANSIT', 'The consignment was neither delivered nor returned within the ageing threshold, and has been written off (FR-ORD-028). Terminal', 'Written off; a ledger entry with reason code loss_in_transit clears the decremented quantity'],
  ['CANCELLED', 'The order will not be fulfilled. Reachable before dispatch, and after a failed delivery once the goods are back. Terminal', 'Reservation released where still held; stock restored where already returned'],
  ['RETURN_REQUESTED', 'Customer has requested a return within the policy window', 'Unchanged until goods received'],
  ['RETURNED', 'Returned goods received and inspected', 'Restored'],
  ['COMPLETED', 'Delivered, return window elapsed, and money settled — cash reconciled or refund completed as applicable. Terminal', 'Unchanged'],
], [2200, 3626, 3200]));
body.push(SP(120));
body.push(NOTE('REFUNDED is deliberately absent from this table. A refund is a movement of money, not of goods, and is held in the payment state model at A.3. An order that is refunded in full still has a fulfilment history — it was dispatched, delivered and returned — and flattening the two into one machine is what made partial refunds inexpressible in earlier drafts.'));
body.push(SP(120));
body.push(P('A.2 Permitted fulfilment transitions', { bold: true, after: 80 }));
body.push(TBL(['From', 'To', 'Trigger', 'Side effect'], [
  ['PENDING', 'PAID', 'Provider notification confirms authorisation (FR-PAY-005)', 'payment_state → PAID; confirmation message sent'],
  ['PENDING', 'COD_CONFIRMED', 'COD order accepted; zone and value limits satisfied (FR-PAY-001)', 'payment_state → COD_DUE; confirmation message sent'],
  ['PENDING', 'PAYMENT_FAILED', 'Authorisation declined or expired', 'Reservation released; cart preserved for retry (FR-PAY-007)'],
  ['PENDING', 'CANCELLED', 'Customer or staff cancellation before payment resolves', 'Reservation released'],
  ['PENDING', 'CANCELLED', 'Reservation time-to-live expired without payment (FR-INV-012)', 'Reservation released; customer notified that the order lapsed'],
  ['PAYMENT_FAILED', 'PENDING', 'Customer retries payment, and the reservation is re-acquired (FR-INV-013)', 'Stock reserved again. Where stock is no longer available the retry is refused and the order stays in PAYMENT_FAILED'],
  ['PAID', 'PROCESSING', 'Released to the warehouse', 'None'],
  ['COD_CONFIRMED', 'PROCESSING', 'Released to the warehouse', 'None'],
  ['PAID', 'CANCELLED', 'Cancellation after payment, before picking (FR-ORD-011)', 'Reservation released; refund raised in the payment model (A.4)'],
  ['COD_CONFIRMED', 'CANCELLED', 'Cancellation after acceptance, before picking (FR-ORD-011)', 'Reservation released; payment_state → COD_CANCELLED, no money moves'],
  ['PROCESSING', 'PARTIALLY_DISPATCHED', 'Some lines dispatched', 'Consignment reference recorded; invoice issued where prepaid, this being the first dispatch (FR-ORD-024)'],
  ['PROCESSING', 'DISPATCHED', 'All lines dispatched', 'Consignment reference recorded; dispatch message sent; invoice issued where prepaid (FR-ORD-024)'],
  ['PARTIALLY_DISPATCHED', 'DISPATCHED', 'Remaining lines dispatched', 'Second consignment recorded; no second invoice is issued (FR-ORD-024)'],
  ['PROCESSING', 'BACKORDERED', 'Shortfall found at picking (FR-ORD-022)', 'Shortfall recorded on the line; customer told a revised expectation'],
  ['BACKORDERED', 'PROCESSING', 'Stock received or adjusted in, clearing the shortfall (FR-ORD-023)', 'Reservation restored in full; customer notified that fulfilment has resumed'],
  ['BACKORDERED', 'CANCELLED', 'Customer chooses to cancel while waiting', 'Reservation released; refund raised in the payment model where prepaid'],
  ['PROCESSING', 'CANCELLED', 'Cancellation before dispatch (FR-ORD-011)', 'Reservation released; refund raised in the payment model where prepaid'],
  ['DISPATCHED', 'DELIVERED', 'Courier outcome recorded as delivered (FR-ORD-027)', 'COD reconciliation becomes due (FR-PAY-008); invoice issued where COD (FR-ORD-024)'],
  ['PARTIALLY_DISPATCHED', 'DELIVERED', 'Courier outcome recorded as delivered for every dispatched consignment', 'As above, for the dispatched lines; where COD, the invoice is issued on the first such delivery and not again'],
  ['DISPATCHED', 'DELIVERY_FAILED', 'Delivery attempts exhausted, or parcel refused (FR-ORD-014)', 'Reason recorded (FR-ORD-016); customer flagged (FR-ORD-015)'],
  ['PARTIALLY_DISPATCHED', 'DELIVERY_FAILED', 'A dispatched consignment fails and no further lines are outstanding', 'As above, for the affected consignment'],
  ['DISPATCHED', 'LOST_IN_TRANSIT', 'No outcome recorded within the ageing threshold and the consignment is written off (FR-ORD-028)', 'Stock written off; refund raised where prepaid'],
  ['DELIVERY_FAILED', 'LOST_IN_TRANSIT', 'Goods never arrive back at the origin within the ageing threshold', 'Stock written off; refund raised where prepaid'],
  ['DELIVERY_FAILED', 'PROCESSING', 'Redelivery agreed with the customer (FR-ORD-018)', 'Stock reserved again on receipt back at origin'],
  ['DELIVERY_FAILED', 'CANCELLED', 'Redelivery declined or abandoned (FR-ORD-018)', 'Stock restored on receipt back at origin (FR-ORD-017); refund raised where prepaid'],
  ['DELIVERED', 'RETURN_REQUESTED', 'Customer requests a return within the policy window', 'None'],
  ['DELIVERED', 'COMPLETED', 'Return window elapsed and no further money is expected — payment_state is PAID, COD_SETTLED, PART_REFUNDED, REFUNDED, COD_CANCELLED or WRITTEN_OFF', 'None'],
  ['RETURN_REQUESTED', 'RETURNED', 'Returned goods received and inspected (FR-ORD-009)', 'Stock restored; refund raised in the payment model (FR-PAY-006)'],
  ['RETURNED', 'COMPLETED', 'Goods returned and no further money is expected — any refund due has completed, or none was due because the order was never paid for', 'Credit note issued and submitted where an invoice was issued (FR-ORD-021)'],
  ['RETURN_REQUESTED', 'COMPLETED', 'Return request withdrawn or lapsed', 'None'],
], [2100, 2100, 3126, 1700]));
body.push(NOTE('Outcomes are recorded per consignment, not per order (FR-ORD-027). Where an order was split under FR-ORD-005 its fulfilment state reflects the aggregate: it reaches DELIVERED when every consignment has been delivered, and DELIVERY_FAILED or LOST_IN_TRANSIT when one has not and no further lines are outstanding.'));
body.push(SP(160));
body.push(P('A.3 Payment states', { bold: true, after: 80 }));
body.push(TBL(['State', 'Meaning', 'Applies to'], [
  ['UNPAID', 'No money has moved and none is yet due', 'All methods at placement'],
  ['AUTHORISED', 'Provider holds an authorisation that has not been captured', 'Prepaid methods, where the provider separates authorisation from capture'],
  ['PAID', 'Funds captured and settled to the business in full', 'Prepaid methods'],
  ['COD_DUE', 'Goods are to be paid for on delivery; cash is owed to the business but not yet collected', 'COD'],
  ['COD_SETTLED', 'Cash collected by the courier and remitted, and the remittance allocated to this order (FR-PAY-016)', 'COD'],
  ['COD_CANCELLED', 'The order was cancelled before any cash was collected. Terminal; no money ever moved', 'COD'],
  ['PART_REFUNDED', 'Part of the amount paid has been returned to the customer (FR-PAY-006)', 'All methods'],
  ['REFUNDED', 'The whole amount paid has been returned to the customer. Terminal', 'All methods'],
  ['WRITTEN_OFF', 'Cash owed on a COD order has been judged uncollectable and written off, with an Owner attribution', 'COD'],
], [2200, 4626, 2200]));
body.push(SP(160));
body.push(P('A.4 Permitted payment transitions', { bold: true, after: 80 }));
body.push(TBL(['From', 'To', 'Trigger', 'Side effect'], [
  ['UNPAID', 'AUTHORISED', 'Provider authorises without capture', 'Authorisation reference recorded (FR-PAY-004)'],
  ['UNPAID', 'PAID', 'Provider notification confirms capture (FR-PAY-005)', 'Invoice becomes issuable on dispatch (FR-ORD-024)'],
  ['AUTHORISED', 'PAID', 'Capture confirmed', 'As above'],
  ['AUTHORISED', 'UNPAID', 'Authorisation expired or voided before capture', 'Order returns to PAYMENT_FAILED or CANCELLED in the fulfilment model'],
  ['UNPAID', 'COD_DUE', 'COD order accepted (FR-PAY-001)', 'Order appears on the COD outstanding list'],
  ['COD_DUE', 'COD_SETTLED', 'Remittance received and allocated to this order (FR-PAY-016)', 'Order becomes eligible for COMPLETED'],
  ['COD_DUE', 'COD_CANCELLED', 'Order cancelled before delivery', 'Order removed from the COD outstanding list; no credit note, because no invoice was issued'],
  ['COD_DUE', 'WRITTEN_OFF', 'Cash judged uncollectable, recorded by an Owner with a reason', 'Credit note issued against the invoice where one was issued (FR-ORD-021)'],
  ['PAID', 'PART_REFUNDED', 'Partial refund executed (FR-PAY-006)', 'Credit note for the refunded amount (FR-ORD-021)'],
  ['PAID', 'REFUNDED', 'Full refund executed (FR-PAY-006)', 'Credit note for the full amount (FR-ORD-021)'],
  ['PART_REFUNDED', 'PART_REFUNDED', 'A further partial refund, while the cumulative total remains below the amount paid', 'Further credit note; cumulative refunds may never exceed the amount paid'],
  ['PART_REFUNDED', 'REFUNDED', 'Cumulative refunds reach the amount paid', 'Final credit note'],
  ['COD_SETTLED', 'PART_REFUNDED', 'Cash returned to the customer in part, recorded under FR-PAY-014', 'Credit note; refund method and receiving party recorded'],
  ['COD_SETTLED', 'REFUNDED', 'Cash returned to the customer in full, recorded under FR-PAY-014', 'Credit note; refund method and receiving party recorded'],
], [2100, 2100, 3126, 1700]));
body.push(SP(160));

body.push(H1('Appendix B — Requirements traceability'));
const arabicRows = [
  ['التعريف بـ DardChat والألعاب والمنتجات', '4.1, 4.16'],
  ['عرض الألعاب بطريقة تفاعلية وجذابة', '4.1 (FR-CAT-007, 008), 4.2'],
  ['إتاحة الشراء مباشرة من الموقع', '4.3, 4.4, 4.5'],
  ['حفظ بيانات العملاء وتنظيمها', '4.7, 4.10, 5'],
  ['متابعة العملاء وسلوكهم وعمليات الشراء', '4.10, 4.12'],
  ['إرسال الإشعارات والعروض والإعلانات', '4.11'],
  ['مساعد بالذكاء الاصطناعي', '4.14'],
  ['تطوير لعبة أو تجربة رقمية شخصية', '4.15'],
];
body.push(new Table({
  columnWidths: [5026, 4000],
  width: { size: 9026, type: WidthType.DXA },
  rows: [
    new TableRow({ tableHeader: true, children: [
      cell('Client requirement (as stated)', 5026, { bold: true, fill: HEADFILL, size: 18, color: MUTED }),
      cell('Satisfied by section', 4000, { bold: true, fill: HEADFILL, size: 18, color: MUTED }),
    ]}),
    ...arabicRows.map(([ar, sec]) => new TableRow({ children: [
      cell(ar, 5026, { rtl: true, font: 'Arial', align: AlignmentType.RIGHT }),
      cell(sec, 4000, {}),
    ]})),
    ...[
      ['Product management, cart, checkout, inventory, orders, customers', '4.1, 4.3, 4.6, 4.8, 4.10'],
      ['Centralised database: sales, purchasing, inventory, analytics, reports, admin', '4.8, 4.9, 4.12, 4.13, 5'],
      ['Future scalability', '2.7, 6.7'],
    ].map(([a, b]) => new TableRow({ children: [cell(a, 5026, {}), cell(b, 4000, {})] })),
  ],
}));

body.push(H1('Appendix C — Open issues register'));
body.push(P('Blocking — the specification cannot be completed without these.', { bold: true, after: 100 }));
body.push(TBL(['#', 'Issue', 'Section affected', 'Owner'], [
  [{ t: 'OI-01', font: 'Consolas', size: 17 }, { t: 'Providers named, but no merchant account exists and no integration documentation is available. Onboarding not started, and it is the longest lead item in the project', color: ACCENT, bold: true }, '4.4, 3.3', 'Client'],
  [{ t: 'OI-02', font: 'Consolas', size: 17 }, { t: 'Journey concept document not supplied; narrative, trait model and result taxonomy unspecifiable', color: ACCENT, bold: true }, '4.15', 'Client'],
  [{ t: 'OI-17', font: 'Consolas', size: 17 }, { t: 'E-invoicing certification route, submission format and test environment not established. Gates FR-ORD-019 to 021 and 024 to 026, which sit below the Floor in 1.6 and cannot be descoped. Second-longest lead item; raised from Administrative at v0.8, where it should never have been filed', color: ACCENT, bold: true }, '4.6, 3.3, 5.2', 'Client + accountant'],
  [{ t: 'OI-23', font: 'Consolas', size: 17 }, { t: 'The ESP courier file format. Nobody holds a sample or a template, so FR-ORD-008 is currently verified against an artifact that does not exist. FR-ORD-008 is written to a configurable column set so the absence does not block the build, but it does block acceptance', color: ACCENT, bold: true }, '4.6, 3.3', 'Client'],
  [{ t: 'OI-25', font: 'Consolas', size: 17 }, { t: 'Which data protection regime applies. NFR-PRV-001 to 005 are Must and are specified against a regime nobody has named; breach notification, lawful basis, cross-border transfer and the statutory response window all follow from the answer', color: ACCENT, bold: true }, '6.4, 5.3', 'Client'],
], [1000, 5026, 1800, 1200]));
body.push(SP(200));
body.push(P('Change orders — scope agreed in principle, price not yet agreed.', { bold: true, after: 100 }));
body.push(TBL(['#', 'Issue', 'Held at', 'Owner'], [
  [{ t: 'OI-24', font: 'Consolas', size: 17 }, 'The medium of the Journey reduced-fidelity path — pre-rendered stills, video, 2D or text. Roughly a fifty-fold cost range, and unresolvable before OI-02. FR-JRN-015 states the obligations that hold whichever is chosen; FR-JRN-027 holds the medium open. Priced as nothing until agreed, and it is not a small number', 'FR-JRN-027', 'Supplier + client'],
], [1000, 5026, 1800, 1200]));
body.push(SP(200));
body.push(P('Material — a change to the assumed answer changes design or effort.', { bold: true, after: 100 }));
body.push(TBL(['#', 'Issue', 'Assumption held', 'Section'], [
  [{ t: 'OI-03', font: 'Consolas', size: 17 }, 'CLOSED — stock allocated to the website, not shared', 'AS-05 resolved', '4.8'],
  [{ t: 'OI-04', font: 'Consolas', size: 17 }, 'CLOSED — electronic invoicing IS required. Certification route and format still to be established with the accountant', 'AS-11 resolved; scope increased', '4.6, 3.3'],
  [{ t: 'OI-05', font: 'Consolas', size: 17 }, 'CLOSED — courier is ESP: no API, and no customer-facing tracking numbers', 'AS-10 resolved', '4.6, 3.3'],
  [{ t: 'OI-06', font: 'Consolas', size: 17 }, 'CLOSED — shops are third parties supplied outside the system', 'AS-03 resolved', '2.6, 4.9'],
  [{ t: 'OI-07', font: 'Consolas', size: 17 }, 'OPEN — must be asked again. The client answered that electronic invoicing IS required but that VAT registration status is not known, and those two normally travel together: a business obliged to clear invoices with the tax authority is generally registered. One of the two answers is probably wrong, and which one changes 4.13 and 4.6', 'AS-06, AS-07', '4.13'],
  [{ t: 'OI-08', font: 'Consolas', size: 17 }, 'Journey branching: score-only or divergent paths', 'AS-15 score only', '4.15'],
  [{ t: 'OI-09', font: 'Consolas', size: 17 }, 'CLOSED — 1 to 10 products at launch, under 25 within two years', 'AS-04 resolved', '4.2, 6.7'],
  [{ t: 'OI-10', font: 'Consolas', size: 17 }, 'CLOSED — no verified account. Meta verification is a project task with external lead time', 'AS-12 resolved', '4.11'],
  [{ t: 'OI-15', font: 'Consolas', size: 17 }, 'Is the Journey result gated behind contact capture, or openly shareable?', 'AS-20 result open, sharing gated', '4.15'],
  [{ t: 'OI-16', font: 'Consolas', size: 17 }, 'Expected peak concurrency. Sized at 50 normal / 300 peak from audience evidence at v0.7, not from measurement. Revisit against real traffic after the first Ramadan season', 'AS-22 estimated, not measured', '6.7'],
], [1000, 4226, 2400, 1400]));
body.push(SP(200));
body.push(P('Administrative.', { bold: true, after: 100 }));
body.push(TBL(['#', 'Issue'], [
  [{ t: 'OI-11', font: 'Consolas', size: 17 }, 'CLOSED — Raneem Nasser Al-Din approves and signs off'],
  [{ t: 'OI-12', font: 'Consolas', size: 17 }, 'Launch date constraint unknown'],
  [{ t: 'OI-13', font: 'Consolas', size: 17 }, 'OPEN — historical orders and receipts exist on paper. Whether any are entered at launch, and by whom, is undecided (AS-01)'],
  [{ t: 'OI-14', font: 'Consolas', size: 17 }, 'CLOSED — social media only; no email platform to retain (AS-13)'],
  [{ t: 'OI-18', font: 'Consolas', size: 17 }, 'CLOSED — the model is Google Gemini 2.5 Flash. Every requirement in section 4.14 stands unchanged'],
  [{ t: 'OI-19', font: 'Consolas', size: 17 }, 'CLIENT DECISION — should customers be able to leave reviews, with photographs, and who moderates them? Never specified; no requirement exists either way'],
  [{ t: 'OI-20', font: 'Consolas', size: 17 }, 'CLIENT DECISION — is gift buying a significant use case? If yes, gift wrapping and messaging return from 2.7 as requirements'],
  [{ t: 'OI-21', font: 'Consolas', size: 17 }, 'CLIENT DECISION — does the Journey exist to sell games, or is it purely a brand experience? Decides FR-JRN-008 and the commercial half of FR-RPT-007'],
  [{ t: 'OI-22', font: 'Consolas', size: 17 }, 'OPEN — which titles actually sell? Social engagement favours two titles heavily, but the top performers are video posts and engagement is not sales. Merchandising defaults should follow real order data, not likes'],
], [1000, 8026]));

body.push(H1('Appendix D — Revision history'));
body.push(TBL(['Version', 'Date', 'Author', 'Change'], [
  ['0.1', '2026-08-25', '', 'Initial draft. Not baselined.'],
  ['0.2', '2026-08-25', '', 'Layout corrected: blank page removed, orphaned tables bound to their headings, appendix heading levels fixed, order state model redrawn as tables. Added FR-ADR-010, FR-ORD-013 to FR-ORD-015, FR-PAY-010 and AS-15. Corrected the FR-JRN-004 assumption reference and the FR-RPT-009 currency basis.'],
  ['0.9', '2026-09-03', '', 'Four corrections to v0.8, found on review. Invoice issuance moved to the first dispatch of any line, so a prepaid order shipped in two consignments is no longer left uninvoiced (FR-ORD-024, Appendix A.2). Order completion re-expressed as no further money being expected, so a partially refunded order and a returned order that was never paid for can both reach COMPLETED (Appendix A.2). The reservation sweep scoped to PENDING, so it no longer cancels cash-on-delivery orders, which are unpaid by design (FR-INV-012). Journey payload budget corrected from 1.5 MB to 1 MB, with its derivation from FR-JRN-024 stated in the requirement (NFR-PERF-007). No new scope. Still not baselined.'],
  ['0.8', '2026-09-02', '', 'Defect remediation against a seven-lens review panel and a solo senior review. Payment state split from fulfilment state (Appendix A.3, A.4, FR-PAY-013), which makes refunds — including partial and cash refunds on COD — expressible for the first time. Invoice and CreditNote added as entities with a gapless number series, an issuance trigger per payment method and a register (FR-ORD-024 to 026). Backorder settled as a picking-time shortfall only, with a real quantity behind it (FR-ORD-022, FR-INV-014). Immutability bounded to named append-only ledgers (FR-DAT-006, 008). Reservation expiry and payment-retry re-reservation added (FR-INV-012, 013). VAT arithmetic corrected to non-additive (FR-CRT-009, 012). Courier return path added with a lost-in-transit outcome (FR-ORD-027, 028). Assistant given a fixed service identity and the untrusted-input rule widened to the corpus (FR-AI-020, 021, 016). Journey targets derived from a time-to-interactive budget, fallback obligations separated from fallback medium, telemetry split at consent (FR-JRN-024 to 027). Verified request and service window defined (FR-DAT-009, 010). FR-CUR-004 withdrawn; FR-ADR-009 raised to Must at two origins. Descope ladder corrected. OI-17 raised to blocking; OI-23 to OI-25 opened. Still not baselined.'],
  ['0.7', '2026-09-02', '', 'Right-sized against the real product range and audience. Concurrency cut from 500/5,000 to 50/300 with graceful degradation to 1,000 and a CDN requirement for Journey assets (NFR-SCL-004). Catalogue attributes corrected to group and occasion; no variant axis at launch; seasonal availability window and box contents added (FR-CAT-014, 015). Expansions withdrawn, bundles kept as future-ready. Stocktake, gift wrapping and the Journey commercial tie-in deferred to 2.7 with client decisions raised at OI-19 to OI-22. Landed cost simplified. Still not baselined.'],
  ['0.6', '2026-09-02', '', 'Assistant model fixed as Google Gemini 2.5 Flash in the 3.3 interfaces table; OI-18 closed. No other change — every requirement in section 4.14 is unchanged.'],
  ['0.5', '2026-09-02', '', 'Client answers applied. AS-05 resolved — stock is allocated to the website, so 4.8 is unblocked and FR-INV-007 withdrawn. AS-11 resolved the other way — electronic invoicing IS required, adding FR-ORD-019 to 021 and an interface. AS-03, 04, 09, 10, 12, 13 closed; AS-23 withdrawn (no barcode or QR). Back office reduced to two roles. USD removed entirely. Backorder introduced (FR-ORD-022, 023) so orders are delayed rather than cancelled. Frequency cap now one message per fourteen days; retention now 60 months. Approver named. Market wording made neutral and the timezone set to Asia/Jerusalem. Workshops recorded as a future need. Still not baselined.'],
  ['0.4', '2026-08-27', '', 'Second review response. Timezone pinned to Asia/Jerusalem (CON-10) and the agora defined. PCI DSS SAQ-A named explicitly (NFR-SEC-011). Arabic search mechanism and its external dependency surfaced (4.2 note, 3.3). Assistant escalation confirmed transactional (FR-AI-009). Journey scoring bound to one server-side implementation (FR-JRN-023). Seven untracked assumptions promoted to AS-16 through AS-23 and the marker rule stated in 1.5 and enforced at build. Local pointer added for the retired NFR-MNT-005 and 006. Still not baselined.'],
  ['0.3', '2026-08-26', '', 'Review response. Acceptance criterion added to every requirement. Section 7 extended to full coverage. Section 1.6 descope order added. Section 4.8 marked blocking on AS-05. Five compound requirements split. Added admin MFA and staff account lifecycle (FR-ACC-013 to 016), assistant grounding, injection and PII requirements (FR-AI-015 to 019), business event history (NFR-MNT-007), reference device (NFR-PERF-009), data residency (NFR-PRV-007) and identity binding (FR-JRN-022). Availability exclusion capped. Two contractual clauses moved to the statement of work. Still not baselined.'],
], [1200, 1600, 1600, 4626]));
body.push(PR([{ text: 'Document status: not baselined. ', bold: true, color: ACCENT }, { text: 'Sections 4.4, 4.15 and 6.4 remain blocked, and five open issues in Appendix C are blocking — payment onboarding, the Journey concept, the e-invoicing certification route, the courier file format and the data protection regime. Two of those, OI-01 and OI-17, are long-lead items that should start before anything in this document is built. Thirteen assumptions in section 2.6 are still unconfirmed.' }],
  { shading: { type: ShadingType.CLEAR, fill: WARNFILL } }));

// ---------- assemble ----------
const doc = new Document({
  creator: 'DardChat Project',
  title: 'SRS — DardChat Commerce Platform',
  description: 'Software Requirements Specification, ISO/IEC/IEEE 29148:2018',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 21, color: INK } },
      heading1: { run: { font: 'Calibri Light', size: 34, bold: true, color: INK }, paragraph: { spacing: { before: 400, after: 200 } } },
      heading2: { run: { font: 'Calibri Light', size: 27, bold: true, color: ACCENT }, paragraph: { spacing: { before: 320, after: 160 } } },
      heading3: { run: { font: 'Calibri', size: 23, bold: true, color: INK }, paragraph: { spacing: { before: 240, after: 120 } } },
    },
  },
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 240 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    footers: {
      default: new d.Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'SRS-DARDCHAT-001  v0.7  —  ', size: 16, color: MUTED }),
            new TextRun({ children: [d.PageNumber.CURRENT], size: 16, color: MUTED }),
          ],
        })],
      }),
    },
    children: body,
  }],
});

if (BARE_ASSUMPTIONS.length) {
  console.error('BUILD FAILED — assumption markers with no AS-## register entry:', BARE_ASSUMPTIONS.join(', '));
  process.exit(1);
}
console.log('assumption markers: all cite a register entry');

if (MISSING_AC.length) {
  console.error('BUILD FAILED — requirements with no acceptance criterion:', MISSING_AC.join(', '));
  process.exit(1);
}
console.log('acceptance criteria: every requirement covered');

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(process.argv[2], buf);
  console.log('written:', process.argv[2], buf.length, 'bytes');
});
