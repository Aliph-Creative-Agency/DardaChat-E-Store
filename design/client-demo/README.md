# Dardachat storefront: client demo

A clickable preview of the Dardachat shop. It is front end only, with sample data and simulated flows. Arabic (RTL) comes first, with English one click away. The reasons for this format are in `PLAN.md`.

## Open it

1. Copy the whole `design/client-demo/` folder and keep its structure (`assets/` and `vendor/` are used by the pages; `_review/` and `screenshots/` are not needed to run it).
2. Double-click **`index.html`**. It forwards straight to the home page (`home.html`). It opens from disk in Chrome, Edge or Safari, with no server, install or login. Or open the hosted link (see "Deploying to a subdomain").
3. Before the meeting, open every page once with internet on. Fonts come from Google Fonts. Offline, everything still works, but the system font stands in for Baloo Bhaijaan / IBM Plex.
4. On a phone, use the hosted link, or the PNGs from `screenshots/`. Pages opened from a file on a phone are unreliable. On the same Wi-Fi you can also run `python -m http.server` in this folder and open `http://<laptop-ip>:8000`.

**Header buttons (every page):** next to the cart there are two small icon buttons: the **moon/sun** switches Cream ↔ Night, and **EN / ع** switches the language. Both work with the keyboard and the choice carries over to every page (and is remembered next time in the same browser). There is no floating demo toolbar any more. Reduced motion follows the operating system setting.

**Cart icon:** with an empty cart it opens the box list (`cart-checkout.html`). Once something is in the cart it opens a **drawer over the current page** (change quantities, remove with undo, see the subtotal), and **«إتمام الطلب» / Checkout** in the drawer continues to the checkout steps. The cart is shared by all pages for this browser tab.

**Assistant widget:** a round chat button in the bottom corner of every page (bottom left in Arabic, bottom right in English). It opens a panel on desktop and a bottom sheet on phones, with the same suggested questions, sources and WhatsApp hand-off as before, and it can add a box to the cart. The «اسأل مساعد دردشات» links on home and shop open it in place. The old `assistant.html` address still works: it forwards to home with the assistant open.

**Page changes** show a very short brand-blue card flip with the heart drawing in (about a third of a second). With reduced motion it is a plain instant change.

## Click-through script (about 10 minutes)

Start at `index.html` (home), in Arabic.

1. **Home.** Point out the brush strokes painting on. Press **«اسحب بطاقة أخرى»** (Draw another card) a few times: a question card is drawn from the deck and flips. Scroll: the boxes (including the coming-soon **«سمبوسك ولا قطايف»**), services, the brand quote and contact (WhatsApp and Instagram).
2. **Header.** Toggle the moon (Night) and back, and EN and back, to show both work on any page.
3. **Shop** (header «الصناديق»). Try the filters (who / age / season). Hover a box: the lid tilts. Press the heart/add button: a heart flies to the cart and the count bumps. Note the Ramadan box marked as being redesigned, and the new game with «أبلغني عند توفره» (Notify me) instead of a price.
4. **Product.** Open «صندوق دردشات مع الحب». The gallery, what's inside, sample question cards to flip, the price incl. VAT (marked as a sample). Add it to the cart.
5. **Cart drawer.** Click the cart icon: the drawer slides in over the product page. Change a quantity, then **«إتمام الطلب»**:
   - Address: any name, a phone number and a city. Inline errors show if you skip a field.
   - Delivery: pick a zone and the fee updates.
   - Payment: card, wallet, transfer or **cash on delivery**. Card details are never typed here; that happens on the payment provider's page.
   - Optional: promo code **`SAMPLE10`** takes 10% off.
   - Confirm. The celebration plays (strokes, hearts, cards dealt) and shows an order number.
6. **Services.** Three cards deal in and flip to their (real) prices. Scroll to the workshops: each of the 8 has its own photo. The booking buttons open **real WhatsApp chats to Dardachat's number** with a pre-filled message. Either don't press them, or press one to show the hand-off and close the tab.
7. **Journey** (header «الرحلة»). Read the disclaimer, start, and the 3D table appears. Answer the 5 stops (keys 1/2/3 also work). The result card flips with a brush stroke; show Save and Share. Say: “The content is illustrative. The Journey concept is yours, and we fill it in together.”
8. **Assistant.** Open the chat button and tap a suggested question (box contents or workshops). The typing dots appear, then the answer streams in with a source line and an action card («أضف إلى السلة» adds the box). Ask something off-topic: it says honestly that it won't guess and offers WhatsApp to the team.

## Simulated or placeholder

Each of these is marked on the page with a small “Sample / تجريبي” tag.

| Item | Status |
|---|---|
| Box prices (₪119–₪169) | Placeholder (“سعر تجريبي”). We need final prices from the client. |
| Box and service photos | **Real**: the client's own photos (Obaida's Canva screenshots, `assets/photos/`, see `_review/PHOTOS.md`). |
| Workshop card photos | Free-licence Unsplash stand-ins, one per workshop (`assets/photos/workshop-*.jpg`, sources in `_review/PHOTOS.md`), until the client sends their own. |
| «سمبوسك ولا قطايف» (Sambousek or Qatayef) | Placeholder card, drawing and product page: «قريبًا · التفاصيل قيد الإعداد», no price, a notify button instead of add to cart. |
| Ramadan Family Box | Real photos, but the box is being redesigned: marked «تصميم مؤقت · سيُعاد تصميم هذا الصندوق». |
| Service prices | Real (from the brand spec) |
| Cart, checkout, order number, delivery zones/fees, promo `SAMPLE10` | Simulated in the browser. Nothing is sent anywhere. The cart lives only in this browser tab. |
| Payment | No payment is taken. Methods are shown only. |
| Assistant answers | Pre-written from real catalogue and service facts. Not a live AI. |
| Journey stops, choices, results | Illustrative content |
| Question texts on the cards | Written by the design team in Dardachat's voice |
| Logo | Cropped from a screenshot. We need the SVG from the client. |
| WhatsApp / Instagram links | **Real** (Dardachat's number and account) |

## Still needed from the client

- Final box prices (all box prices are samples).
- The details, art and price of «سمبوسك ولا قطايف».
- Their own workshop photos (8), and a wide community/hero photo (about 1920×1080).
- The redesigned Ramadan box photos.
- The logo as SVG.
- Higher-resolution originals are welcome. To swap a photo, overwrite the same filename in `assets/photos/`.

## Deploying to a subdomain

The folder is a plain static site: no build step, no server code. **`index.html` is the entry point** (it forwards to `home.html`). Publish the folder `design/client-demo/` as the site root.

**Netlify**
- Quickest: log in to app.netlify.com → *Add new site* → *Deploy manually*, and drag the `client-demo` folder onto the page.
- From Git: *Add new site* → *Import from Git*, pick the repo, set **Base directory** `design/client-demo`, leave the build command empty and the publish directory as the base (`.`).
- Then *Domain management* → *Add a domain* → e.g. `demo.dardachat.com`. Netlify shows the target host (`<site>.netlify.app`).

**Cloudflare Pages**
- *Workers & Pages* → *Create* → *Pages* → connect the Git repo (or *Upload assets* and drop the folder).
- Framework preset *None*, **no build command**, **build output directory `design/client-demo`**.
- Then *Custom domains* → *Set up a domain* → e.g. `demo.dardachat.com`. The target host is `<project>.pages.dev`.

**DNS (the client's agency, Aliph):** ask them to add one record on the client's domain:
`CNAME  demo  →  <site>.netlify.app` (or `<project>.pages.dev`). HTTPS is issued automatically by the host once the record resolves (minutes to an hour).

**Optional password:** Netlify *Site configuration* → *Access & security* → *Password protection* (a site-wide password, on paid plans), or on Cloudflare put the subdomain behind **Cloudflare Access** (Zero Trust → Access → Applications → self-hosted, allow listed emails, free for small teams). Alternatively, don't link the subdomain anywhere and add `<meta name="robots" content="noindex">` if search engines must stay out.

## Screenshots (to send if anything goes wrong)

`screenshots/` holds PNGs for each page and key state, named `NN-state_desktop-1440_ar.png` / `_mobile-390_en.png` and so on. Arabic and English, desktop 1440 and mobile 390. Full-page shots for scrolling pages, viewport shots for overlays (cart drawer, Journey, assistant, the workshops section).

| # | State |
|---|---|
| 01 | Home |
| 02 | Shop |
| 03 | Product (default box: Dardachat with Love) |
| 03b / 03c / 03d / 03e | Product: Dardachat Box / Who Among Us / Ramadan / Sambousek or Qatayef (`?box=`) |
| 04 | Cart drawer open over the shop page (2 boxes in the cart) |
| 04b | Cart icon with an empty cart: the box list |
| 05 | Checkout, step 1 |
| 06 | Services |
| 06b | Services: the workshops section (8 photos) |
| 07 | Journey intro |
| 08 | Journey, playing a stop (3D table) |
| 09 | Journey result card |
| 10 | Assistant widget open on home |
| 11 | Assistant answering a question |

68 PNGs in total (17 states × ar/en × 1440/390), retaken on 2026-10-01 for round 2.

## Verified

Every page and state above was checked in Chromium at 390 and 1440, in Arabic and English, Cream and Night: no page errors, no failed requests and no horizontal overflow; three.js loads from `vendor/` with no CDN. Details are in `_review/verdicts.md` (Round 2).

## Files

`index.html` (forwards to home) · `home.html` `shop.html` `product.html` `cart-checkout.html` `services.html` `journey.html` · `assistant.html` (forwards to home with the assistant open) · `ds.css` (design-system tokens and components, plus the shared header buttons, cart drawer and page transition) · `_shared.js` (language, theme, shared cart drawer, page transitions, loads the assistant) · `assistant-widget.js` / `.css` · `assets/` (logo, favicon, banner, `photos/` + `MAP.json`) · `vendor/three.min.js` (r128, MIT) · `screenshots/`. Source prototypes: `design/prototypes/`.
