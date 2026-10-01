# Client demo, round 2 (Obaida's edits, 2026-10-01)

Demo folder: `/home/user/DardaChat-E-Store/design/client-demo/` (static HTML, opened from disk or a static host).

Main references:
- Design system: `/home/user/DardaChat-E-Store/design/system/` (README.md brand book and motion rules, tokens.json). Use tokens and `dc-*` components only, never raw colours or fonts.
- Brand spec: `/home/user/DardaChat-E-Store/.orchestration/DESIGN.md`
- Voice guide: `_review/VOICE.md`. New copy follows it: MSA, calm, no "!", no emoji.

## Rules for every worker
- Edit only what your lane owns (table below). Use targeted edits (Edit tool or small replacements). NEVER rewrite a whole file another lane also touches.
- Need something in another lane's file? Append it to `_review/REQUESTS.md` (who, file, what) and carry on.
- Arabic RTL first, with English via data-ar/data-en. Respect `prefers-reduced-motion`. WCAG AA contrast, and no small red text.
- Verify in Chromium at 390 and 1440, in ar and en: no page errors and no horizontal overflow.
  - playwright-core: require it from `/tmp/claude-0/-home-user-DardaChat-E-Store/4946e647-961e-58ea-80f8-801a975901d3/scratchpad/pw/node_modules/playwright-core`
  - executablePath: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  - Put scripts and shots in the scratchpad `<lane>/` folder. Do NOT write to `screenshots/`.
- Never touch `web/` or git, and do not invoke task-observer.
- At about 40% context, write `_review/HANDOVER-<lane>.md` (Task / State / Next move / Gotchas) and return.
- Report to `_review/round2-<lane>.md`, at most about 30 lines.

## Lanes and ownership

| Lane | Owns |
|---|---|
| **shell** | `_shared.js`, `ds.css`, the `<header>` of every page, `index.html`, `cart-checkout.html`, any new `shell-*` files |
| **assistant** | `assistant.html`, new `assistant-widget.js` and `assistant-widget.css` |
| **content** | the `<main>` sections of `home.html`, `shop.html`, `product.html`, `services.html` (NOT the header), `assets/photos/` |

### shell
1. Remove the floating prototype toolbar (lang / Night / Less motion). Add two buttons to the header of EVERY page: theme (light ↔ dark) and language (ع ↔ EN). Use icon buttons with aria-labels, keyboard support, and the choice remembered across pages (as `_shared.js` already does). Reduced motion follows the OS setting only.
2. Replace the cart icon on every page: it looks like a bin. Use a clear shopping bag (with handles) or a cart, matching the design system's icon stroke style. Keep the count badge.
3. Remove the intro/start page. `index.html` must become the home page: either a redirect to `home.html` (preserving `?lang`/`theme`) or home itself. Every page must be reachable from home through the header nav, footer or links: shop, product (every box), cart and checkout, services, journey. The assistant becomes a widget (see the assistant lane), so it needs no nav item. Remove links to the start page.
4. Cart behaviour. The cart-checkout page's first screen (the box list with «افتح السلة / اذهب إلى الدفع», marked «عرض مختصر لتجربة السلة») shows ONLY when the cart is empty. When the cart has items, clicking the cart icon on ANY page opens the cart drawer over the current page, using the same shared session cart, with checkout continuing from the drawer. Build the drawer once in `_shared.js` with `shell-*` assets so every page gets it.
5. Page transitions: a very short loading screen between pages (about 300–500 ms total), with 1–2 small on-brand animations (e.g. the finger-heart mark drawing in or a card flip, following the design system motion rules). Intercept same-site link clicks and the back/forward cache (pageshow). Under reduced motion, use only an instant cross-fade.
6. `_shared.js` must auto-load `assistant-widget.js` and `assistant-widget.css` if they exist, on every page except `assistant.html`. The assistant lane builds those files.

### assistant
Turn the assistant into a floating widget available on every page: launcher button, then the panel, using the same answers, chips, sources and WhatsApp escalation as `assistant.html`.
- Extract it into `assistant-widget.js` and `assistant-widget.css`. The shell lane's `_shared.js` loads them automatically, so do NOT edit other pages.
- Adjust anything necessary:
  - "source" links must work cross-page
  - the panel must not cover the cart drawer or the sticky product bar (coordinate z-index through REQUESTS.md)
  - it must flip correctly in RTL and LTR
  - it needs a mobile sheet
- `assistant.html` can stay as a demo page or redirect to home with the widget open (`?asst=open`).

### content
1. New game «سمبوسك ولا قطايف» (en: "Sambousek or Qatayef"). Details come later, so make a place for it:
   - a card on home (box shelf) and on shop, and a `product.html?box=sambousek` page
   - placeholder art in the design-system style
   - a quiet `.dc-ph` note: «قريبًا · التفاصيل قيد الإعداد» / "Coming soon · details in preparation"
   - no price; a «أبلغني عند توفره» notify button instead of add to cart, so it doesn't need to go into the cart catalog
   - copy kept minimal and factual, in the client voice
2. Workshops: give each workshop card on services (8 cards) its own generic photo matching the activity: goal/vision board, clay, Palestinian embroidery, mother & child, flower arranging, tote bag, series, gift-to-self, …
   - Use free-licence stock photos (Unsplash or Pexels; network is available), downloaded into `assets/photos/workshop-*.jpg` at about 1200 px, quality 85.
   - Record each source URL and licence in `_review/PHOTOS.md`.
   - Choose warm, natural-light, people-and-hands imagery that fits the brand; no stocky corporate shots.
   - Keep the shared photo as the services workshops banner only.
