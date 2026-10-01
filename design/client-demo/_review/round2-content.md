# Round 2, content lane
## Sambousek or Qatayef («سمبوسك ولا قطايف»), placeholder
- home.html: new dashed "coming soon" row card after the Love box (chip «لعبة جديدة», name, `.dc-ph` «قريبًا · التفاصيل قيد الإعداد», one factual line, no price). Links to product.html?box=sambousek.
- shop.html: new grid item (`data-id="sambousek"`, audience none/age tbd, so it shows only unfiltered), notify button «أبلغني عند توفره» in place of add to cart, no price. Not in the cart catalog.
- product.html: new `BOXES.sambousek` (soon flag) rendered in the existing template: flat placeholder box art (pastry triangle and half-circle emblem), lede «لعبة جديدة من دردشات.», `.dc-ph` note, notify button, no price, quantity, add-to-cart, facts, contents or sample cards; sticky bar never shows. It also appears in "other boxes" as «قريبًا».
- Art is shared inline SVG in the design-system box style (tokens only).
## Workshop photos
- 8 distinct Unsplash photos in assets/photos/workshop-*.jpg (1200 px, q85); services cards now use them, with per-card alt (ar/en) and small object-position tweaks for portrait crops. cat-workshops.jpg stays only on the home ticket; banner-workshops.jpg untouched.
- Sources, photographers and licence recorded in _review/PHOTOS.md.
## Verification
Chromium 390 and 1440, ar and en, on home, shop, product (sambousek and love) and services: no page errors, no horizontal overflow. Shots in scratchpad content/.
## Notes
- Headings on home/shop still say "four boxes" (client wording); the new card is labelled a new game, so left as is.
- Two photos are weak stand-ins (goals board, empty hoop); swap when better ones are found.
- Header untouched.
