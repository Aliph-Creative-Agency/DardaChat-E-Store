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
3. `index.html` is the client-facing start page: the old gallery with the internal review status chips, file names and review shortcuts removed. Its thumbnails are regenerated into `screenshots/thumbs/`.
4. One review round with 3 parallel workers (A: home/shop/product; B: cart-checkout/services; C: journey/assistant/start). Fixes: one cart shared across pages (`sessionStorage` `dc-proto-cart`, so a box added on Home/Shop/Product appears in checkout), and AA contrast for the quiet “Sample” tags (`ds.css` `.dc-ph` now uses the `--surface` token as its background). Verdicts are in `_review/verdicts.md`.
5. Took screenshots at 1440 and 390, Arabic and English, for every page and key state, and verified every page in Chromium (see README).

## Page list (presentation order)

| # | Page | File | What it shows |
|---|---|---|---|
| 0 | Start | `index.html` | Brand band and a card for each screen, in shopping-path order |
| 1 | Home | `home.html` | Logo band, “Draw a card” deck, the 4 boxes, services, quote, contact |
| 2 | Shop | `shop.html` | The 4 boxes with filters (who / age / season); add to cart with a heart that flies to the cart |
| 3 | Product | `product.html` | “Dardachat with Love” box: gallery, what's inside, sample cards to flip, price incl. VAT. Other boxes via `?box=` |
| 4 | Cart & checkout | `cart-checkout.html` | Slide-in cart, then 4 steps: address, delivery, payment (incl. cash on delivery), confirmation celebration |
| 5 | Services | `services.html` | Workshops, sessions, game nights at real prices; booking through WhatsApp |
| 6 | Journey | `journey.html` | 3D table, 5 stops with choices, a personality result card with save/share |
| 7 | Assistant | `assistant.html` | Scripted helper: typing dots, streamed answer with a source, hand-off to WhatsApp |

## Simulated or placeholder (marked quietly on the pages with “Sample” tags)

- Box prices (₪119–₪169) and box art. Service prices are real (DESIGN.md §7).
- Cart, checkout, order number, delivery zones and fees, promo code `SAMPLE10`. Nothing is sent anywhere.
- The assistant's answers are pre-written from the real catalogue and service facts.
- Journey content (stops, choices, results) is illustrative; the concept is the client's.
- The logo is cropped from a screenshot. We need an SVG from the client.
