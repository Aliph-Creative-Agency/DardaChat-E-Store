# Client demo: plan and decision

Date: 2026-10-01 · For: Obaida → Raneem (Dardachat) · Team: client-demo (supervisor)

## Decision: (b) a partial demo

The demo is a clickable, visual-only front end with sample data and simulated flows. It is built from the existing animated prototypes, with screenshots (c) as the fallback that is always ready to send.

| Option | Speed | Persuasiveness | Fidelity | Verdict |
|---|---|---|---|---|
| (a) Full working demo of the real app (`web/`) | Slow. The app is unfinished, and its feature branches and worktrees live on the old desktop machine, not in this container. It would need a backend, data and a build first. | High, if it existed | Highest | Not possible in the time we have. Not attempted. |
| (b) Clickable front end, sample data, simulated flows | Fast. The 7 prototype screens already exist, have been reviewed, and every fix is applied. They only needed packaging. | High. Raneem can click, add to the cart, check out, take the Journey and ask the assistant, in Arabic and English, on a laptop or a phone. | Close to the target look. It uses the real design system (tokens, components, motion rules) and real brand copy, but no real data. | **Chosen** |
| (c) Static screenshots | Fastest | Low. They don't show motion or flows, which is where the brand feeling comes from. | Same visuals as (b), frozen | Delivered anyway as `screenshots/`, as a backup and something to send |

Why (b): almost all the work already existed (the `design/prototypes/` screens), so packaging it costs little and is far more convincing than screenshots. The demo shows the signature motion (brush strokes, cards dealt and flipped, the box opening) and the full shopping path, which screenshots cannot. Option (a) has no runnable code in this environment and would take days.

## What was done

1. Copied the 7 screens plus `ds.css`, `_shared.js` and `assets/` from `design/prototypes/` into this folder, unchanged.
2. **Offline-safe:** three.js r128 (used only by the 3D table in the Journey) is now loaded from `vendor/three.min.js` instead of cdnjs. No page loads GSAP or anything else from a CDN. The only network resource left is Google Fonts, and system fonts take over when you are offline. If WebGL is unavailable, the Journey falls back to a flat 2D table.
3. `index.html` was a client-facing start page in round 1 (superseded in round 2: it now forwards to home).
4. One review round with 3 parallel workers (A: home/shop/product; B: cart-checkout/services; C: journey/assistant/start). Fixes: one cart shared across pages (`sessionStorage` `dc-proto-cart`, so a box added on Home/Shop/Product appears in checkout), and AA contrast for the quiet “Sample” tags (`ds.css` `.dc-ph` now uses the `--surface` token as its background). Verdicts are in `_review/verdicts.md`.
5. Copy pass in the client's own voice (`_review/VOICE.md`, taken from the client's Canva page) on all 8 pages. Copy A, B and C were all approved.
6. Real photos: Obaida's Canva screenshots of every game (`assests/canva sc shots/`) were cut into 25 JPGs in `assets/photos/` (580–1600 px, never upscaled). They are used on the box cards (home, shop), in all 4 product galleries, on the home service tickets and on the services banners and workshop cards. A first try with 120 px crops was rejected as blurry. Details are in `_review/PHOTOS.md` and `_review/verdicts.md` (Photos).
7. Took screenshots at 1440 and 390, Arabic and English, for every page and key state, and verified every page in Chromium (see README).

## Round 2 (Obaida's edits, 2026-10-01)

Requirements in `_review/ROUND2.md`; three parallel lanes (shell, assistant, content), then a supervisor integration pass (`_review/verdicts.md`, Round 2).

1. **Start page removed.** `index.html` forwards to `home.html`; every page is reachable from home's header, footer and links.
2. **Header controls.** The floating prototype toolbar is gone. Every header has a theme button (moon/sun) and a language button (EN / ع), remembered across pages. Reduced motion follows the OS only.
3. **Cart icon** is now a shopping cart. With items it opens one shared drawer (`_shared.js`, `shell-*` styles in `ds.css`) over the current page, and checkout continues from it to the confirmation. With an empty cart it opens the box list.
4. **Page transitions:** a ~340 ms brand-blue card flip with the heart drawing in, then a ~300 ms fade on arrival; instant under reduced motion.
5. **Assistant widget** (`assistant-widget.js/.css`) on every page, loaded by `_shared.js`: desktop panel, phone bottom sheet, cross-page sources, add to cart, WhatsApp hand-off. It stays below the cart drawer and lifts itself above the product sticky bar and the Journey panel.
6. **Content:** the coming-soon game «سمبوسك ولا قطايف» on home, shop and `product.html?box=sambousek`; 8 distinct workshop photos on services.
7. **Supervisor fixes:** favicon (removes the stray `/favicon.ico` 404 on hosts), «اسأل مساعد دردشات» links open the widget in place, Arabic item-count grammar in both drawers, drawings no longer overflow the 4:3 product stage on phones, screenshot script and set redone (68 PNGs).

## Page list (presentation order)

| # | Page | File | What it shows |
|---|---|---|---|
| 0 | Entry | `index.html` | Forwards to home (keeps `?lang` / `theme`) |
| 1 | Home | `home.html` | Logo band, “Draw a card” deck, the 4 boxes, services, quote, contact |
| 2 | Shop | `shop.html` | The 4 boxes with filters (who / age / season); add to cart with a heart that flies to the cart |
| 3 | Product | `product.html` | “Dardachat with Love” box: gallery, what's inside, sample cards to flip, price incl. VAT. Other boxes via `?box=` |
| 4 | Cart & checkout | shared drawer + `cart-checkout.html` | Cart drawer over any page (from the header cart icon); empty cart → box list; then 4 steps: address, delivery, payment (incl. cash on delivery), confirmation celebration |
| 5 | Services | `services.html` | Workshops, sessions, game nights at real prices; booking through WhatsApp |
| 6 | Journey | `journey.html` | 3D table, 5 stops with choices, a personality result card with save/share |
| 7 | Assistant | widget on every page (`assistant-widget.js`) | Scripted helper: typing dots, streamed answer with a source, add to cart, hand-off to WhatsApp. `assistant.html` forwards to home with it open |

## Simulated or placeholder (marked quietly on the pages with “Sample” tags)

- Box prices (₪119–₪169). Service prices are real (DESIGN.md §7). Box and service photos are now the client's real photos.
- The Ramadan Family Box is shown with its current photos and the note «تصميم مؤقت · سيُعاد تصميم هذا الصندوق» (the box is being redesigned).
- The 8 workshop cards use free-licence Unsplash stand-ins (one each) until the client's own photos arrive.
- «سمبوسك ولا قطايف» is a coming-soon placeholder (drawing, no price, notify button).
- Cart, checkout, order number, delivery zones and fees, promo code `SAMPLE10`. Nothing is sent anywhere.
- The assistant's answers are pre-written from the real catalogue and service facts.
- Journey content (stops, choices, results) is illustrative; the concept is the client's.
- The logo is cropped from a screenshot. We need an SVG from the client.

## Still needed from the client

The final box prices, the details of «سمبوسك ولا قطايف», their own workshop photos (8), a wide community/hero photo, the redesigned Ramadan box photos, the logo as SVG, and, ideally, original-resolution photos. To swap in a photo, overwrite the same filename in `assets/photos/`.
