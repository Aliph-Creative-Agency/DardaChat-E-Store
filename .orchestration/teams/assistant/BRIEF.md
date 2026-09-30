# Team ASSISTANT — Phase 1
**Working dir:** `D:/Personal/Projects/DardaChat-wt/assistant` (branch `team/assistant`). DB 54328, web 3008.
**Owns:** `web/src/modules/assistant/**`, `web/src/app/api/assistant/**`, `web/src/app/[locale]/admin/assistant/**`
(corpus + usage/limits admin), the assistant widget component that mounts into the storefront assistant slot,
`web/messages/*/assistant.json`, `web/tests/e2e/assistant/**`.
**SRS:** §4.14 FR-AI-001..016, NFR-PERF-004, NFR-AVL-004, NFR-SEC-004/008, §3.3 (Gemini 2.5 Flash).

**Build:** chat widget on every storefront page (never in back office), automation disclosure first, streaming responses;
retrieval corpus = catalogue + policies + curated FAQ (via catalog/cms contracts; Postgres FTS, Arabic-normalised; cite
sources); LLM adapter: Gemini 2.5 Flash via `@google/genai` when `GEMINI_API_KEY` is set, else a deterministic mock that
composes answers from retrieved snippets (the whole feature must work and be demoable with the mock); fixed service
identity with exactly five read-only tools (catalogue search, recommendation, stock availability, delivery estimate,
order status — authenticated + own orders only); no write paths; untrusted-input handling for messages, corpus and tool
output; PII redaction before the provider; reply in the user's language incl. Levantine Arabic; nothing relevant → say
so + offer escalation; escalation to a human on WhatsApp (low confidence, on request, after 2 failed exchanges) as a
transactional wa.me hand-off + notify; abuse/off-topic → disengage; per-session/per-account rate limits + monthly cost
ceiling → contact-form fallback; a failure never breaks the page. An evaluation set (grounding, injection, PII,
escalation, dialect) runnable with `npm run eval:assistant` against the mock.
