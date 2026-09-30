Dardachat («دردشات») makes boxed conversation games from Jerusalem — question cards, challenge cards and the props to play them — plus workshops, dialogue sessions and game nights. The site sells the boxes, shows the services, and hosts the Journey. Everything here serves one feeling: *friends around a table, talking*.

## Content fundamentals

- **Arabic first, and warm.** Arabic is the default locale and the voice of the brand; English is a faithful second. Write the way the brand writes: first-person plural «نحن في دردشات…», short sentences, everyday words. Journey prompts, card samples and the assistant may use friendly Levantine («شو بتعمل؟», «بدي»); product descriptions, policies and checkout use clear Modern Standard Arabic.
- **Name things the way people say them:** «صندوق دردشات», «صندوق مين فينا», «صندوق رمضان للعائلة», «صندوق دردشات مع الحب»; «الورشات», «الجلسات», «ليالي الألعاب». Latin name is exactly **Dardachat**.
- **Say what's in the box.** Counts are content: «45 بطاقة مقسّمة إلى 3 مراحل», «20 قلب كريستالي». Always show age and audience: «+12 · للجمعات العائلية والأصدقاء», «+18 · للأزواج».
- **Real lines from the brand, not invented slogans:** «مفتاح المعرفة هو السؤال» · «قبل ما نتعمق بمعرفة الأشخاص من حولنا مهم نتعمق في معرفة ذاتنا» · «دردشات تأخذنا خطوة إلى الوراء في الزمن لنرجع ذكرياتنا الدافئة من جديد».
- **No emoji** in UI copy. No urgency tricks, no exclamation-mark stacks. Errors say what happened and what to do.
- Numbers, prices, phone numbers and order references use Latin digits, isolated LTR inside Arabic (`dc-num`).

## Visual foundations

- **Colour.** Five client colours carry the brand: `cream` ground, `blue` primary, `red` accent, `pink` and `sky` soft surfaces. Body text is `ink` (a deep navy drawn from the blue), never pure black. Blue owns the header band, primary buttons, links and selected states. Red is the one hot spot per view: the add-to-cart / booking CTA (white text), the question-card disc, the Ramadan chip, progress. **Red is never small text** — use `red-text` when an error or note must be red. `brush` pink is decoration only (brush strokes, blobs, the nav underline on blue).
- **Themes.** `Cream` is the brand. `Night` swaps the ground to deep navy and lightens `blue` so it still reads; soft surfaces become muted plum and dusk blue with light ink.
- **Type.** Headings in `display` (Baloo Bhaijaan 2: rounded, playful, full Arabic) — `display-hero` once per page, `display-1/2/3` down the hierarchy, `quote` for brand lines. Everything else in `sans` (IBM Plex Sans Arabic + Plex Sans): `body`, `body-lg`, `small`, `label`, `price`. Prices never use the display face. Never letter-space Arabic. The client's Childos Arabic is the intended display face once licensed; only a DEMO exists (digits are watermarked), so it is not used.
- **Shape.** Soft, rounded, physical: `radius-md` for card-like things (the real cards are softly rounded squares), `radius-lg` for panels and product cards, `radius-pill` for buttons and chips. Borders only where a boundary is functional; resting cards sit on `shadow-card`, lifted ones on `shadow-lift`.
- **Spacing.** 4px base: `space-4` card padding and minimum phone gutter, `space-7`/`space-8` between sections (phone/desktop).
- **Layout.** RTL-first with logical properties only; everything mirrors in English. Mobile first (320px up). Content max-width 1200px; product grids 2 columns on phones, 3–4 on desktop.
- **Imagery.** The client's product photos (bright boxes and cards held in hands, groups playing outdoors) once full-size files arrive; until then, flat placeholder box art in the palette. Illustrations are flat, friendly, blob-backed — never 3D renders or stock gradients.

## Motion

Motion is how the site feels tactile, like handling cards. Three signature moments, each used where it means something:
1. **Deal & flip** — question cards deal in (staggered, spring) and flip to reveal (`dur-flip`, `ease-spring`). Home page "draw a card", product sample questions, empty states.
2. **Brush draw-on** — the logo band's pink strokes paint themselves in once (`dur-draw`).
3. **Heart pop** — a small heart floats up from an add-to-cart button (the finger-heart of the logo).
Everything else is quiet: hover lifts (`dur-base`, `ease-out`), a cart-count bump, messages sliding in. Spring easing only on objects that are "things" (cards, boxes, the cart count). Every animation honours `prefers-reduced-motion` by cutting to the end state; nothing essential is only visible mid-animation.

## Iconography

- **Logo:** the Arabic wordmark «دردشات» with the finger-heart hand above, "Dardachat" beneath, on the blue band with pink brush strokes (see Logos). The files here are crops of the brand-profile screenshot — **placeholders until the client supplies SVG/transparent PNG**.
- **Icons:** no icon set was supplied. Use simple 1.8px-stroke rounded line icons in `currentColor` (bag, chat, heart, search, user, globe), 20–24px. Flagged as a substitute.
- The heart is the one brand glyph used in UI (heart pop, the box art).

## Accessibility

Storefront targets WCAG 2.2 AA. Every text token's note lists its contrast on the grounds it is used on; keep to those pairs. Focus is a 3px `focus` ring with 3px offset. State is never colour alone (chips carry words, errors carry text). Choices, cards and flips are real buttons, keyboard operable.
