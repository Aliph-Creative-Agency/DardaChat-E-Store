# Team DESIGN — animated interface prototypes (requested by Obaida 2026-09-29)

Goal: high-craft, animated, clickable HTML prototypes of the Dardachat storefront screens, built ON the approved
design system, so Obaida can brainstorm the front end. Not production code; nothing here touches `web/` or any team branch.

**Inputs (read, don't modify):**
- Brand spec: `D:/Personal/Projects/DardaChat-E-store/.orchestration/DESIGN.md`
- Design system source (tokens, component CSS, brand book, 13 components with previews):
  `C:/Users/Obaida/AppData/Local/Temp/claude/D--Personal-Projects-DardaChat-E-store/cfc33bd4-3b2e-41e4-a1a5-1a97ff71ec91/scratchpad/ds/project/`
  (`README.md` brand book incl. Motion rules, `tokens.json`, `components/bundle.css`, `components/<Comp>/preview.html`).
  Published view: https://claude.ai/artifact/3S8zv14hbuKa78Kye9HbKn
- Client assets: `D:/Personal/Projects/DardaChat-E-store/assests/` (palette image; Canva screenshot — logo banner region
  x 595–1315, y 104–320; lockup x 800–1110, y 135–305). Never use the Childos DEMO font.

**Output:** `D:/Personal/Projects/DardaChat-E-store/design/prototypes/`
- `assets/` (logo crops made with Python PIL from the screenshot), `ds.css` (tokens.json compiled to CSS custom properties for
  the Cream theme + `[data-theme=dark]` Night overrides, then bundle.css), one self-contained `<screen>.html` per screen,
  `index.html` gallery linking every screen with a one-line description, `NOTES.md` (design decisions, what's placeholder).
- Every screen: Arabic RTL default with a working ar/en toggle (mirrors layout), mobile-first and responsive 360–1440px,
  uses only the design-system tokens/fonts, real brand copy from DESIGN.md §6–§7 (no lorem ipsum), keyboard accessible,
  `prefers-reduced-motion` respected, no external network beyond Google Fonts and cdnjs (GSAP from cdnjs allowed for
  orchestrated motion; three.js from cdnjs allowed for the Journey scene only).

**Screens (one designer each):**
1. `home` — blue logo band with brush strokes drawing on, hero line, "draw a card" deal-in + flip (QuestionCard), the four boxes, services teaser, a brand quote banner, footer with contact.
2. `shop` — listing of the 4 boxes with filter chips (audience/age/season), ProductCard hover lid-tilt, out-of-season Ramadan state, cart-count bump + heart pop on add.
3. `product` — «صندوق دردشات مع الحب»: gallery (placeholder art), what's-in-the-box as an animated exploded list, sample question cards to flip, price + VAT, sticky add-to-cart on mobile.
4. `cart-checkout` — slide-in cart drawer, then the 4-step checkout (StepIndicator) with the address form (6 fields, phone LTR), delivery zone choice, payment method incl. cash on delivery, confirmation with a celebratory (tasteful) moment.
5. `services` — workshops, sessions, game nights with ServiceCards, prices from DESIGN.md §7, WhatsApp booking buttons, scroll-revealed sections.
6. `journey` — intro (disclaimer, sound off, WebGL probe message variant), one playable scene (lightweight three.js table-and-cards scene in the palette) with the JourneyChoice chrome, and a result card with share/save gate. Placeholder content marked as such.
7. `assistant` — any page with the assistant widget opening (disclosure, streamed answer with source, typing dots, escalate to WhatsApp).

Signature motion (from the brand book): deal & flip, brush draw-on, heart pop — used where they mean something; everything
else quiet. Avoid generic AI looks (purple gradients, glassmorphism, emoji, identical cards everywhere).
