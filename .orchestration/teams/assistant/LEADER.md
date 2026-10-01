# Leader log — team ASSISTANT (Phase 1)

## Plan rationale (relay #0, 2026-09-27)
- Build bottom-up so every task is testable in isolation with the mock LLM and the seeded DB: text utilities
  (ASS-01) → corpus (02) → retrieval (03) → tools (04) → intent (05) → LLM adapter (06) → limits (07) → orchestrator
  (08) → HTTP (09) → widget (10) → e2e (11) → admin (12-14) → eval (15) → hardening (16).
- Security model is architectural, not prompt-based: a local rule-based planner owns tool calls, the LLM only
  composes from fenced, redacted context, and a post-check rejects any price/number/stock/date claim not present in
  context (falls back to the deterministic composition). This makes FR-AI-003/006/008/013/016 testable and true for
  both mock and Gemini. Recorded in DECISIONS.md + BACKLOG (native function calling deferred).
- Dependencies are all real reads already (catalog getProduct/listProducts/search/getPolicy/listFaq/getStaticPage,
  inventory.getAvailability, orders.listDeliveryZones/estimateDelivery/getOrder/listCustomerOrders, core
  sendMessage/settings/callExternal, auth getCurrentCustomer/rateLimit, insights.recordBusinessEvent) — no seams to
  stub beyond test fixtures (orders for two customers inserted directly in int tests).
- Schema: only our own `assistant_*` tables; ASS-08 adds a `state jsonb` column to `assistant_conversations`
  (owned file, drizzle push). No new tables (avoids touching `schema-all.int.test.ts`).
- Two SHIMs outside owned paths (store layout `assistantSlot`, `eval:assistant` script) — logged as CRs; without
  them the widget and the eval cannot be demoed in-branch.

## Risks
- Storefront/platform may change `(store)/layout.tsx` at integration → conflict on our SHIM line (trivial, CR explains).
- Catalog team may change FAQ/policy content shapes; we only use the contract DTOs, so bodies can change freely.
- Rule-based dialect understanding may miss phrasings → eval set drives the lexicon; Gemini mode helps composition only.
- Arabic FTS relevance thresholds on a tiny corpus: tune `assistant.min_relevance` from the retrieval int tests.
- Streaming through Next dev server buffering: use `ReadableStream` + `content-type: application/x-ndjson`,
  `cache-control: no-store`; verify with `curl -N` in ASS-09.

## How I validate each worker batch
- Re-run the task's acceptance command myself (tsc, the module's vitest, int tests against DB 54328).
- UI tasks: load the page on :3008 in both locales, check RTL, disclosure-first, and a streamed answer.
- Security tasks: read the tool registry and the route handler code paths for any write or staff-session read.
- Before `team_done`: `npm run verify`, `npm run eval:assistant`, `npx playwright test tests/e2e/assistant`, and
  `FAULTS=llm:down` browse/checkout check (NFR-AVL-004).

## Review log
- relay #0: environment set up (ASS-00), plan written. No worker batches reviewed yet.
