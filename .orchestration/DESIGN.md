# Dardachat — Brand & Design Spec (approved by Obaida 2026-09-29)

Source: client assets in `ROOT/assests/` (palette image, Childos Arabic DEMO font, Canva brand profile screenshot).
Every team building UI, content, seed data, messages, PDFs or the Journey follows this file. It overrides earlier visual
choices made in Phase 0 (crimson/plum/saffron palette, Reem Kufi display font).

## 1. Name
- Latin: **Dardachat** (exactly this spelling; not DardaChat / DardChat / Dard Chat) — page titles, SEO, emails, PDFs, English copy.
- Arabic: **دردشات** (not «دردشة»).
- Social: Instagram **@dard_chat**. Email **dardchat.2023@gmail.com**. Phone/WhatsApp **0543992424** (E.164 `+972543992424`).
  Address: **القدس – بيت حنينا** / Beit Hanina, Jerusalem.

## 2. Palette (client-supplied — the only brand colours)
| Token role | Hex | Use |
|---|---|---|
| cream (page background) | `#eeeae1` | body background, paper |
| blue (primary brand) | `#1a4999` | header, links, primary buttons, headings, focus ring |
| red (accent) | `#e32328` | add-to-cart / key CTA buttons (white text), badges, highlights, product-name accents, decoration |
| pink (soft) | `#ecc8ca` | cards, section bands, chat bubbles, tags |
| light blue (soft) | `#bbd3eb` | alternate panels, info states, secondary surfaces |
Derived (allowed): white/near-white surfaces (`#fbf9f5`), a dark navy text colour for long body copy (e.g. `#13284f`,
must keep ≥ 7:1 on cream), hover/pressed shades of blue and red, and neutral semantic colours for success/warning/error
that do not clash (keep them muted). The brush-stroke pink seen in the logo banner (~`#eeb3e7`) may be used ONLY as
decoration (brush shapes), never as a text or UI colour.

**Contrast rule (WCAG AA, NFR-USA-001):** blue on cream = 7.1 ✓. White on red = 4.6 ✓. White on blue = 8.6 ✓.
**Red text on cream (3.9), pink (3.0) or light blue (3.0) FAILS for normal text** → red is allowed as text only at
≥ 24px regular / ≥ 18.66px bold, or on buttons with white text, or as non-text decoration. Never small red body text.

## 3. Typography
- **Display/headings:** the client's font is *Childos Arabic* (Namela Studio). We only hold the **DEMO**, whose digits are
  replaced by a "DEMO" stamp and which is not licensed for commercial use → **do not ship it**. Use **Baloo Bhaijaan 2**
  (Google Fonts, OFL, rounded and playful, Arabic + Latin) as the display font now. Keep the font behind one CSS variable
  (`--font-display`) so Childos can be swapped in when licensed (BACKLOG). Headings, hero lines, section titles only.
- **Body/UI:** IBM Plex Sans Arabic + IBM Plex Sans (already in the build). All prices, quantities, order numbers and
  tables use the body font — never the display font.

## 4. Visual language
Playful, warm, human — "a table of friends talking", not corporate SaaS. Motifs from the brand profile:
- the logo mark: a **finger-heart hand** above the wordmark «دردشات», "Dardachat" in thin Latin underneath;
- loose **brush strokes / blobs** in pink on blue (and blue on cream) as section decoration;
- soft rounded cards, generous spacing, flat friendly illustrations, small sparkles;
- product photography: bright cyan and magenta boxes and cards held in hands — let product images carry colour, keep UI calm.
- Quotes used as section banners (cream panel + illustration): «مفتاح المعرفة هو السؤال» ·
  «قبل ما نتعمق بمعرفة الأشخاص من حولنا مهم نتعمق في معرفة ذاتنا» ·
  «دردشات تأخذنا خطوة إلى الوراء في الزمن لنرجع ذكرياتنا الدافئة من جديد».

## 5. Logo & images (what we have vs need)
- We only have the logo as a ~300px crop inside a screenshot (`ROOT/assests/screencapture-canva-…png`, banner region
  x 595–1315, y 104–320). PLATFORM extracts a **placeholder** raster from it into `web/public/brand/` and builds a simple
  text+mark fallback; mark every use `PLACEHOLDER — awaiting client SVG` in BACKLOG. Real SVG/PNG files are requested.
- Product/event photos in the screenshot are ~100px thumbnails → **not usable**. Keep generated placeholder product art
  (SVG) in the brand palette until the client sends full-size photos. BACKLOG entry.

## 6. Real catalogue (replaces the 5 placeholder titles) — prices not supplied: use clearly marked dummy prices
1. **صندوق دردشات** (Dardachat Box) — family & friends gatherings, age **12+**. Cards full of questions and challenges for
   deep conversation sessions. Contents: two sets of deep social & psychological question cards (**50 cards**); one set of
   fun, creative challenge cards (**25 cards**); the props needed for the challenges (**10 pieces**).
2. **صندوق مين فينا** (Who Among Us Box) — a fun social box that brings people closer and reveals how they see each other,
   spontaneously and humorously; family & friends, **12+**. Contents: **45 cards** in **3 stages** (getting to know,
   understanding, fun discovery); an instructions booklet; **5 voting signs**.
3. **صندوق رمضان للعائلة** (Ramadan Family Box) — **seasonal (Ramadan)**; gathers the family during Ramadan around warm
   moments, memories and knowledge; **all ages**, a spiritual, fun atmosphere after iftar. Contents: **15** religious
   question & information cards; **15** religious riddle cards; **15** social question cards about Ramadan memories and customs.
4. **صندوق دردشات مع الحب** (Dardachat with Love Box) — for couples/partners **18+**, strengthening the relationship and
   renewing feelings. Contents: **3** question sets (**63 questions**) on knowing your partner, needs & gifts, feelings &
   situations; **16** romantic duo challenges; the special «سرّ الحب الأبدي» (Eternal Love Secret) card; **2** secret-message
   cards; **20** crystal hearts; a die, an interactive board, and an instructions booklet.
The SRS expects five launch titles; only four are known → seed four, note the fifth as unknown in BACKLOG.

## 7. Services (information + WhatsApp booking only — no online booking or payment; SRS §2.7 keeps sale out of scope)
- **الجلسات — Sessions:** dialogue sessions using Dardachat question cards, groups of up to 10. **70 ILS/person, 500 ILS
  per full group, 1 hour.**
- **ليالي الألعاب — Game nights:** for friends & family groups, teams play Dardachat games with points for challenges and
  group questions. **70 ILS/person, 1400 ILS per group, 1–1.5 hours.**
- **ورشات العمل — Workshops:** groups of 20–25, play + an art activity producing a keepsake. Price depends on participants
  and number of workshops (flexible):
  - ورشة هدية لذاتي (A Gift to Myself) — positive thinking + annual goals board. 100 ILS/person; 1300–1500 per group; 2 h.
  - ورشة شكل وحس (Shape & Feel) — understanding negative feelings + clay shaping. 120 ILS/person; 1400–1700 per group; 2 h.
  - ورشة سؤال وغرزة (A Question and a Stitch) — deep questions + Palestinian embroidery. 130 ILS/person; 1250–1700 per group; 2.5 h.
  - ورشة متشابه بمشاعرنا (Alike in Our Feelings) — mothers & children aged 10–16, painting on tote bags, colour psychology. 100 ILS/person; 1800–2000 per group; 2 h.
  - ورشة الورود مع الحب (Roses with Love) — couples 18+, flower arranging, 8–10 people only. 180 ILS/person; 1500–1800 per group; 2 h.
  - ورشة سؤال بالحب وغرزة من القلب (A Question of Love, a Stitch from the Heart) — couples 18+, embroidery on a photo. 150 ILS/person; 1500–1700 per group; 3 h.
  - سلسلة ورشات الخيال (Imagination series, children) and سلسلة بيني وبين نفسي (Between Me and Myself series, women) — priced per series (3+ meetings), by duration and participants.
- **About (من نحن):** «نحن في "دردشات" نؤمن بأن التواصل هو جوهر العلاقات الإنسانية. من قلب القدس، أطلقنا مشروعًا مبتكرًا
  يعزز الروابط بين الأفراد من خلال ألعاب لوحية وبطاقات وخدمات اجتماعية تلهم الحوار والتفاعل. تقدم دردشات بيئة ممتعة
  وملهمة من خلال ورشات العمل، الجلسات الجماعية، وليالي الألعاب التي تجمع الناس بروح التواصل الإيجابي.»
  Brand pillars shown on the about page: مجتمع دردشات · ليالي الألعاب · الجلسات · الورشات · صناديق الألعاب.
Service pages end with a **"احجز عبر واتساب / Book on WhatsApp"** button → `https://wa.me/972543992424?text=<prefilled, url-encoded, names the service>`.

## 8. Where each team applies this
- **platform (brand lane, on main → tag `brand-v1`):** tokens, fonts, name strings in common messages, header/footer
  (logo, contact, Instagram, nav entries for Games · Workshops · Sessions · Game nights · Journey · About · Contact),
  logo placeholder assets, favicon.
- **catalog:** seed the 4 real products (§6) replacing placeholders; seed CMS static pages About, Contact, Sessions,
  Game nights, Workshops (§7) in Arabic + English; rename brand strings in seed/SEO.
- **storefront:** build pages to §2–§4; home hero uses the logo banner style (blue + pink brush strokes) and links to the
  services; product cards/pages show group + age + "what's in the box".
- **engagement / payments:** message templates, emails, invoices and packing slips use «دردشات»/Dardachat, the logo, and the
  contact block.
- **assistant:** escalation WhatsApp number `+972543992424`; corpus includes the service and about pages.
- **journey:** scenes in the brand palette (cream, blue, pink, light blue, red accents), brush-stroke and finger-heart
  motifs, warm gathering-around-a-table mood; share card uses the logo and palette.
