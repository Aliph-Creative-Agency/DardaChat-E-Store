# Dardachat storefront: client demo

A clickable preview of the Dardachat shop. It is front end only, with sample data and simulated flows. Arabic (RTL) comes first, with English one click away. The reasons for this format are in `PLAN.md`.

## Open it

1. Copy the whole `design/client-demo/` folder (keep the folder structure: `assets/`, `vendor/` and `screenshots/thumbs/` are used by the pages).
2. Double-click **`index.html`**. It opens straight from disk in Chrome, Edge or Safari. You don't need a server, an install or a login.
3. Before the meeting, open every page once with internet on. Fonts come from Google Fonts. Offline, everything still works, but the system font stands in for Baloo Bhaijaan / IBM Plex.
4. If you present from a phone, AirDrop/WhatsApp the PNGs from `screenshots/` instead. Pages opened from a file on a phone are unreliable. Alternatively, run `python -m http.server` in this folder and open `http://<laptop-ip>:8000` from the phone on the same Wi-Fi.

**Controls (bottom of every page):** a small floating toolbar with English/العربية, Night/Cream and Less motion. The choice carries over from page to page. The motion setting also follows the OS “reduce motion” preference automatically. This toolbar is a demo control, not part of the shop design. It stays in the live demo because it is how you switch language, but it is hidden in all screenshots. To hide it live as well, add `<html data-no-protobar>` to a page.

## Click-through script (about 10 minutes)

Start at `index.html`, in Arabic.

1. **Start page.** The blue brand band paints itself on, and the screens are dealt like cards. Say: “This is how the shop will look and feel. The data is sample, and the look and motion are close to final.”
2. **Home** (card 1). Point out the brush strokes painting on. Press **«اسحب بطاقة أخرى»** (Draw another card) a few times: a question card is drawn from the deck and flips. Scroll: the four boxes, services, the brand quote and contact (WhatsApp and Instagram).
3. **Shop** (from the header «الصناديق»). Try the filters (who / age / season). Hover a box: the lid tilts. Press the heart/add button: a heart flies to the cart and the count bumps. Note the Ramadan box shown as out of season.
4. **Product.** Open «صندوق دردشات مع الحب». The box opens and its pieces rise out one by one. Flip the sample question cards, and point out the price incl. VAT, marked as a sample.
5. **Cart & checkout.** Open the cart from the header: the drawer slides in holding whatever was added on Home/Shop/Product, since the cart is shared across pages for the browser tab. If nothing was added, it shows two sample boxes. Continue to checkout:
   - Address: fill in any name, a phone number and a city. The inline errors show if you skip a field.
   - Delivery: pick a zone and the fee updates.
   - Payment: card, wallet, transfer or **cash on delivery**. Card details are never typed here; that happens on the payment provider's page.
   - Optional: promo code **`SAMPLE10`** takes 10% off.
   - Confirm. The celebration plays (strokes, hearts, cards dealt) and shows an order number.
6. **Services.** Three cards deal in and flip to their (real) prices. The booking buttons open **real WhatsApp chats to Dardachat's number** with a pre-filled message. Either don't press them, or press one to show the hand-off and close the tab.
7. **Journey.** Read the disclaimer, start, and the 3D table appears. Answer the 5 stops (keys 1/2/3 also work). The result card flips with a brush stroke; show Save and Share. Say: “The content is illustrative. The Journey concept is yours, and we fill it in together.”
8. **Assistant.** Open the chat bubble and tap a suggested question (for example the box contents or the workshops). The typing dots appear, then the answer streams in with a source line and an action card. Ask something off-topic: it says honestly that it won't guess and offers WhatsApp to the team.
9. **Switch to English** from the bottom bar and revisit one or two pages. Toggle **Night** to show the dark theme.

## Simulated or placeholder

Each of these is marked on the page with a small “Sample / تجريبي” tag.

| Item | Status |
|---|---|
| Box prices (₪119–₪169), box photos/art | Placeholder. We need prices and photos from the client. |
| Service prices | Real (from the brand spec) |
| Cart, checkout, order number, delivery zones/fees, promo `SAMPLE10` | Simulated in the browser. Nothing is sent anywhere. The cart lives only in this browser tab, and closing the tab empties it. |
| Payment | No payment is taken. Methods are shown only. |
| Assistant answers | Pre-written from real catalogue and service facts. Not a live AI. |
| Journey stops, choices, results | Illustrative content |
| Question texts on the cards | Written by the design team in Dardachat's voice |
| Logo | Cropped from a screenshot. We need the SVG from the client. |
| WhatsApp / Instagram links | **Real** (Dardachat's number and account) |

## Screenshots (to send if anything goes wrong)

`screenshots/` holds PNGs for each page and key state, named `NN-state_desktop-1440_ar.png` / `_mobile-390_en.png` and so on. Arabic and English, desktop 1440 and mobile 390. Full-page shots are used for scrolling pages, viewport shots for overlays (cart drawer, Journey, assistant).

| # | State |
|---|---|
| 00 | Start page |
| 01 | Home |
| 02 | Shop |
| 03 | Product |
| 04 | Cart drawer open |
| 05 | Checkout, step 1 |
| 06 | Services |
| 07 | Journey intro |
| 08 | Journey, playing a stop (3D table) |
| 09 | Journey result card |
| 10 | Assistant opened |
| 11 | Assistant answering a question |

`screenshots/thumbs/` holds the small JPEGs that the start page uses. Keep them.

## Verified

Every page and state above was checked in Chromium at 390 and 1440, in Arabic and English. There are no console errors, no failed requests and no horizontal overflow, and three.js loads from `vendor/` with no CDN. Details are in the supervisor's report.

## Files

`index.html` (start) · `home.html` `shop.html` `product.html` `cart-checkout.html` `services.html` `journey.html` `assistant.html` · `ds.css` (design-system tokens and components, generated from `design/system/`) · `_shared.js` (language, theme and motion) · `assets/` (logo, banner) · `vendor/three.min.js` (r128, MIT) · `screenshots/`. Source prototypes: `design/prototypes/`.
