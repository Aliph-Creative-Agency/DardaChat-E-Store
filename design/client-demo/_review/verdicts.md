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
