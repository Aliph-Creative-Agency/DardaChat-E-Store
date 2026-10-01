# Outstanding supervisor review notes (last round, not yet applied)

Extracted by the orchestrator from the design team run log. Screens: cart-checkout, assistant, journey, home, product.

## home

Round 2 review of design/prototypes/home.html. I checked it in Playwright at 360, 390, 768, 1024, 1280 and 1440px, in ar and en, light and Night, plus reduced motion. My scripts and shots are in scratchpad/sup-home2/ (s.cjs, i.cjs, b.cjs, f.cjs; frames in i/).

All five Rev-1 fixes check out:
- The Night draw pill is readable on hover and focus.
- The quote runs 2 balanced lines in Arabic and 3 in English.
- The services intro is 62ch and balanced.
- "Sample cards" is now a caption under the draw button.
- The Night pink question is recorded in NOTES.md.

Everything else I checked works:
- No horizontal overflow at any width.
- No console errors or failed requests.
- The brush draw-on finishes in about 1s, and the headline underline draws after it.
- Deal and flip is smooth. The pile keeps at most 3 cards. Clicking the deck draws a card. Rapid clicks do not break anything.
- The live region announces each drawn card.
- Add to cart pops the heart, bumps the count to 1 and shows the toast.
- The header turns solid on scroll and the logo fades in.
- The mobile menu opens and closes (Esc, outside tap).
- The ar/en toggle flips dir and lang and rewrites the WhatsApp message text.
- Under reduced motion the page shows the end state at once and a draw appears already flipped.
- The focus ring is visible, and content that has not revealed yet still shows up when focused.

Three small fixes are left before approval:

1. **Small red text (a named rule).** The Ramadan box's out-of-season note is 13px red text: `.dc-product__note`, «يرجع مع بداية رمضان · غير متوفر الآن» / "Back when Ramadan begins · not available now".
   - It renders rgb(184,22,27) in Cream and rgb(255,116,120) in Night, in all 8 runs.
   - product.html already fixed the same note (ink text, red icon), so home is now inconsistent.
   - Fix: add `.dc-home-boxes .dc-product__note { color: var(--ink-soft); }` (or `--ink`) and keep only the clock svg red: `.dc-product__note svg { color: var(--red-text); }`. Use the right wrapper selector for the boxes section.

2. **Hero brush runs behind the main button (≥900px only).** `.dc-home-brush--c` (`inset-inline-start:-110px; inset-block-end:-40px; width:240px`) ends right behind the red "Shop the boxes" / «تسوّق الصناديق» button, in both ar and en.
   - The pink tail touches the button's start edge, which muddies it and pulls the eye off the main action. See i/g-cta.png.
   - Fix: inside the `@media (min-width:900px)` block, move the stroke below and outside the button row, for example `inset-block-end:-110px` or `width:190px; inset-inline-start:-130px`.
   - Check at 1024, 1280 and 1440 that the stroke's bounding box stays at least 16px clear of `.dc-home-cta`.

3. **Text under 12px.**
   - The footer contact labels ("Address / WhatsApp and phone / Email / Instagram") compute to 11.67px (`.dc-home-foot small`, inherits `smaller`). Set `font-size: 12.5px` (or `var(--type-label)` at 13px) and keep the 0.85 opacity.
   - Optional: the `.dc-ph` "Sample price" chips are 10.5px. Raise them to 11.5–12px if the shared placeholder chip allows it; otherwise leave them.

Optional polish, not blocking:
- At 768px in English the h1 breaks as "Conversation games in a / box, from the heart of Jerusalem", leaving "in a" hanging.
- Fix: wrap "in a" with the box highlight span in the existing `.dc-home-nw` (nowrap) so the phrase stays on one line.

Once 1–3 are done, re-shoot:
- 1280 ar and en, light and Night: the boxes shelf and the hero CTA row.
- 390 ar Night: the footer.
Confirm no overflow and no console errors, then this can be approved. No other changes needed.

Not part of this review: the designer passed on an unanswered, truncated user question ("why do i see some errored tasks marked as finished?"). The orchestrator should raise it with the user directly.

## product

This round is close. There is one real RTL bug plus three small polish items, so a short pass should be enough.

I tested with my own @playwright/test script at 390, 1280 and 360, in ar and en, Cream and Night, with reduced motion and with ?box=ramadan. Everything else checked out: no console errors, no horizontal overflow, and the page is mirrored correctly. The exploded view with its count-and-name pill reads well, the qty stepper, add to cart, toast and flying heart work, the card flips work, and the sticky bar and Notify me state behave. Keyboard focus rings are visible. The only text below 4.5:1 contrast is the shared .dc-ph placeholder tag, at 4.42:1. There is no small red text. Scripts and shots are in C:/Users/Obaida/AppData/Local/Temp/claude/D--Personal-Projects-DardaChat-E-store/cfc33bd4-3b2e-41e4-a1a5-1a97ff71ec91/scratchpad/prod2/ (r.cjs, i.cjs).

MUST FIX
1. The breadcrumb arrow points DOWN in Arabic, at every width and in both themes. It sits between الصناديق and the product name. In D:/Personal/Projects/DardaChat-E-store/design/prototypes/product.html, line 52 is `[dir="rtl"] .dc-pdp-crumbs li + li::before { transform: rotate(-135deg); }`. The logical `border-inline-end` already moves the arrow's side border to the left in RTL, so the extra -135deg turns it downward. Change it to `transform: rotate(-45deg);` so it points left (‹). Re-shoot the 390 and 1280 ar tops to confirm.

SHOULD FIX (small)
2. In Night, the flip card backs (#cards .dc-qcard, cards 2 and 4) still use the plum --pink tint and look muddy next to the navy. You moved the box bodies to --pdp-pink; give the card backs the same token in [data-theme=dark].
3. At 360 and 390, the "رسم مؤقت، بانتظار صور العميل" tag on the main gallery image sits on top of the red heart emblem. Move it to the top inline-start corner of the image on phones, or keep it clear of the emblem.
4. The price is written two ways: "₪169.00" in the price block and "₪ 169.00" in the sticky bar (#barPrice, and the other boxes list). Pick one format, either the same thin space or none, and use it everywhere.

NICE TO HAVE
5. At 360x740 the Add to cart button is just below the fold, and the sticky bar does not show because the main button has not been scrolled past yet. You could show the bar as long as the main button is not in view, not only after it has been passed.

When all this is done, update NOTES.md `## product` with a line on the breadcrumb fix and re-shoot product-390-top.png and product-1280-ar-inside.png.

## cart-checkout

Round 2 on design/prototypes/cart-checkout.html. I walked it again myself with Playwright at 390 and 1280, in ar/Cream, en/Night, en/Cream and ar/Night, plus ar at 390 with reduced motion. My script and shots are in scratchpad/sup-co3/. All 10 round-1 fixes check out: hearts rise inside the stage, the drawer opens over Payment and restores #payment on close, the badge is 0 after the order and the done drawer sends Esc back to #done, the zone card bodies are 204px, the title is at opacity 1 by 0.5s, the address is correct, the empty phone message has no placeholder, the discount is "−₪ 43.70" in an LTR span, and the no-op lines are gone. There are no console errors and no overflow. The 14-Tab focus trap works. Error text uses red-text at 5.5:1 in Cream and 6.5:1 in Night, so no small red text is involved. RTL arrows and steps are correct. Three small things are still open:

1. **Heart pop fires on a failed Place order.** `#confirmBtn` has `data-pop`, and the global click handler in `_shared.js` pops a heart on every click. When no method is picked and terms are unticked, the errors show and a heart still floats up (see 6b-payment-errors.png, left of the CTA). The signature motion has to mean "your order went through". Fix: remove `data-pop` from `#confirmBtn` (line 416) and call `DC.heartPop($('#confirmBtn'))` inside the submit handler only after validation passes (next to where it sets `b.disabled = true` at about line 832).

2. **The "Placing your order…" busy state fails contrast.** `b.disabled = true` picks up ds.css `.dc-btn[disabled]{opacity:.5}`. That puts white text on a washed-out red over cream at about 2.4:1 (see 7b-placing.png). Fix: don't use the `disabled` attribute for the busy state. Set `aria-disabled="true"` and `aria-busy="true"`, block a second submit with a JS flag, and keep the CTA at full opacity so white on red stays at 4.6:1. Optionally add three small typing dots after the label. Reduced motion should make them static.

3. **Card back shows the Arabic "؟" in English.** The `.dc-qcard__disc` text is hard-coded `؟` at line 576 (the empty-cart card) and line 860 (the confirmation cards). In en it reads as a backwards question mark. Fix: use `t('؟','?')` in both places.

Optional polish, not blocking: at 390 the en confirmation title breaks as "Thank you, we / have your order". Add `text-wrap: balance` to the done h1.

## journey

Round 2 review of journey.html: close, but not approved yet. I ran it myself at 390 and 1280, in ar and en, Cream and Night, 3D and webgl=off, plus the shared view. There were no console errors and no horizontal overflow. The round-1 behaviours all check out: the undo toast, stable sound aria-label, focus moving to the prompt and then the card, 1/2/3 keys, the share URL, reduced motion, and .dc-ph at 5.42 and 10.97. Error text uses --red-text, as the brand requires. Please fix these, most important first.

1. RTL bug, must fix. In the Arabic gate dialog the help example "059 000 0000" renders as "0000 000 059". In an RTL paragraph each space-separated digit group becomes its own run, so the groups come out in reverse order (seen in the 1280 Night gate shot).
   - Wrap the number in Unicode isolates in all three places the ar string appears: line 386 (data-ar and the initial text) and line 974 (both the setAttribute and the textContent call). Use "\u2066059 000 0000\u2069", or switch to data-ar-html with <bdi dir="ltr">.
   - Do the same for the email so the order is stable.
   - Check it in the ar dialog in both themes and after an error then a valid submit.

2. 3D table shadow looks like an artifact, must fix. `blob(world, 2.2, 0, 0)` at line 593 is a CircleGeometry with 24 segments, 13% navy, hard edges. You can see the facets, and it reaches well past the tabletop, so it reads as a dirty grey polygon on the rug in every frame (clearest in the 1280 intro and stop 3).
   - Replace `blob()` with a plane using a soft radial-gradient CanvasTexture: alpha about 0.16 at the centre fading to 0 at the edge, depthWrite false.
   - Table shadow: radius about 1.7.
   - Pawn shadows: shrink from 0.62 to about 0.42 with the same soft texture. They currently spill off the rug onto the cream ground as grey discs (left and right pawns in the intro, the right-front pawn at stop 5).

3. The "you" pawn is covered by the choice panel, should fix.
   - In the 1280 Night flat view at stop 3, the red figure is cut in half by the panel top.
   - In 3D at stop 3 its base and the rug bottom touch the panel edge (about y 488 against a panel top of 490).
   - Fit the scene into the band between the top pills and the panel's top edge, with at least 16px clearance. For 3D, use camera.setViewOffset or shift the camera target by that band. For the flat view, adjust the SVG viewBox or translate. Recheck stops 1 to 5 at 1280 and 390 in both render paths.

4. Focus ring, polish. #jr-reveal shows a square focus outline around the rounded card, visible on the face-down card at 390 and 1280. Give the button the same border-radius as .dc-qcard so the 3px focus ring with 3px offset follows the card's shape.

5. Type, polish. "The Question-Keeper" wraps at the hyphen on both the card and the H2 ("The Question-" / "Keeper") at 390 and 1280. Use a non-breaking hyphen (U+2011) or drop the hyphen.

6. Status pill, polish. The spacing around the separator in the #jr-where pill is uneven: "Stop 3 of 5  · The first card" in the en render, and "المحطة 4 من 5· التحدي" in textContent. Use a single space on each side of the · in both languages.

7. Copy, polish. In en stop 3, choice 2 reads "I ask the person beside me: and yours?". Change it to "I turn to the person beside me: “And you?”".

The rest is approved and needs no changes: hierarchy, RTL mirroring of the progress bar, trait bars and actions, Night palette, the shared-view note and "Take the journey yourself" CTA, the box deep-links, and the restrained motion (deal, flip, brush draw-on, heart). After fixes 1–3, re-shoot the gate (ar, both themes), the 1280 intro, stop 3 and stop 5 in 3D and flat, and zoom crops of the rug and shadows, then send for round 3.

My screenshots and the script that made them are in C:/Users/Obaida/AppData/Local/Temp/claude/D--Personal-Projects-DardaChat-E-store/cfc33bd4-3b2e-41e4-a1a5-1a97ff71ec91/scratchpad/jr2/s/ (z-help.png, z-intro.png, z-stop3.png, flat-1280-stop3.png, 1280-en-light-4facedown.png).

## assistant

Round 2 review of D:/Personal/Projects/DardaChat-E-store/design/prototypes/assistant.html. I checked it again in Playwright at 360, 390, 768, 1280 and 1440, in ar and en, in Cream and Night, and with reduced motion on. The checks are in _build/asst-sup2.cjs and _build/asst-sup2b.cjs, run from web/, and the shots are in the scratchpad folder asv2/.

**Verified:** All six Rev 1 fixes hold.
- **Brush:** It runs edge to edge in all 8 combinations and sits inside the header: 4–388 on the 0–390 header in ar, 874–1260 on 872–1264 at 1280 in en. It is mirrored in RTL and draws in once, only on the first open.
- **Overflow and errors:** Page overflow is 0 at every width. The log has no horizontal overflow and there are no console errors.
- **Contrast:** Every text in the panel passes AA in both themes. The smallest are the 12px source link at 5.55 (Cream) and 5.31 (Night), and the white label on the red "Book on WhatsApp" button at 4.63. There is no small red text, and in Night the ₪ is ink, not red.
- **Keyboard and focus:**
  - The launcher opens with Enter and focus lands in the input. Escape closes and focus returns to the launcher.
  - "Ask the assistant" sets aria-expanded and opens the panel.
  - On phones #page is inert and Tab cycles inside the sheet.
  - Tapping an in-page source on a phone closes the sheet and focuses #contents.
- **Language switch while an answer streams:** It settles without a stuck typing indicator, and the chips re-enable.
- **Reduced motion:** The panel opens instantly and answers appear with no streaming.
- **Copy and motion:** The ₪ amounts, the "18+/12+" chips and the English contractions are correct. Nothing reads as a generic AI look.

**Required fix (RTL correctness, one item):** Typed text that doesn't match the page direction is laid out in the page's direction, so its punctuation lands in the wrong place.
- **Repro:** at 1280 in en, type "what is inside?", then switch to ar. The user bubble shows "?what is inside". The input has the same problem when someone types Latin script or Arabizi on the ar page.
- **Fix:**
  1. Add dir="auto" to `<input id="asst-in">` (line 255).
  2. In addTurn, set `bubble.dir = 'auto'` on the `m.role === 'me'` bubble (line 415).
  3. Keep the bubble's placement logical (justify-items:end already does this), so only the text's own direction changes.
  4. Re-shoot one ar frame at 1280 with an English question, e.g. `?lang=ar&open=1&ask=what%20is%20inside%3F`, and confirm the bubble reads "what is inside?".

**Optional polish (not blocking):**
- **(a)** When a source link jumps to #contents on a phone, briefly highlight the list, for example a 600ms inset sky outline that fades and is skipped under reduced motion. Focus moves to it now, but nothing shows the reader what was cited.
- **(b)** The ar subtitle says "…بأي وقت" ("anytime") but the en one is only "Automated · team on WhatsApp". Either add "anytime" to en or drop it from ar so the two match.
