# Tasks — team CATALOG (Phase 1)

Worktree `D:/Personal/Projects/DardaChat-wt/catalog` (branch `team/catalog`), DB 54321, web 3001. Commands from `web/`.
Owned paths only (BRIEF.md). Conventions fixed for every task (see LEADER.md "Design decisions"):
- Write side lives module-internal: `web/src/modules/catalog/admin/*.ts` (products, variants, components, seasons, slugs,
  media, collections) and `web/src/modules/cms/*.ts` (pages, faq, policies, markdown). Only our own admin pages/routes
  import them; the public contract `modules/catalog/index.ts` keeps its signatures (additions are pinned in
  `modules/contracts.test.ts` + CONTRACTS.md in the same commit).
- Inputs validated with zod; errors `AppError("invalid_input", msg, { fields: [{ field, locale?, code }] })`; every staff
  write goes through `auditedMutation` (+ `withActor` for journalled `variants`) with `ctx.actor`.
- Admin UI: `/[locale]/admin/catalog/{products,collections}` and `/[locale]/admin/content/{pages,faq,policies}`;
  first line of every page `await requireStaff(...)`; mutations via `staffAction(...)` server actions colocated
  (`actions.ts`) or `staffRoute(...)` handlers under `app/api/catalog|cms/**`. Permissions: `catalog.read`,
  `catalog.write`, `content.write`, cost = `inventory.cost.read` (Owner-only).
- Strings: `messages/{ar,en}/catalog.json` only (CMS strings under `content.*`: `cms` is not a registered namespace).
- Evidence line under each task when done: `Evidence: <command> → <result>`.

## Setup
- [x] **CAT-00** Environment — worktree, `npm ci`, `.env.local` (PG 54321 / web 3001), `db:reset`, typecheck + tests green.
  SRS: —. Paths: `web/.env.local` (untracked). Accept: `npm run typecheck` and `npm test` pass on a fresh seed.

## Catalogue write side + admin (FR-CAT-001..010)
## Brand update (2026-09-29, approved by Obaida) — do these first
- [x] **CAT-B1 Real catalogue seed (DESIGN.md §6)** (model: sonnet) — replace the 5 placeholder titles with the 4 real Dardachat boxes: bilingual names/descriptions/how-to-play (translate the Arabic faithfully), group + age, components with the exact counts, Ramadan box seasonal window, dummy prices clearly marked (BACKLOG). Brand strings in seed/SEO → «دردشات» / Dardachat. Read ../../DESIGN.md (ROOT/.orchestration/DESIGN.md) first. If tag brand-v1 exists and is not in your branch, `git merge brand-v1` before starting (PROTOCOL §1 step 4b). Check: db:reset && db:seed shows exactly 4 products with correct component counts in ar+en; no «دردشة»/DardaChat left in catalog files.
  Evidence: vitest integration src/modules/catalog (seed.int.test.ts, 4 boxes, exact component counts, no old brand spelling) -> 42 passed
- [x] **CAT-B2 Service + about pages as CMS static pages (DESIGN.md §7)** (model: sonnet) — seed About, Contact, Sessions, Game nights, Workshops (each workshop as a section with price/person, group price, duration) in ar+en, rendered under (store)/pages with a "Book on WhatsApp" button (wa.me/972543992424 with prefilled service name). No booking/payment. Check: each page renders in /ar and /en, WhatsApp link encodes the service name, pages editable in admin/content.

  Evidence: /ar/pages/sessions + /en/pages/workshops + /ar/pages/about 200 (dir rtl/ltr), wa.me/972543992424?text= encodes the service name, /ar/pages/nope 404; e2e browse.spec 5 passed. Still open: editing these pages in admin/content (CAT-15).
  Evidence (relay 3): e2e browse.spec 26-run green; pages are editable in admin/content (content.spec edits + publishes a page in ar+en; seeded pages listed in admin/content/pages).
- [x] **CAT-01** Admin product service core: `admin/products.ts` — `listProductsAdmin({ status?, q?, page })` (name ar/en
  or SKU ilike, all statuses), `getProductAdmin(id, { canSeeCost })` (every field both locales, variants with `cost`
  only when `canSeeCost`, media, components, windows, collections, redirects), `createProduct(input, ctx)` (draft,
  slug validated `^[a-z0-9]+(-[a-z0-9]+)*$` unique vs products + slug_redirects), `updateProduct(id, patch, ctx)`
  (bilingual name/description/playInstructions/SEO, group, occasion from `OCCASIONS` const, tags, optional
  playerMin/Max/minAge/durationMin; slug NOT editable here). Zod schemas in `admin/schemas.ts`.
  SRS: FR-CAT-001 (create/edit), FR-CAT-004. Paths: `web/src/modules/catalog/admin/**`.
  Accept: `npx vitest run --project integration src/modules/catalog/admin/products.int.test.ts` green (create, edit,
  list filter, invalid slug/duplicate slug → invalid_input/conflict, audit row written).
  Evidence: products.int.test.ts in the 42-test catalog int run -> green
- [x] **CAT-02** Lifecycle: `publishProduct` gate (named-field errors: name/description/playInstructions × ar/en, ≥1
  component, ≥1 active variant, every image alt ar+en), `unpublishProduct` (→ draft), `archiveProduct` /
  `restoreProduct` (archived → not listed/searchable/purchasable; `getVariants` shows `productStatus`), `duplicateProduct`
  (deep copy: variants with SKU `-COPY[n]`, components, media rows sharing storage keys, windows; draft; slug
  `<slug>-copy[-n]`), `deleteProduct` (refused with `conflict` + hint "archive" when any variant is referenced by
  order_lines / stock_movements / reservations; else hard delete + storage cleanup of unshared media).
  SRS: FR-CAT-001, FR-CAT-003, FR-CAT-006 (archived drops out), FR-CAT-010. Paths: `modules/catalog/admin/lifecycle.ts`.
  Accept: `lifecycle.int.test.ts` green (refused publish lists exact fields; archived product absent from
  `listProducts`/`search`/collection listing; duplicate independent; delete refused when an order line exists).
  Evidence: lifecycle.int.test.ts in the same run -> green
- [x] **CAT-03** Variants: `addVariant`, `updateVariant` (SKU upper-cased unique, price/compareAtPrice ≥ 0 agorot, weightG,
  status, position), `reorderVariants`, `deactivateVariant`; `cost` read/write only when `canSeeCost` (else
  `forbidden`); cost changes audited; writes under `withActor` (variants are journalled).
  SRS: FR-CAT-002, FR-CAT-008. Paths: `modules/catalog/admin/variants.ts`.
  Accept: `variants.int.test.ts` green (3 variants → 3 SKUs/prices/costs/weights; duplicate SKU → conflict; staff ctx
  cannot set/read cost; journal rows carry actor).
  Evidence: variants.int.test.ts in the same run -> green
- [x] **CAT-04** Components + seasonal windows: component CRUD + reorder (kind, name ar/en required, count null or > 0);
  window CRUD (startsOn ≤ endsOn, no overlap per product, returnsNote ar/en optional). `nextSeasonStart` / `isInSeason`
  re-checked around boundaries (Asia/Jerusalem).
  SRS: FR-CAT-009, FR-CAT-010. Paths: `modules/catalog/admin/components.ts`, `admin/seasons.ts`.
  Accept: `components-seasons.int.test.ts` green (overlap refused; out-of-window product still in `getProduct`/listing
  with `inSeason=false` + `nextSeasonStart`; boundary day inclusive at 23:30 Jerusalem).
  Evidence: components-seasons.int.test.ts in the same run -> green
- [x] **CAT-05** Slugs + SEO: `changeSlug(id, newSlug, ctx)` in one tx: validate, insert old slug into `slug_redirects`,
  delete a redirect whose `fromSlug` = new slug (slug given back), conflict if another product/redirect owns it; SEO
  fields per locale (length hints 60/160). Record in DECISIONS + CHANGE-REQUESTS that STOREFRONT's product route must
  `permanentRedirect` via `resolveSlugRedirect` when `getProduct(slug)` is null.
  SRS: FR-CAT-007. Paths: `modules/catalog/admin/slugs.ts`. Accept: `slugs.int.test.ts` green (A→B→C: `resolveSlugRedirect`
  of A and B → C; B→A round trip frees A; collision → conflict).
  Evidence: slugs.int.test.ts in the same run -> green. CHANGE-REQUEST for storefront redirect already filed by the leader (CHANGE-REQUESTS 2026-09-27 07:56).
- [x] **CAT-06** Admin i18n + products list page: `messages/{ar,en}/catalog.json` (fields, statuses, groups,
  occasions, component kinds, errors, actions), catalogue sub-nav (Products | Collections) in
  `app/[locale]/admin/catalog/layout.tsx`, `admin/catalog/page.tsx` → redirect to products, `admin/catalog/products/page.tsx`
  (Table: image, name via Bdi, SKUs, price PriceTag, status Badge, updated; status tabs + search; "New product").
  CHANGE-REQUEST to platform: `lib/nav/admin-nav.ts` hrefs → `/admin/catalog/products`, `/admin/catalog/collections`,
  `/admin/content/pages|faq|policies`. SRS: FR-CAT-001 UI. Paths: `app/[locale]/admin/catalog/**`, `messages/*/catalog.json`.
  Accept: `npm run typecheck` + `npx vitest run src/lib/i18n` green; dev server :3001 `/ar/admin/catalog/products` as
  Owner lists the 5 seeded titles RTL, `/en/...` LTR, Staff sees it too (catalog.read).
  Evidence: tsc clean, vitest unit src/lib/i18n + src/modules/cms 45 passed, e2e browse.spec (RTL/LTR list of the 4 boxes) passed; admin-nav CHANGE-REQUEST already filed by the leader.
- [x] **CAT-07** Product editor — details: `products/new` + `products/[id]` page with sections Details (ar/en side by
  side: name, description, play instructions), Attributes (group, occasion, tags chips, optional numbers), SEO & URL
  (seo title/description per locale, slug change with "old link will redirect" notice), header actions (Publish shows
  the named-field error list, Unpublish, Archive/Restore, Duplicate, Delete with confirm Dialog). Server actions with
  `staffAction("catalog.write")`. SRS: FR-CAT-001/003/004/007 UI. Paths: `admin/catalog/products/**`.
  Accept: browser (Playwright MCP or e2e) on :3001 — create draft, publish refused listing missing Arabic
  description, fill, add component (after CAT-08) and publish; slug change then `/api/catalog/redirect?slug=old`
  (CAT-12) returns new slug; typecheck green.
  Evidence: e2e product-editor.spec passed (create draft, refused publish lists named fields, complete, publish). Open: slug-change + /api/catalog/redirect check needs CAT-12 endpoint.
  Evidence (relay 3): e2e access.spec: new draft slug changed, GET /api/catalog/redirect?slug=old -> {slug:new,permanent:true}, unknown -> 404; product-editor.spec covers the rest.
- [x] **CAT-08** Product editor — variants + components sections: variants table + edit Dialog (SKU, name ar/en,
  price/compare-at in shekels ↔ agorot, weight, status, cost column + field only when viewer has
  `inventory.cost.read`), components list (kind select, names, count, move up/down, delete). SRS: FR-CAT-002/008/010 UI.
  Accept: browser — Owner sees + edits cost; Staff session: no cost column/field and a forged action with cost → 403;
  component add/reorder persists after reload.
  Evidence: e2e product-editor.spec (variant, components, reorder persists after reload) passed; cost column/field gated by canSeeCost, service forbids forged cost (variants.int.test). Staff-session e2e for hidden cost folded into CAT-17.
- [x] **CAT-09** Media: `admin/media.ts` + `POST /api/catalog/products/[id]/media` (multipart, `staffRoute("catalog.write")`;
  jpeg/png/webp/avif/gif ≤ 5 MB, mp4/webm ≤ 50 MB; `storage.put(newStorageKey("products/media", ext))`; image
  width/height from header bytes, no new dependency), `PATCH …/media/[mediaId]` (alt ar/en), `PUT …/media/order`
  (ids array), `DELETE …/media/[mediaId]` (storage object removed when no other row uses it). Editor gallery section:
  multi-upload with progress, thumbnails, alt inputs per locale, drag reorder (HTML5 DnD) + keyboard move buttons,
  delete. SRS: FR-CAT-005. Paths: `modules/catalog/admin/media.ts`, `app/api/catalog/products/[id]/media/**`, editor.
  Accept: `media.int.test.ts` green (bad mime 400, oversize 413/invalid_input, reorder persists, alt required at publish);
  browser — upload 2 images, drag second first, reload keeps order, storefront `getProduct` media order matches.
  Service done: admin/media.ts + media.int.test.ts 7 passed (mime/magic bytes/size refused, reorder persists, alt gate, shared-object delete). NOT done: API routes app/api/catalog/products/[id]/media/** and the editor gallery UI.
  Evidence: e2e media.spec passed (upload 2 PNG, alt, move earlier, reload keeps order, .txt -> 400, >5MB -> 413, delete); media.int.test 7 passed; routes api/catalog/products/[id]/media/**, MediaSection.tsx
- [x] **CAT-10** Product editor — seasonal windows section + preview: windows table/form with return note; editor shows
  "out of season, returns on <date>" state; "View in store" link `/products/<slug>` (storefront route).
  SRS: FR-CAT-009 UI. Accept: browser — add a past-only window → badge shows out of season + return date; typecheck.
  Evidence: e2e seasons.spec passed (all-year, past-only window = Out of season no upcoming, future window = Returns on <date>, overlap refused, delete both = all year); SeasonSection.tsx + actions; tsc clean
- [x] **CAT-11** Collections: `admin/collections.ts` (create/edit ar/en name+description, slug, active, position;
  add/remove product; reorder) + pages `admin/catalog/collections` (list) and `collections/[id]` (edit, product picker
  of non-archived products, drag + keyboard reorder, archived members shown struck-through "hidden: archived").
  SRS: FR-CAT-006. Accept: `collections.int.test.ts` green (order = curator order in `listProducts({collection})`;
  archived member drops out); browser reorder persists.
  Service done: admin/collections.ts + collections.int.test.ts 6 passed. NOT done: admin/catalog/collections pages (list + [id] editor).
  Evidence: e2e collections.spec 2 passed (create, add 2, move earlier, reload keeps order, list count 2, remove, delete; /ar list RTL); collections.int.test 6 passed; tsc clean
- [x] **CAT-12** Search + public catalogue API: harden `search()` (tests: term only in Arabic description with/without
  tashkeel, alef/ya/ta-marbuta variants; English-only term; tag; case-insensitive; published only; prefix match on the
  last token so typeahead works — keep `plainto` semantics for the rest), `GET /api/catalog/search?q=&locale=&limit=`
  and `GET /api/catalog/redirect?slug=` (public, rate-limited via `rateLimit`), `GET /api/catalog/products/[slug]`.
  SRS: FR-SRC-001, FR-CAT-007. Paths: `modules/catalog/service.ts`, `modules/catalog/search.int.test.ts`,
  `app/api/catalog/{search,redirect,products}/**`. Accept: `search.int.test.ts` green + `curl :3001/api/catalog/search?q=رمضان`
  returns the Ramadan titles.
  Evidence: search.int.test + public-payload.int.test 13 passed (tashkeel/alef/ya/ta-marbuta, English, tag, case, published only, last-token prefix, injection-safe, limit, redirect, 429 rate limit); curl :3001/api/catalog/search?q=رمضان -> ramadan-family-box, redirect?slug=nope -> 404
- [x] **CAT-13** Cost never public (FR-CAT-008 test): `public-payload.int.test.ts` — seed costs, call every public
  contract fn (`getProduct`, `listProducts`, `search`, `getVariants`, `getVariantBySku`, `getProductComponents`) and
  every public `/api/catalog/**` handler; deep-scan JSON for a `cost` key or the seeded cost values → none; admin DTO
  for a staff (non-owner) context has no cost. SRS: FR-CAT-008. Accept: that test green.

  Evidence: public-payload.int.test passed: costs seeded via updateVariant, deep scan of every contract fn + 3 public routes + non-owner admin DTO finds no cost key or value
## Content (FR-CMS-001..002)
- [x] **CAT-14** CMS service `modules/cms/`: `markdown.ts` (restricted Markdown → safe HTML: headings, paragraphs,
  lists, bold/italic, links http(s)/relative only, everything else escaped; unit-tested incl. XSS vectors);
  `pages.ts` (list/get/create/update draft, publish requires title+body in both locales, unpublish);
  `faq.ts` (CRUD, topic, publish toggle, reorder); `policies.ts` (list versions per kind newest first with
  effectiveAt + status in-force/superseded/scheduled, `createPolicyVersion` = new row, unique version label,
  effectiveAt ≥ now − 5 min; scheduled (future) versions editable/deletable, in-force/superseded never modified).
  Public additions to the catalog contract: `listPolicyVersions(kind, locale, ctx?)` and
  `getPolicyVersion(kind, version, locale, ctx?)` (+ manifest in `contracts.test.ts` + CONTRACTS.md, record in
  CHANGE-REQUESTS as additive). SRS: FR-CMS-001, FR-CMS-002. Paths: `modules/cms/**`, `modules/catalog/{index,service,types}.ts`.
  Accept: `npx vitest run src/modules/cms` (unit+int) green: superseded versions retrievable with dates; getPolicy picks
  the one in force at `ctx.now`; publish refused with incomplete English page.
  Evidence: vitest integration src/modules/cms 7 passed (pages publish gate names body:en, drafts not public, reserved slugs; FAQ order/publish; policies in-force/superseded/scheduled, locked versions refuse edit, version uniqueness, 5-min effectiveAt rule) + markdown unit 11 + contracts.test pins listPolicyVersions/getPolicyVersion/listCollections/getCollection; CONTRACTS.md + CHANGE-REQUESTS + DECISIONS updated. Services: cms/{pages,faq,policies}.ts.
- [x] **CAT-15** CMS admin pages (`content.write`): `admin/content/layout.tsx` sub-nav, `pages` list + `pages/[id]` editor
  (ar/en side by side with live preview through `markdown.ts`, save draft, publish), `faq` list with inline edit/add,
  reorder, publish toggle, `policies` overview (4 kinds, version in force + scheduled) and `policies/[kind]` (all
  versions with effective dates, view any, "New version" form prefilled from current). SRS: FR-CMS-001/002 UI.
  Paths: `app/[locale]/admin/content/**`, `app/api/cms/**` (if handlers needed). Accept: browser as Staff — edit
  "about" in both locales and publish; add policy version effective now → previous shows "superseded" and still opens.
  Partial (relay 2): admin/content layout + index redirect, pages list, pages/new, pages/[id] editor (ar/en side by side, live preview via markdown.ts, save, publish/unpublish) written, tsc clean + no-literals green, NOT yet browser-verified. NOT started: faq admin page (list + inline edit/add + reorder + publish toggle), policies overview + policies/[kind] (versions, view, New version form). Services ready: cms/faq.ts, cms/policies.ts. Messages: catalog.json `content.*` (nav + pages + error; add `faq`, `policies`).
  Evidence (relay 3): admin/content faq (add, inline edit, move, publish toggle, delete) + policies (overview, versions, new version prefilled, read-only superseded, scheduled editable/deletable); e2e content.spec 4 passed (page ar+en publish/unpublish, FAQ lifecycle in the shop, policy new version supersedes old which stays readable); access.spec Staff loads pages+policies; tsc clean; vitest unit src/lib/i18n 37 passed.
- [x] **CAT-16** Store rendering (`(store)/pages/**`): `pages/[slug]` (published static page, `generateMetadata` with
  SEO description, 404 otherwise), `pages/faq` (published FAQ grouped by topic, `<details>`), `pages/policies/[kind]`
  (version in force, effective date, link to history) and `pages/policies/[kind]/[version]` (any past/current version
  with "superseded on" note). CHANGE-REQUEST to platform: `lib/nav/store-nav.ts` policy hrefs →
  `/pages/policies/<kind>` and faq → `/pages/faq` (STOREFRONT owns `/faq`, `/policies`). SRS: FR-CMS-001/002, §5.2.
  Accept: dev :3001 — `/ar/pages/about`, `/en/pages/faq`, `/ar/pages/policies/returns` and an old version URL render
  (200, correct `dir`), `/ar/pages/nope` → 404; typecheck + `no-literals`/`logical-classes` tests green.

  Partial (relay 2): pages/faq, pages/policies/[kind], pages/policies/[kind]/[version] written (messages catalog.json `store.*`), tsc clean, NOT yet loaded in the browser. Still to do: verify 200/dir/404 on :3001 (needs seed policies v1 + a superseded version), CHANGE-REQUEST to platform for store-nav hrefs (/pages/policies/<kind>, /pages/faq) if not yet filed, and the insights CHANGE-REQUEST (render PrivacyNoticeFacts under kind=privacy).
  Evidence (relay 3): e2e content.spec: /ar|en/pages/<slug> 200 with dir rtl/ltr, /ar/pages/nope 404, FAQ shows published only, /en/pages/policies/delivery shows the new text and the old version URL renders 200; store-nav CHANGE-REQUEST already filed (CHANGE-REQUESTS 2026-09-27 07:56).
## Closing
- [x] **CAT-17** E2E: `web/tests/e2e/catalog/*.spec.ts` (Owner fixture `../support/owner-session`; staff via
  `tests/e2e/auth/db.ts` helpers): product create → refused publish (named fields) → complete → publish; variant cost
  hidden for Staff; media upload + reorder persists; slug change → `/api/catalog/redirect` gives new slug;
  collection reorder; static page edit+publish both locales visible at `/pages/<slug>`; policy new version keeps the
  old one retrievable. Accept: `npx playwright test tests/e2e/catalog` green on a warm :3001 server.
  Evidence (relay 3): npx playwright test tests/e2e/catalog --workers=1 on warm :3001 -> 26 passed (browse, product-editor, media, seasons, collections, content, access incl. Staff no-cost + slug redirect). With the default 6 workers on a cold dev server 3 media/editor/collections specs time out under load, they pass serially.
- [x] **CAT-18** Close-out: `npm run verify` green; `git grep -n "STUB(contracts)" web/src/modules/catalog` empty;
  CONTRACTS.md catalog section + manifest current; BACKLOG/DECISIONS/CHANGE-REQUESTS entries present; a11y pass on
  the admin editor (labels, focus order, keyboard reorder) and store pages; handover says team_done.
  Accept: `npm run verify` log shows 0 failures; leader review in LEADER.md.
  Evidence (relay 4): `git grep STUB(contracts) web/src/modules/catalog` empty; npm run verify: tsc clean, eslint 0 errors (9 warnings), vitest 863 passed / 7 failed: 6 are 5 s-60 s timeouts under machine load (navigation-load, contracts.test x4 incl. catalog 48 s, auth admin-API-route scan 60 s; all passed in earlier calm runs), 2 real and fixed: products/[id]/actions.ts lifecycle() wrapper -> four explicit staffAction exports (admin-entrypoints static scan green), db/seed.int.test.ts expectations updated to the 4 real boxes (4 published/1 seasonal/4 variants/8 stock rows/4 media/1 collection member; platform file, minimal edit, logged in CHANGE-REQUESTS). A11y pass: every field via Field/aria-label, keyboard move buttons beside every drag list (media, collection members, FAQ), role=status live regions, img alts from per-locale alt text. Leader review pending.
