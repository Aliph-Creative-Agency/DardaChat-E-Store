# Supervisor verdicts: client-demo, one review round

## Worker A (home, shop, product): APPROVE

- The checks cover the full matrix: 390/1440 × ar/en, plus Night. No console errors, no overflow, RTL correct, internal links resolve, key interactions work.
- Fix 1 (shared session cart on home) is reviewed and correct. `home.html` ~740–748 uses the same `dc-proto-cart` shape `{total, lines}` as shop/product and is try/catch guarded, so it degrades to a local counter when storage is blocked. There is no visual change, so no re-shoot is needed.
- Shared item (1), the `.dc-ph` contrast, is **fixed by the supervisor** in `ds.css:319–320`. The chip background changed from `--surface-sunk` to the DS token `--surface`, so `--warning` text is now about 5.5:1 in Cream (was 4.42) and over 8:1 in Night. The outline still marks it as a tag. The edit is commented in the file. Note: `ds.css` here is a copy of the generated prototype file; the same fix should go into `design/system` / `_build/build_ds.py` later.
- Shared item (2), cart-checkout reading `dc-proto-cart`, is assigned to Worker B by the orchestrator. Watch for this: the home/shop/product line ids are `dardachat`, `whoamong`, `love`, `ramadan`, while cart-checkout seeds `{ chat: 1, love: 1 }`. B must map `dardachat`→`chat` and `whoamong`→`who` (`love` and `ramadan` already match; cart-checkout also has `jer`). When the session cart is empty, B must keep the seeded two-box cart, because the demo script relies on it.
- No revise round needed.
