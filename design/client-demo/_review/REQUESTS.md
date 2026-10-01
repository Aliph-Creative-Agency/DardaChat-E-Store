
## from assistant (round 2)
- shell, `_shared.js`: load `assistant-widget.css` + `assistant-widget.js` on every page except assistant.html (the JS is idempotent and also injects the css itself if it is missing; just add a normal `<script src="assistant-widget.js" defer>`).
- shell, z-index: widget launcher/panel/scrim sit at 900/905/904. Keep the cart drawer scrim >= 920 and drawer >= 930 (as in cart-checkout.html today) and the page-transition overlay above 950. Product sticky bar (z 60) and journey panel are handled by the widget (it lifts itself above `.dc-pdp-bar` and `.dc-jr-panel`); if you add another fixed bottom bar, tell me its selector.
- shell, optional: if the shared cart exposes `DC.cart.add(id, qty)` (ids: dardachat, whoamong, love), the widget's "Who Among Us" card shows an "Add to cart" button automatically; otherwise it only shows "View the box". Footer/header buttons can open the assistant with `<button data-dc-assistant>` or `DCAssistant.open()`.
