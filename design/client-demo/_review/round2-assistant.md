# Round 2 - assistant lane

Files: `assistant-widget.js` (window.DCAssistant), `assistant-widget.css` (all `dc-aw-*`), `assistant.html` (now a redirect to `home.html?asst=open`, keeping lang/theme/motion/ask). Old page kept in scratchpad `assistant/assistant.old.html`.

- Self-contained: language from `<html lang>` (MutationObserver + `dc:lang`), theme via tokens/[data-theme], reduced motion via `DC.reducedMotion()` or OS/`data-motion`. Injects its own CSS link if missing; idempotent. No dependency on _shared.js.
- Same answers, chips, sources, WhatsApp cards as before. Sources now work cross-page (product.html?box=..., services.html#..., shop.html) with ?lang/?theme carried; a source pointing at the current page closes the sheet and scrolls.
- Desktop: floating panel at inline-end (flips left in RTL, right in LTR). Phones (<560px): bottom sheet over a scrim, page made inert, Tab trap, Esc closes.
- Stacking: launcher 900, scrim 904, panel 905; below cart drawer (920/930). Launcher/panel lift themselves above `.dc-pdp-bar` and `.dc-jr-panel` (measured every 400 ms). Conversation + open state persist per tab (sessionStorage `dc-aw`).
- API: `DCAssistant.open/close/toggle/isOpen/ask`; `[data-dc-assistant]` opens it; `?asst=open&ask=...`.
- Cart: no local cart any more. The Who Among Us card has "View the box"; an "Add to cart" button appears only if shell exposes `DC.cart.add(id, qty)` (see REQUESTS.md).
- Verified in Chromium (390 and 1440, ar and en) on home, shop, product?box=love, services, journey, cart-checkout: no page errors, no horizontal overflow, widget injected via addScriptTag. Product bar lift (72px) and same-page source scroll checked. Not verified: shell's auto-load (not in _shared.js yet at my last check).
- Scripts/shots: scratchpad `assistant/` (t.js, t2.js, *.png).
