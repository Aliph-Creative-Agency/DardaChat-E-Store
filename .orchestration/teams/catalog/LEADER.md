# Leader log — catalog

## Plan rationale (relay #0, 2026-09-27)
- Foundation already ships the catalog READ side for real (schema, FTS trigger `020-catalog-fts.sql`, seed of 5 titles,
  `getProduct/listProducts/search/getPolicy/...`). What is missing is the whole WRITE side (FR-CAT-001..010 admin),
  media upload, collections admin, CMS editing/versioning (FR-CMS-001/002), store content pages, and the tests that
  prove the acceptance criteria. There is no `STUB(contracts)` in catalog; "replace the stubs" = build the write side.
- Order: services + int tests first (CAT-01..05, each leaves the build green and is testable without UI), then the admin
  UI in thin slices on top (CAT-06..11), search/API/cost test (CAT-12/13), CMS service → admin → store (CAT-14..16),
  e2e + close-out (CAT-17/18). The app is runnable from CAT-06 onward.
- Design decisions (also in DECISIONS.md 2026-09-27 catalog):
  - Write side module-internal (`modules/catalog/admin/*`, `modules/cms/*`); public contract unchanged except additive
    `listPolicyVersions` / `getPolicyVersion` (CAT-14, manifest + CONTRACTS.md updated in that commit).
  - Paths: admin `/admin/catalog/*` and `/admin/content/*` (brief ownership) → CHANGE-REQUEST for admin-nav hrefs;
    store `/pages/<slug>`, `/pages/faq`, `/pages/policies/<kind>[/<version>]` → CHANGE-REQUEST for store-nav hrefs.
  - Slug 301 is served by STOREFRONT's product route via `resolveSlugRedirect` (CHANGE-REQUEST filed); catalog also
    exposes `GET /api/catalog/redirect?slug=` so our e2e can prove FR-CAT-007 inside our own paths.
  - Cost = `inventory.cost.read` (Owner-only) gate on read AND write; FR-CAT-008 proved by a deep-scan payload test.
  - CMS strings in `catalog.json` `content.*` (no `cms` namespace; avoids a platform change).
  - Restricted Markdown for content bodies (safe, dependency-free); no image pipeline (BACKLOG).

## Risks
- admin-nav still points at `/admin/products` etc. until platform merges the CR: sidebar links 404 in our branch —
  test by URL; call it out at integration.
- Media upload in Next route handlers (multipart `req.formData()`), body size limits: keep ≤ 50 MB, verify in dev early.
- Drag-and-drop reorder must stay keyboard-accessible (move up/down buttons) — reviewed at CAT-09/11.
- Journalled `variants` writes need `withActor`; forgetting it fails the journal trigger/test — CAT-03 test covers it.
- Parallel teams share the machine: only DB 54321 / web 3001; never two integration runs at once.

## How I validate
- Each task: read the diff, re-run its acceptance command myself, check owned paths only (`git diff --stat`), check
  ar/en message parity + no literals, and for UI load the page on :3001 in both locales (RTL/LTR) as Owner and Staff.
- Before team_done: `npm run verify` + `npx playwright test tests/e2e/catalog` green, grep public payloads for `cost`.

## Review log
- relay #0: planned CAT-00..18; setup CAT-00 done by leader (see HANDOVER evidence).
