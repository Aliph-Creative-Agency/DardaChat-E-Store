# Team CATALOG — Phase 1
**Working dir:** `D:/Personal/Projects/DardaChat-wt/catalog` (branch `team/catalog`). DB port 54321, web port 3001.
**Owns:** `web/src/modules/catalog/**`, `web/src/modules/cms/**`, `web/src/app/[locale]/admin/catalog/**`,
`web/src/app/[locale]/admin/content/**`, `web/src/app/api/catalog/**`, `web/src/app/api/cms/**`,
`web/src/app/[locale]/(store)/pages/**` (static + policy page rendering), `web/messages/*/catalog.json`,
`web/messages/*/cms.json`, `web/tests/e2e/catalog/**`.
**SRS:** §4.1 (FR-CAT-001..010), §4.2 (FR-SRC-001), §4.16 (FR-CMS-001..002), §2.1 (range), §5.2.

**Build:** back-office catalogue: product CRUD/duplicate/archive/delete, variants (SKU, price, cost Owner-only, weight),
bilingual fields with publish gate, structured attributes, components list, ordered media gallery with per-locale alt
text (upload via storage adapter, drag reorder), collections (manual order), SEO metadata + slugs with 301 redirects,
seasonal availability windows (visible but not purchasable, shows return date). Search service: Postgres full-text in
Arabic + English (normalise Arabic: strip tashkeel, unify alef/ya/ta-marbuta) — expose `search()` for storefront and
assistant. CMS: static pages editable in both locales by non-developers; versioned policies (delivery, returns,
privacy, terms) keeping superseded versions with effective dates; FAQ entries (the assistant's curated FAQ corpus).
Replace the catalog/cms stubs in `index.ts`. Unit cost must never appear in any public payload (test it).
