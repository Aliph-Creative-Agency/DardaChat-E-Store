# Button

Pill buttons: blue for primary navigation actions, red for the one money-or-booking action on a screen.

- **Variants:** `dc-btn` (blue, primary), `dc-btn--cta` (red + white text: add to cart, place order, book), `dc-btn--outline` (secondary, incl. "احجز عبر واتساب"), `dc-btn--ghost` (tertiary), `dc-btn--sm`.
- **One red button per view.** Red is the accent; two red buttons compete.
- **Heart pop:** a CTA that adds something may carry the `.dc-heart` svg; add `is-popped` on click to float a heart up (brand mark = the finger-heart). Skip it for "place order".
- **Consumer provides:** the label (a verb in Arabic imperative, short: «أضف إلى السلة», «احجز»), an optional leading 20px line icon.
- Don't put red text on cream; the CTA's label is always `on-red` on `red`, 16px semibold.
