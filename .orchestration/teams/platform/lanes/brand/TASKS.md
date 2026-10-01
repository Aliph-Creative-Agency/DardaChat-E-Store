# Tasks — platform / lane brand (2026-09-29) — on `main` in ROOT, ports DB 54320 / web 3000

Spec: `ROOT/.orchestration/DESIGN.md` (approved by Obaida). Scope: PLATFORM-owned files only (globals.css tokens,
`src/lib/shell/**` incl. fonts.ts, header/footer/store-nav/admin shell, `messages/*/common.json`, `web/public/brand/**`,
favicon/app metadata). Do not touch module files owned by Phase 1 teams — they rebrand their own files (tasks already queued).
Phase 1 teams will `git merge brand-v1` into their branches, so keep this a small, clean, token-level change.

- [x] **BRD-01 Palette tokens** (model: sonnet) [done: tokens.test.ts 47 pass; tsc clean; shell-a11y.spec 31 pass (axe 0 violations 375+1440 ar/en)] — replace brand/ink/paper/accent values in `src/app/globals.css` with the
  DESIGN.md §2 palette (cream bg, blue primary, red accent, pink + light-blue soft surfaces, dark navy body text);
  keep token NAMES stable so existing components keep working (add `accent`/`pink`/`sky` tokens as needed; retire
  saffron/olive by remapping). Buttons: primary = blue, CTA variant = red with white text. Focus ring blue.
  Check: `npm run verify` green; axe WCAG 2.2 AA shell spec passes (0 violations) at 375 and 1440 in ar + en;
  a contrast unit test asserting the DESIGN.md pairs (blue/cream ≥ 7, white/red ≥ 4.5, body text/cream ≥ 7).
- [x] **BRD-02 Typography** (model: sonnet) [done: playwright computed style on /ar,/en dev/ui: h1/h2 Baloo Bhaijaan 2, body+price Plex; PriceTag pins font-sans] — display font → Baloo Bhaijaan 2 via next/font/google behind `--font-display`
  (Reem Kufi removed); body stays IBM Plex Sans Arabic/Plex; ensure prices/numerals never use the display font. Do NOT
  add the Childos DEMO file to the web app. Check: computed styles show Baloo on h1/h2 and Plex on body/prices in both locales.
- [x] **BRD-03 Name + contact** (model: sonnet) [done: grep of platform paths clean (remaining old spellings only in catalog/engagement/storefront module files); messages test + tsc green; shell-store e2e footer contact spec passes] — every PLATFORM-owned string/metadata: Latin "Dardachat", Arabic «دردشات»
  (common.json both locales, <title> template, manifest/metadata, README mentions, auth/otp platform texts if platform-owned).
  Footer contact block: Beit Hanina – Jerusalem, 0543992424 (tel: +972543992424), dardchat.2023@gmail.com, Instagram
  @dard_chat (https://instagram.com/dard_chat), WhatsApp link. Check: grep of PLATFORM-owned paths finds no "DardaChat"
  or «دردشة» as the brand; tests updated.
- [x] **BRD-04 Logo placeholder + header/footer + nav** (model: sonnet) [done: platform e2e 49+6 pass incl. axe; screenshots ar/en 375/1280/1440 reviewed; BACKLOG logo entry exists] — crop the logo banner from
  `ROOT/assests/screencapture-canva-design-DAGRC6fkKKQ-y-0zWgKc-SS2MkWwD047vw-view-2026-09-29-21_04_07.png`
  (region x 595–1315, y 104–320; the mark+wordmark is roughly x 810–1100) into `web/public/brand/` (logo-banner.png,
  logo-mark.png, optimised WebP too) — also build an inline SVG/text fallback (finger-heart ♥ mark + «دردشات» + "Dardachat")
  so the header is crisp at any size; favicon from the mark. Header: logo, nav = Games · Workshops · Sessions · Game nights ·
  The Journey · About · Contact (hrefs to `/[locale]/pages/workshops|sessions|game-nights|about|contact` — CATALOG seeds
  those pages; until then they 404 in your branch, that's fine), search, locale switch, account, cart. Decorative
  brush-stroke SVG component (pink on blue / blue on cream) exported from `src/lib/shell/` for teams to reuse.
  Mark the raster logo PLACEHOLDER in BACKLOG. Check: e2e shell specs green; screenshots at 375/1440 ar+en look on-brand.
- [x] **BRD-05 Wrap-up** (model: sonnet) [done: tsc clean, eslint . clean, vitest 791 (2 timeouts only under e2e load, pass alone), playwright 90+ pass, load-flaky auth/a11y/admin specs re-run green; FOUNDATION-NOTES Brand section added; tag brand-v1] — update FOUNDATION-NOTES.md "Brand" section (tokens, fonts, logo, brush
  component, contrast rule), run `npm run verify` + full `npm run test:e2e`, commit, `git tag brand-v1`.
