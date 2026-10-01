# Worker A review: home, shop, product
Read first: design/system/README.md + tokens.json (warning token 4.9:1 on its grounds; red never small text), PLAN, BRIEF.

## Matrix checked
Pages home/shop/product x 390 and 1440 x ar and en, Cream; plus Night at 1440 (ar). Scripts: scratchpad/worker-A/.
- Console/page errors: none. Failed requests: only the Google Fonts cert error (offline, ignored). No CDN loads.
- Horizontal overflow: none in any combination. dir=rtl in ar, ltr in en. RTL mirroring looked right on the home shot.
- Contrast/small red text: scripted check of all visible text found no red small text and no AA failures, except the .dc-ph chip below.
- Links: all 22/17/16 internal hrefs and #anchors resolve (no broken ones) at both widths.
- Interactions OK: home draw-card changes the question, home menu opens on mobile, add-to-cart (home/shop/product) bumps the count and shows a toast, shop filter chips filter, product gallery arrows and sample question card flip (is-flipped), cart link opens cart-checkout.

## Issues
1. FIXED: home "add to cart" kept its own local counter, so a box added on home was lost on shop/product (and shop/product carts did not show on home). home.html:~740-748 now reads/writes the shared sessionStorage `dc-proto-cart` (same shape as shop/product), plus data-id on the three add buttons (dardachat/whoamong/love). Verified home -> shop -> home count carries. No visual change, so no screenshots re-shot.
2. LEFT (shared ds.css:319, read-only): `.dc-ph` placeholder chip is warning (#8a5a00) on surface-sunk, measured about 4.42:1 at 11px, just under AA 4.5 (token claims 4.9). Seen on product ("سعر تجريبي", "رسم مؤقت"). Suggest a slightly darker light-theme warning or a white-ish chip background.

## Remaining concerns
- Cart-checkout does not read `dc-proto-cart` (it has its own seeded cart), so counts from these pages do not show as lines there. That is Worker C's file.
- Not checked: pixel-level visual review of every section in Night; the Night contrast script passed.
