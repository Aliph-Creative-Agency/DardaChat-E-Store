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

# Copy pass (against _review/VOICE.md)

## Copy B (cart-checkout, services): APPROVE

- Scripted audit of every `data-ar`/`data-en` string and every JS `t('ar','en')` pair in both pages: no exclamation marks, no emoji, no hype or urgency words, no «ورش» (always «ورشات»), no «شريك الحياة», no «ابتداءً», no «حضرتك», no colloquial UI words (شو/بدك/لما/عندك/راسلنا…), and the brand is always spelled "Dardachat". The initial Arabic text matches `data-ar` everywhere (0 mismatches).
- Facts are unchanged against `design/prototypes/`: every ₪ price and every `wa.me/972543992424` link is identical. Duration «ساعة واحدة»→«ساعة» and «للمجموعة الكاملة»→«للمجموعة كاملة» follow the client's spelling.
- Voice matches §2: services use the plural (تواصلوا، تصفحوا), checkout uses the singular and MSA (هل لديك رمز خصم؟، أبلغني عند عودته), and specs use label lines (التكلفة:، المدة الزمنية). The client's words are used: توت باج، تنسيق الورود، تشكيل الصلصال، الأزواج والشركاء، صناديق الألعاب. The fixed CTA «احجز عبر واتساب» is kept.
- Minor, accepted: «التكلفة: من» keeps a "from" sense where the price is a minimum. It is factual and not salesy, so no change.
- No revise round needed.

## Copy A (home, shop, product): APPROVE

- Same scripted audit as B: no "!", emoji, hype, «ورش», «شريك الحياة», «ابتداءً» or «حضرتك», no colloquial UI, and "Dardachat" spelled correctly. The only colloquial hit is the sample question card «شو أول شي لفت نظرك فيّ…» on product, which VOICE §2 allows. The initial text matches `data-ar` everywhere (0 mismatches).
- Facts compared with `design/prototypes/`: home and product are identical (₪, ages, wa.me links). Shop's only change is the workshop teaser price (3 copies: text, `data-ar-html`, `data-en-html`).
- **The fact change is ruled correct and kept: ₪100–180.** DESIGN.md §7 and `services.html` list the workshop per-person prices as 100 / 120 / 130 / 100 / 180 / 150, so the range is accurate. Home (`₪ 100–180 للفرد`) and the assistant (`100 إلى 180 ₪ للشخص`) already said this, and it avoids «ابتداءً من». After the change all pages agree. (Sessions and game nights stay at ₪70 per person everywhere.) A broke the "no fact changes" rule here, but in the direction of consistency, so it is accepted.
- Voice follows the client: «صناديق الألعاب», «الفئة المستهدفة / الفئة العمرية», «الجمعات العائلية»، «الأزواج والشركاء», «محتويات الصندوق», «مخصص لـ / مصمم لـ», «للتواصل: واتساب», «توت باج / تشكيل الصلصال / تطريز فلسطيني».
- No revise round needed.

## Copy C (journey, assistant, index): APPROVE

- Scripted audit (supervisor #2, `scratchpad/audit_c.py`) of every `data-ar`/`data-en`(`-html`) string, every `t()`/`DC.t()` pair and every `ar:`/`en:` literal (journey 140, assistant 84, index 82 strings): no "!", no emoji, no hype or urgency, no «ورش» (always «ورشات»; the one hit was «ورشة», a false positive), no «حضرتك», «ابتداءً» or «شريك الحياة», and the brand is always "Dardachat". The initial Arabic text matches `data-ar` everywhere (0 mismatches in all 3 pages).
- Colloquial words remain only where VOICE §2 allows them: the Journey game prompts and choices (`SCENES` `q`/`c`, journey ~416–432) and the assistant `re:` trigger regexes (assistant ~323), which must keep matching what users type. All UI, answers, notices and index copy are MSA.
- Facts are unchanged against `design/prototypes/`: every number in all 3 pages diffs clean except packaging/QA items (vendored three.js `r128` URL, the `4.4:1` CSS comment); ₪ amounts (70 / 500 / 1400 / 100–180), `+972 54 399 2424` and `wa.me/972543992424` are identical.
- Nav: C's report says Journey was renamed to «الألعاب / Games», but the file now reads «الصناديق / Boxes», which is the label home, shop, services, cart-checkout and assistant all use. So it is consistent, and no change is needed. (The Journey's shorter 3-link nav is structural from the prototype and is not a copy issue.)
- Chromium check (`pw/chips.cjs`, 1440, ar and en, 0 page errors): «ما محتويات الصندوق؟», «ماذا تنصحون لجمعة الأصدقاء؟» and «كم سعر الجلسة؟» (and their EN versions) all still get a scripted answer after the move to MSA. The 4th chip, «كم يستغرق التوصيل؟», goes to the WhatsApp escalation **by design** (the `OOS` regex covers توصيل/delivery: "never guess, escalate to the team").
- Small fixes by the supervisor in `assistant.html`: the source label «صفحة الألعاب» became «صفحة صناديق الألعاب» (×2, ~286–287), to match the shop page heading and nav. «من 20 إلى 25 مشارك» became «مشاركًا» (accusative, ~316). The chips were re-tested after the edit.
- No revise round needed.

## Photos (round 1, ~120 px Canva crops): provisional, superseded by the high-res swap in progress

The rendered size was measured in Chromium (`scratchpad/pw/photochk.cjs`, DPR 2, 390 and 1440). Upscale is display CSS px ÷ natural px.
| Slot | Upscale (390 / 1440) | Decision |
|---|---|---|
| home Dardachat main card | 3.9× / 6.3× (crop shows only the box base) | reverted to drawing |
| home Who Among Us card | 2.1× / 1.8× | reverted to drawing |
| shop Dardachat + Who Among Us cards | 1.9–2.0× / 2.9–3.1× | reverted to drawing |
| product ?box=dardachat slides 1–4, ?box=whoamong slide 1 | 3.0–4.2× / 4.8–6.7× | reverted to drawing; the «رسم مؤقت» tag comes back automatically |
| services ws-gift card | 1.1× / 2.7× | reverted to drawing (section tag «رسوم تجريبية» covers it) |
| home service tickets (sessions, game nights, workshops) | 1.0–1.15× | **kept** (sharp enough at 92 px, real alt text, no placeholder tag) |

How it is reverted (the wiring is kept): `data-photo-off` on the 5 slot containers (home ×2, shop ×2, services ×1), plus a 2-line rule at the end of `ds.css`, plus `PHOTOS_ON = false` in `product.html`. **To turn the photos back on with hi-res files:** delete every `data-photo-off` attribute and set `PHOTOS_ON = true`.
_Round 1 is superseded. Worker #2 removed all `data-photo-off` attributes and `PHOTOS_ON`, and the supervisor deleted the now-dead gate rules from `ds.css`._

## Photos (round 2, Obaida's hi-res screenshots): APPROVE, with 2 supervisor fixes

- **Sharpness:** every photo slot was measured in Chromium at 390 and 1440 (`scratchpad/pw/photochk.cjs`, home, shop, product ×4 boxes, services). The largest upscale is **0.99× CSS px** (the product main slides and the home Dardachat card at 1440). Everything else is downscaled (0.04–0.78×). On a 2× retina screen the biggest slides are about 2× device px: slightly soft up close, but clean at normal viewing. No pixelation anywhere.
- **Fix 1, gallery layout bug (`product.html` ~68–71):** `.dc-pdp-slide`/`.dc-pdp-thumb` are centring grids, so the photo's `height:100%` fell back to its natural ratio. Portrait photos came out 447–867 px tall inside 268–573 px stages and were cropped by `overflow` instead of `object-fit`, so `is-contain` was silently ignored (for example, the Who Among Us instructions at 1440 were cut off). The photos are now pinned to their box (`position:absolute; inset:0`), and cover/contain behave as the worker meant.
- **Fix 2, Ramadan crop:** `ds.css` (last rule) now sets `img[src$="box-ramadan-game.jpg"] { object-position: 50% 90%; }`, which keeps the cards in frame in the shop square, the home card and the 4:3 product stage at 390 (before, only the lights and wall were visible). Verified in `03d-product-ramadan_mobile-390_*`.
- **Alt text:** every `<img>` has `alt` plus `data-ar-alt`/`data-en-alt`, and the product alts are generated as "slide name · box name". The services banner alts («بانر جلسات دردشات», "… banner") are acceptable but generic; describing what is in the photo would be better (open, minor).
- **Placeholder tags:** no «رسم مؤقت» tag shows on real photos (product `phTag` hides it whenever the slide has an img). The section-level «تجريبي» tags on home and shop now refer to prices, and the copy there says this. The Ramadan note «تصميم مؤقت · سيُعاد تصميم هذا الصندوق» is shown in `.dc-ph` style on home, shop and product.
- **Layout:** the final rerun has 0 overflow, 0 console errors and 0 failed requests in all 60 shots.
