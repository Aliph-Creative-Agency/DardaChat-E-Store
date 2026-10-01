# Dardachat prototypes: shared conventions

These are clickable, animated HTML prototypes for brainstorming the storefront. They are not production code.
Brief: `.orchestration/teams/design/BRIEF.md`. Brand: `.orchestration/DESIGN.md`. Design system (DS): the tokens, bundle and brand book listed in the brief.
Do not edit anything under `web/`, and do not create branches or commits.

## File layout

```
design/prototypes/
  ds.css              GENERATED: tokens (Cream on :root, Night on [data-theme="dark"]) + DS bundle.css verbatim + prototype base
  _shared.js          lang / theme / motion helpers + small signature-motion helpers (window.DC)
  index.html          gallery with one link and a one-line description per screen (the supervisor writes it last)
  <screen>.html       one self-contained file per screen: home, shop, product, cart-checkout, services, journey, assistant
  assets/             dardachat-banner.png (blue band + brush strokes), dardachat-lockup-on-blue.png (mark on blue),
                      dardachat-lockup-knockout.png (transparent, 2x; use ONLY on --band / dark grounds, the wordmark is white),
                      client-palette.jpg (reference)
  _build/             build_ds.py (regenerates ds.css), crop_logos.py, shot.cjs (screenshots), verify.html (DS smoke test)
  HANDOVER-<screen>.md  only if a designer runs out of room
  NOTES.md            this file; each designer appends a short "## <screen>" section (decisions + what is placeholder)
```

Do not hand-edit `ds.css`. If a token is missing, add it to the `<style>` block of your own screen and mention it in your NOTES section.
Rebuild with `python _build/build_ds.py`. The DS source path inside that script points to the session scratchpad.

## Page skeleton (every screen)

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title data-ar="المتجر · دردشات" data-en="Shop · Dardachat">المتجر · دردشات</title>
  <link rel="stylesheet" href="ds.css">
  <script src="_shared.js" defer></script>
  <!-- optional: <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script> -->
  <style>/* screen-only styles; tokens only */</style>
</head>
<body>
  <a class="dc-skip" href="#main" data-ar="تخطَّ إلى المحتوى" data-en="Skip to content">تخطَّ إلى المحتوى</a>
  <header>…</header>
  <main id="main" class="dc-page">…</main>
  <script>document.addEventListener('dc:ready', () => { /* screen code */ });</script>
</body>
</html>
```

- Paths are relative (`ds.css`, `assets/…`) so the pages open straight from disk and from any static server.
- Allowed network: Google Fonts (already imported by ds.css) and cdnjs only. GSAP 3.12.5 (+ `ScrollTrigger.min.js` from the same folder)
  for orchestrated motion on any screen. three.js (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`) is for `journey` only.
  Every page must still work, and read correctly, if a CDN script fails to load.
- Link between screens with plain relative links (`shop.html`, `product.html#gallery`). `_shared.js` appends `?lang=&theme=&motion=`
  to them automatically, so the chosen language and theme carry across screens.

## Class naming

- The DS classes are `dc-<component>` with BEM parts (`dc-product__lid`, `dc-btn--cta`) and `is-<state>` states. Use them as they are.
- Screen-only classes: `dc-<screen>-<part>`, e.g. `dc-home-deck`, `dc-shop-filters`, `dc-co-summary` (co = cart-checkout).
  This keeps screens from colliding if a later pass merges them.
- Page helpers in ds.css: `.dc-page` (1200px column with 16/24px gutters), `.dc-sr` (visually hidden), `.dc-skip` (skip link),
  `.dc-ph` (placeholder tag, see below), `.dc-num` (Latin digits, isolated LTR, tabular) for every price, phone, count and order reference.
- Type tokens are shorthand-ready: `font: var(--type-display-2);`, `font: var(--type-price);`, and so on for every style in tokens.json.
- RTL first: logical properties only (`margin-inline-start`, `inset-inline-end`, `padding-block`). No `left`/`right` in CSS and no
  `translateX` sign that assumes a direction. When JS needs a direction, use `DC.lang === 'ar' ? -1 : 1`.

## Bilingual text (ar default, en toggle)

- Put Arabic in the markup and both languages in attributes: `<h2 data-ar="ورشات العمل" data-en="Workshops">ورشات العمل</h2>`.
  `_shared.js` swaps `textContent`, flips `<html dir/lang>`, and swaps `data-ar-label` / `data-en-label` (aria-label),
  `-placeholder`, `-title`, `-alt`, and `-html` (innerHTML, authored markup only).
- Because `data-ar`/`data-en` replaces `textContent`, put them on leaf elements, not on a parent that holds icons or other elements.
- A block that differs structurally per language: `data-only="ar"` / `data-only="en"`.
- Text you build in JS: `DC.t('أضف إلى السلة', 'Add to cart')`, then re-render on `document.addEventListener('dc:lang', …)`.
  For injected markup that carries data-ar/data-en, call `DC.applyLang(container)`.
- English copy is a faithful translation of the Arabic. Latin brand name: exactly **Dardachat**. No lorem ipsum anywhere.

## Theme and the prototype toolbar

- `_shared.js` injects a small floating toolbar (bottom inline-start): English/العربية · Night/Cream · Less motion.
  Hide it with `<html data-no-protobar>` (for example, inside an iframe).
- Night = `html[data-theme="dark"]`. Use tokens and nothing else, and both themes work. `DC.toggleTheme()` fires `dc:theme`.
  Canvas/WebGL code (journey) must read colours with `getComputedStyle(document.documentElement).getPropertyValue('--blue')` and repaint on `dc:theme`.
- `--band` / `--on-band` (prototype-only) = the fixed brand blue #1a4999 with white. Use it for the logo band and hero bands so they stay
  brand blue in Night (in Night, `--blue` turns light because it acts as text and controls there). Everything else uses `--blue`.

## Motion rules (from the brand book)

Motion should feel tactile, like handling cards. There are three signature moments, each used where it means something:
1. **Deal & flip**: question cards deal in (staggered, `--ease-spring`, `--dur-slow`) and flip to reveal (`--dur-flip`).
   Markup is the DS `button.dc-qcard` with `.dc-qcard__inner`. `_shared.js` flips any `button.dc-qcard` on click and keeps `aria-pressed`
   in sync. Add `data-noflip` if your screen drives the flip itself (`DC.flip(card, true|false)`). `.dc-deal` on a parent staggers the deal-in.
2. **Brush draw-on**: the pink strokes paint themselves in once (`--dur-draw`, `--ease-in-out`). Use `<svg class="dc-brush" data-autodraw>`,
   or call `DC.draw(svg)`, which measures every path and sets `--len` for you.
3. **Heart pop**: a small heart floats up from an add-to-cart button. Use `.dc-btn[data-pop]` with an `svg.dc-heart` child. It is automatic on click,
   or call `DC.heartPop(btn)`.
Everything else stays quiet: hover lifts (`--dur-base`, `--ease-out`), the cart-count bump (`DC.bump(countEl)`), messages sliding in.
Spring easing is only for things (cards, boxes, the cart count), never for text or panels. There is no parallax on text, no scroll-jacking,
and no looping ambient motion except the DS `dc-float` blobs.

**Reduced motion is required.** The OS setting and the toolbar's "Less motion" both cut CSS animations and transitions to their end state
(handled in ds.css). For JS/GSAP motion, check `DC.reducedMotion()` before animating and jump to the final state when it returns true.
Listen for `dc:motion` if the page keeps animating. Nothing essential may be visible only mid-animation. Content must be readable before JS runs,
so do not ship HTML that starts at `opacity:0` and depends on a script to show it.

## Shared content decisions (keep screens consistent)

- **Prices are placeholders.** The client has not supplied product prices. Use these dummy prices on every screen and tag them with `.dc-ph`
  («سعر تجريبي» / "Sample price"):
  صندوق دردشات ₪ 149.00 · صندوق مين فينا ₪ 119.00 · صندوق رمضان للعائلة ₪ 129.00 · صندوق دردشات مع الحب ₪ 169.00.
  Prices include VAT. The line reads «شامل ضريبة القيمة المضافة» / "Incl. VAT". Service prices are real (DESIGN.md §7).
- Currency is ILS, shown `₪ 149.00` in `.dc-num`.
- WhatsApp booking: `https://wa.me/972543992424?text=<url-encoded, names the service>`, opened in a new tab.
- Product and service names, contents, counts and ages come from DESIGN.md §6–§7. Brand lines come from the brand book's "Real lines" list.
- Imagery: there are no product photos yet. Use flat placeholder box art in the palette (pink/sky grounds, a red heart disc), marked `.dc-ph`.
  Never use 3D renders, stock gradients or emoji.
- Icons: simple 1.8px-stroke rounded inline SVG in `currentColor`, 20–24px (bag, chat, heart, search, user, globe). These are substitutes
  until the client supplies an icon set.
- Avoid generic AI looks: no purple gradients, no glassmorphism, and not every section as the same card grid.

## Quality floor (check before you return)

- 360, 768 and 1440px: no horizontal scroll (the shot tool reports `horizontalOverflowPx`), and nothing clipped.
- Arabic and English: the layout mirrors and the copy swaps everywhere, including aria-labels and placeholders.
- Cream and Night both read.
- Keyboard: every control can be reached and used, focus is visible (ds.css gives all elements a 3px `--focus` ring), and Esc closes drawers and dialogs.
- Reduced motion: run the shot tool with `--reduce`. The page must still show its end state.
- Console: no errors.

Screenshot tool (run from `web/` so Playwright resolves):
```
cd D:/Personal/Projects/DardaChat-E-store/web
node ../design/prototypes/_build/shot.cjs home.html --w=360 --full          # add --en --dark --reduce --wait=2500 as needed
```
Shots are written to `_build/shots/`, which is git-ignored scratch.

## Placeholders and DS patches (supervisor)

- All logo files are crops of the Canva brand-profile screenshot. They are low resolution with a flat ground. Replace them with the client's
  SVG or transparent PNG when supplied. The knockout is an automated background removal and has slight fringing on the letter edges.
- Two DS issues are patched in ds.css §3. Report both back to the design system:
  (a) `.dc-qcard__inner` is a `<span>`, so the card faces collapsed to 32px. The patch sets `display:block`.
  (b) `.dc-hero` used `--blue`, which turns light in Night and loses the white wordmark. The patch uses `--band`.
- `.dc-root` (the DS preview wrapper) has preview padding and a flex layout. Do not use it as a page wrapper; use `.dc-page`.

## shop

- Page: brand-blue sticky header (mobile drop-down nav), title with brush underline, one filter panel (audience / age / season chips, live count, clear), 2-up mobile and 4-up desktop grid of the four boxes, quote banner and a "play with us in person" services teaser, footer with contact.
- Motion: ProductCard hover/focus lid-tilt; add-to-cart sends a heart flying to the header cart, bumps the count and shows a "View cart" toast; heart favourite pops; the out-of-season Ramadan box is dashed and muted with a "Notify me" toggle instead of Add. Reduced motion jumps straight to the end state.
- Placeholder: box art and prices (tagged `.dc-ph`). The cart count is kept in sessionStorage (key `dc-proto-cart`, `{total, lines}`) so it survives a reload of the shop; `cart-checkout.html` does not read it yet, its own demo cart is independent.
- Revision 1: clear-filters button now truly hidden until a filter is on; prices align to the reading start in RTL; the out-of-season note is quiet ink with a blue clock (red stays on the season chip only); ages read `12+` / `18+` in both languages; on phones each filter group is one horizontally scrolling row with an end-edge fade (logical, mirrors in RTL), so the first row of cards (art and name) shows in the first 844px; the add button swaps to a tick and «أُضيف» / "Added" for 1.3s; the intro blob is replaced by a fanned stack of three question cards; the lid hinge mirrors in RTL; the sample-price tag text is one step darker (5.6:1).
- Checked with Playwright at 390 and 1280 in ar and en, light and dark (16 page states): no horizontal overflow, no console or network errors. Shots: `shots/shop-<width>-<lang>-<theme>-<state>.png` (top, hover, add, filter, empty, notify). `_build/shop_check.cjs` drives them and prints the metrics (run it from a folder that has `@playwright/test`, e.g. `web/`).

## journey (designer: journey)

- `journey.html`: intro (disclaimer, "sound is off" note, WebGL probe message), five-stop playable scene, result card with a save/share gate.
- Scene: procedural three.js r128 (table, six pawns in the palette, deck, challenge cards, rising hearts), loaded from cdnjs only after a WebGL2 probe passes.
  If the probe or the load fails, the same stops play on a flat SVG version (same copy, same result). `?webgl=off` forces it; the intro has a
  prototype-only button to flip between the two. Camera fits the free area above the choice panel at any viewport (view offset), and Night keeps the table lit.
- Signature motion: the top card of the deck lifts and turns face-up (stop 3), the last card rises with hearts (stop 5), the result card flips (DC.flip),
  the pink brush draws under the result title (DC.draw), trait bars fill. Reduced motion jumps every tween to its end state.
- Sound is off by default and never plays without the toggle (tiny WebAudio tones, no files). Keys 1/2/3 pick a choice.
- Save/share gate: the result is visible without any data; saving asks for email or phone plus explicit consent (validated, errors in both languages).
  Nothing is stored. Share uses navigator.share or copies `journey.html?result=<type>`.
- Preview helpers: `?stop=1..5` jumps into a stop, `?result=warm|curious|spark|listener|bridge|balanced` opens a result.
- PLACEHOLDER: the client owns the Journey concept. All five scenes, choices, the six result types, trait names and scoring weights are invented for the
  prototype and tagged `.dc-ph`. Scoring runs in the browser here; the real build must score on the server. Pawns are generic, not characters.

## assistant
`assistant.html` is the Dardachat with Love product page with the storefront assistant (`.dc-chat` extended as `.dc-asst-*`). Launcher pill bottom inline-end opens it as a floating panel from 560px and as a full-screen sheet below (page goes `inert`, Esc closes, focus returns to the launcher).
- **Disclosure first:** a sand card «أنا مساعد آلي، مش شخص» sits above the first bot line, and the header repeats it. WhatsApp handoff is always in the footer.
- **Motion:** brush stroke draws under the header on open; four question chips; messages slide in; three typing dots; the answer streams word by word, then a source line and an inline action card (product card with add-to-cart heart pop, or a red «احجز عبر واتساب» booking card) settle in. Reduced motion shows the finished answer at once.
- **Answers are scripted** from the real catalogue and service facts (DESIGN.md §6-§7): contents, friends/family, session, workshops, game nights, Ramadan, gift/couple. Anything it cannot match gets the honest "I do not want to guess" reply plus a «كمّل مع الفريق» WhatsApp card carrying the typed question. Nothing is generated; delivery time is deliberately not answered (unknown) and escalates.
- Review helpers: `?open=1` opens the panel, `?ask=<text>` also asks it. Placeholder: product art and price are marked `.dc-ph`.
- Fixed in QA: the panel grid had no explicit column so wide chips pushed the header, log and footer 15px past the panel edge at 390px (`grid-template-columns: minmax(0,1fr)`).
- Checked: 390 and 1280 in ar/en, Night, reduced motion, Esc, zero horizontal overflow, zero console errors. Shots in `shots/assistant-*.png`; scripts `_build/asst-shots.cjs`, `asst-dark.cjs`.
- Rev 1 fixes: the header brush stroke now reaches both panel edges. `vector-effect: non-scaling-stroke` was removed because it made the dash array count in screen px while `DC.draw` measures `--len` in viewBox units, so `animation: forwards` left a ~32px gap. In RTL the svg is mirrored (`scaleX(-1)`) so it draws from the inline-start side. The brush now sits inside the header (`inset-block-end: 2px`) so scrolled chat never slides under it. English answers use ₪ like the cards, the age chips read `18+` / `12+` in English, English copy uses contractions, and an in-page source link (`#contents`) closes the phone sheet first, then scrolls to and focuses the box contents. Verified by measuring the path bounds at 390 and 1280 in ar/en, Cream and Night (`_build/asst-rev2.cjs`, run from `web/`).

## cart-checkout

- One page, hash-routed: `#cart` opens the slide-in drawer (focus trap, Esc, scrim, Back closes it), `#checkout`/`#address`/`#delivery`/`#payment` are the 4 StepIndicator steps, `#done` is the confirmation. A shelf of the 4 boxes (add / qty / Ramadan box out of season) is the starting view so the cart has something to act on.
- Cart is seeded with 2 boxes so the flow is reviewable straight away. Promo code `SAMPLE10` (10%), 16% VAT and the three delivery zones (Jerusalem 20 / West Bank 30 / rest 40, COD only where marked) are placeholders. Prices are the shared sample prices.
- Address form has the 6 fields (name, phone LTR, city, area, street, note); inline errors, zone suggested from the city. Payment offers card, wallet, instant transfer and cash on delivery; card details are never collected here (provider page note).
- Motion: drawer slide + spring line items, step content slide by direction, heart pop on the place-order button, and on `#done` the brush strokes draw on around the box art, hearts rise once, question cards deal in and flip. All of it jumps to the end state under reduced motion.
- Order reference, delivery ETA and the sample question texts on the confirmation are placeholders. The drawer sits above the prototype toolbar (z-index 920/930).
- `_build/flow.cjs` walks the whole flow at 390 and 1280 in ar and en and writes `shots/cart-checkout-*.png` (run from `web/`).

## home

- **Order:** logo band hero (three pink brush strokes draw on, the headline's "box"/«صندوق» gets a small underline stroke after them) -> draw-a-card table -> four boxes (one flagship + three shelf rows, deliberately not the shop's grid) -> services on a full-bleed pink band as three ticket columns with dashed folds -> quote banner + About (§7 text, five pillars, `#about`) -> footer with contact (`#contact`).
- **Draw a card:** the deck deals in, the first card is drawn and flipped on its own (~1.1s), then "Draw another card" (button or the deck) flies a new card from the deck to the slot, flips it, and tosses the previous one into a small pile (max 3 kept). Uses WAAPI + the DS `.dc-qcard`; no GSAP needed. Reduced motion: page shows one drawn, flipped card and new draws appear flipped instantly. The markup already contains that card, so it reads without JS. A visually hidden live region announces each drawn card.
- **Header logo:** hidden while the big lockup is on screen, fades in once it scrolls away (focusable either way).
- **Cart:** add buttons on three boxes pop the heart, bump the count and show a toast (state is local to this page). The Ramadan box is the out-of-season variant (dashed, lid nudges, no add button).
- **Placeholders:** box art and prices (`.dc-ph`), the eight card texts (`.dc-ph` "Sample cards"; Levantine wording written by design, replace with real cards), the service art, the logo files. The service prices (₪70, ₪500, ₪1400, ₪100-180) are the real ones from DESIGN.md §7. WhatsApp links change text with the language.
- **Added to the DS tokens:** none. Screen-only: the translucent "table" panel (`rgb(255 255 255 / .09)`) and the white pill button on the band (`.dc-home-draw`).
- **Revision 1:** the band pill uses fixed colours (white / `#dce8f5` hover / `#1a4999` label, hover only under `@media (hover:hover)`) so Night can never blank the label; the about quote keeps the art in its own row under the quote (end-aligned, 150px) so the quote runs 2-3 balanced lines; the services intro is 62ch and balanced; "Sample cards" is now a 12.5px caption under the draw button.
- **Design-system question (open):** in Night the `--pink` token (`#3a2a44`) reads as a dusky purple on the services band and on the pink pillars/tags, close to the brief's "no purple" warning. Not overridden locally; decide whether Night pink should shift toward a redder, warmer dark (for example a deep rose) in the DS.
- **Shots:** `shots/home-{390,1280}-{ar,en}.png` (full page), `-fold` variants (first viewport), `home-390-ar-reduce`, `home-1280-en-dark`. `_build/shot-home.cjs` scrolls first so reveals fire.

## product (`product.html`)

- Primary box is «صندوق دردشات مع الحب»; `product.html?box=dardachat|whoamong|ramadan` swaps every section for the other three (shop links use these). Ramadan is out of season: the add row becomes "Notify me when it is back".
- Signature: the **exploded box** in "What is in the box". The lid lifts and each piece rises out of the box in turn as the section arrives (skipped under reduced motion). Each list line lifts its own piece (hover, focus, tap, or scroll past it); "Close the box" packs it again. The diagram is generated from the list rows (`data-part`), so the list is the single source of truth.
- Also: gallery of 4 placeholder illustrations (arrows, thumbs, swipe, arrow keys), quantity stepper with running total, heart pop plus a flying heart to the cart count (shares `sessionStorage['dc-proto-cart']` with shop), a "Flip a card" row (dealt in on scroll, includes the sealed «سرّ الحب الأبدي» card), a phone-only sticky add bar that appears once the main button scrolls off.
- Placeholders (all marked `.dc-ph`): prices; the gallery art; the sample questions (invented in the brand's Levantine voice; the client's real questions are unknown); short piece descriptions in the contents list (counts and names are real, DESIGN.md §6). "Cash on delivery is available" repeats the checkout brief.
- Rev 1 (exploded view): pieces are measured and scaled to fit (about 2x the first pass), placed alternately either side of the dashed axis and tilted 4-6 degrees, and rise out of the box from the axis. The lifted piece gets a soft shadow, the rest dim. The label is one caption pill under the picture (count, unit, name in ink at 15px, wide layout only; no per-piece white bar any more). On phones the 200px picture (`min(26vh,200px)`) shows a zigzag row above a small box (mirrored in Arabic), a 36px fade sits under it, and rows carry a `scroll-margin` of header + picture + gap so a tapped row rests fully below it. Phones also get a 4:3 gallery and the price and add button before the fact tiles, so name, age, price and Add to cart are all in the first 844px. Age reads 18+/12+ everywhere; the Ramadan note is ink with a red moon; Night box bodies use a navy tint (`--pdp-pink`) instead of the plum `--pink`. QA script: `_build/product-rev1.cjs`.
- The Night lid uses `--blue` (turns light in Night) rather than `--band`; acceptable, it stays readable.
- Rev 2: breadcrumb arrow in RTL now `rotate(-45deg)` (points left; the logical border already flips sides). Night pink card fronts use `--pdp-pink`. On phones the placeholder tag sits top inline-start, clear of the emblem. Price is written `₪169.00` (no space) everywhere. The sticky bar shows whenever the main Add button is off screen (below the fold or scrolled past).

## services

`services.html` is generated: `python _build/gen_services.py` fills the 8 workshop cards into `_build/services.src.html` (edit the source, not the output).
- Structure: brand-blue hero with the three services dealt as flip cards (price on the back), sticky in-page nav with scroll-spy, workshops (filterable, 6 priced + 2 series), sessions on a sky band, game nights on a pink band, "how to book" steps, the about paragraph as a quote, footer.
- Motion: deal and flip (hero cards; the sessions "draw a card" deck deals the next brand line), brush draw-on (hero strokes, each section underline as it arrives), heart pop on every WhatsApp button, one-time scroll reveal (rise, staggered), score bars fill and count up. Everything is visible without JS; reduced motion shows the end state.
- Prices are the real DESIGN.md §7 figures. Workshop group prices are shown as ranges with a note that the team confirms on WhatsApp. Series show "price per series, by length and participants" (no number exists).
- Placeholder: workshop art tiles and the scoreboard are flat illustrations (tagged «رسوم تجريبية» / «رسم توضيحي»); team scores 18/14 are invented for the drawing. "ابتداءً من ₪100" on the workshops card is the lowest per-person price. The three drawn-card lines are the brand book's real lines, not sample questions.
- Booking is WhatsApp only; the message names the service and follows the current language (rebuilt on toggle).
- `_build/shot_full.cjs` (scrolls before capturing so reveals fire) and `_build/test_services.cjs` (flip, filter, deck, language checks) are the QA scripts.

### services, revision 1 (supervisor fixes)
- Hero card backs now show real figures only: Sessions ₪70 per person + «₪500 للمجموعة الكاملة» / "₪500 per full group"; Game nights ₪70 per person + «₪1400 للمجموعة» / "₪1400 per group". The invented "Every seat" line is gone. Workshops back unchanged.
- `.dc-ph` in Cream is darkened to #6F4700 on the sunk surface (6.08:1); Night keeps the `--warning` token (10:1).
- Workshop cards are a flex column with the CTA at `margin-block-start:auto`, so the WhatsApp buttons line up across a row (verified at 1024 and 1280, ar and en). Fact tiles size to their content, wrap as whole tiles, and their values are `nowrap`. The Sessions and Game nights stat tiles are `auto auto 1fr` at wide widths so the duration stays on one line; 2 columns between 481 and 1179px.
- Sub-nav: the fourth chip is now «الحجز» / "Booking"; below 420px the chips tighten (13px, 10px padding, 4px gap) and share the row; below 380px padding drops to 8px. No horizontal scroll at 360 in either language.
- Hero deck at >=1024: wider column (1fr / 1.4fr, 8vw side padding), cards about 190px at 1280 (160px at 1024), stronger fan (+-7deg, centre card lifted and scaled), 52px prices on the backs.
- Mobile (<600px): the workshop art is a 96px square beside the title (cropped with `slice`), tighter card padding and gaps, 44px CTA, 3 stat tiles in one row, booking steps with the number beside the title, smaller section padding and draw-card stage. Page height at 390: ar 8814 to 6709 (-24%), en 9532 to 7260 (-24%).
- The drawn card's back is centred vertically (`place-content:center`).
- The general "contact us" button uses a neutral message: «مرحبًا دردشات، عندي سؤال عن خدماتكم» / "Hello Dardachat, I have a question about your services" (`data-msg-ar` / `data-msg-en` on the link, rebuilt on language toggle). Service buttons still name the service.
- QA helpers added: `_build/qa_services_rev1.cjs` (heights, overflow, sub-nav scroll, CTA alignment, duration wraps, placeholder contrast, deck width, general WhatsApp text) and `_build/clip.cjs` (element screenshot).

## index (gallery) and wrap-up (supervisor)

- `index.html` is the entry point. Brand-blue band with the knockout lockup, three pink strokes that paint on once, and (from 1000px) a fanned stack of three screen thumbnails that deal in. Below it: **The shopping path** (home, shop, product, cart and checkout, numbered 1-4 because it is the real order a shopper moves in, joined by a dashed thread on wide screens) and **Around the shop** (Journey as the wide feature row, then services and assistant as picture-beside-text rows, so the page is not one card grid). Each card links to the screen and shows its file name, a one-line description, its signature motion and its review status. Two panels close the page: how to try them (toolbar, review shortcuts) and what is still placeholder.
- Cards deal in (staggered spring, slight alternating tilt that straightens on hover or focus). Reduced motion (OS or toolbar) removes the deal and the fan; the page is fully readable without JS.
- Thumbnails are fresh 1280x800 first-viewport captures of the current files in Arabic and English (`shots/thumbs/<screen>-<lang>.jpg`, 720x450; the `-full.png` originals sit beside them). The image swaps with the language. States used: home and shop and product and services at the top, cart-checkout with the drawer open (`#cart`), journey at stop 3 (`?stop=3`), assistant open with a question asked. Regenerate: `node ../design/prototypes/_build/thumbs.cjs` from `web/`, then `python _build/thumbs_resize.py`. Every capture reported zero horizontal overflow and zero console errors.
- Checked at 360, 768, 1280 and 1440, ar and en, Cream and Night, reduced motion: no horizontal overflow, no console errors.

### Review status at wrap-up
- Approved (round 2): **shop**, **services**.
- Not approved after two review rounds, shown as "Needs another pass" in the gallery: **home**, **product**, **cart-checkout**, **journey**, **assistant**. They are complete and clickable; the remaining reviewer notes were not written to disk, so the next pass should start with a fresh review of each.

### Placeholder summary (all screens)
- Box prices (₪119 / ₪129 / ₪149 / ₪169) and all box art; no client prices or photos yet. Service prices are real (DESIGN.md §7).
- Every question-card text (home, product, cart-checkout confirmation), written by design in the brand voice.
- The whole Journey: stops, choices, the six result types, traits and scoring (the client owns the concept; the real build must score on the server).
- Delivery zones and fees, promo code `SAMPLE10`, order reference and ETA; the assistant's answers are scripted, not generated.
- Logo files are crops of a Canva screenshot; replace with the client's SVG.
- Icons are stand-ins until the client supplies a set.

### Open design-system questions
- Night `--pink` (#3a2a44) reads as dusky purple on large areas (home services band, pink tags). Product patched it locally with a navy tint. Decide a warmer Night pink in the DS.
- The two ds.css patches (`.dc-qcard__inner` display, `.dc-hero` using `--band`) should go back into the DS.
