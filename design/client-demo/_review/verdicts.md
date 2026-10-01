# Supervisor verdicts: client-demo, one review round

## Worker A (home, shop, product): APPROVE

- The checks cover the full matrix: 390/1440 × ar/en, plus Night. No console errors, no overflow, RTL correct, internal links resolve, key interactions work.
- Fix 1 (shared session cart on home) is reviewed and correct. `home.html` ~740–748 uses the same `dc-proto-cart` shape `{total, lines}` as shop/product and is try/catch guarded, so it degrades to a local counter when storage is blocked. There is no visual change, so no re-shoot is needed.
- Shared item (1), the `.dc-ph` contrast, is **fixed by the supervisor** in `ds.css:319–320`. The chip background changed from `--surface-sunk` to the DS token `--surface`, so `--warning` text is now about 5.5:1 in Cream (was 4.42) and over 8:1 in Night. The outline still marks it as a tag. The edit is commented in the file. Note: `ds.css` here is a copy of the generated prototype file; the same fix should go into `design/system` / `_build/build_ds.py` later.
- Shared item (2), cart-checkout reading `dc-proto-cart`, is assigned to Worker B by the orchestrator. Watch for this: the home/shop/product line ids are `dardachat`, `whoamong`, `love`, `ramadan`, while cart-checkout seeds `{ chat: 1, love: 1 }`. B must map `dardachat`→`chat` and `whoamong`→`who` (`love` and `ramadan` already match; cart-checkout also has `jer`). When the session cart is empty, B must keep the seeded two-box cart, because the demo script relies on it.
- No revise round needed.

## Worker C (journey, assistant, index): APPROVE

- The checks cover the full matrix plus Night: no errors, no overflow, RTL correct, `vendor/three.min.js` loads, the WebGL fallback (`?webgl=off`) and the shared-result view work, the assistant chips and escalation work, and all 7 start-page links resolve.
- The `assistant.html:36` override `main .dc-ph { color: var(--ink); }` is **kept**. Since the ds.css fix (the chip now has an opaque `--surface` background) it is no longer needed, but it uses a token and passes AA in both themes, so it does no harm.
- The `home.html` raw `#7a4f00` is **cleaned up by the supervisor**. The rule is now `main .dc-ph { font-size: 11.5px; }` and the dark override is gone, so the colour comes from ds.css (`--warning` on `--surface`, about 5.5:1 Cream, over 8:1 Night). `.dc-home-drawrow .dc-ph` (white on blue band) is more specific and unaffected.
- C's 2x re-shoots of 10/11 mobile-390 ar are overwritten by the supervisor's full rerun, which is in progress. Shots affected by C's fix: 10/11 assistant, all sizes and languages (covered by the full rerun). Missing 06–09/desktop files are expected while the rerun is in progress.
- No revise round needed.

## Worker B (cart-checkout, services): APPROVE

- The checks cover the full matrix plus Night, the whole checkout flow end to end (validation, zone, payment, terms, confirmation) and the services WhatsApp links and cards. No errors, no overflow. Red is only used for `--red-text` validation copy with words, which is allowed.
- The shared-cart wiring (`cart-checkout.html` ~529–548) is reviewed and correct. The id map works in both directions, quantities are capped at MAX_QTY, the out-of-season Ramadan box is ignored, it is try/catch guarded, and it falls back to the seeded `{chat:1, love:1}` only when the session cart is empty, so the README script still holds. Accepted side effects: visiting the cart writes the sample cart back to the session (other pages then show 2, which is consistent), and after an order the next visit shows the sample cart again.
- The local `.dc-ph { color: var(--ink-soft) }` override is **removed by the supervisor**. ds.css now passes AA (`--warning` on `--surface`, about 5.5:1), and removing the override keeps the amber “sample” tag consistent along the whole shopping path in Cream and Night.
- Shots to rerun: 04 and 05, all variants (in the supervisor's final targeted rerun).
- No revise round needed.

## Final rerun

00–05, 10 and 11 at 390/1440 × ar/en, toolbar hidden. The results are in the supervisor's final report.
