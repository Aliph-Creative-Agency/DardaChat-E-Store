# Tasks — team ASSISTANT (Phase 1)

Worktree `D:/Personal/Projects/DardaChat-wt/assistant` (branch `team/assistant`), DB 54328, web 3008. Run everything from `web/`.
Owned: `web/src/modules/assistant/**`, `web/src/app/api/assistant/**`, `web/src/app/[locale]/admin/assistant/**`,
`web/messages/*/assistant.json`, `web/tests/e2e/assistant/**` (+ the widget in `modules/assistant/ui/`).
Two one-line SHIMs outside owned paths are allowed and logged as CRs (see ASS-10, ASS-15): the store layout's
`assistantSlot` prop and the `eval:assistant` npm script. Nothing else outside owned paths.

Every task: `npx tsc --noEmit` clean + `npx vitest run src/modules/assistant` green before it is ticked. Paste evidence
(command + one-line result) under the task. Messages: `messages/{ar,en}/assistant.json`, real Arabic, key parity.

## Design decisions baked into the tasks (see LEADER.md)
- Pipeline per turn: guard (limits, abuse/off-topic) → intent + entities (rule-based, ar/en/Levantine) → the five
  read-only tools and FTS retrieval run LOCALLY by the planner → grounding context (fenced as untrusted data, PII
  redacted) → LLM composes the answer (Gemini 2.5 Flash if `GEMINI_API_KEY`, else deterministic mock) → post-check
  (every price/number/stock/date claim in the reply must appear in context, else fall back to the mock composition).
  The model never gets function-calling handles, so no prompt can reach a sixth capability or any write (FR-AI-006/008/013/016).
- Service identity: route handlers pass only `{ customerId }` (from `getCurrentCustomer()`) into the pipeline; staff
  sessions are never read. Actor for any write = `{ type: "system", id: null }` + conversation id.
- Streaming: NDJSON over `fetch` (`{type:"meta"|"delta"|"citations"|"escalation"|"fallback"|"done"|"error"}`).
- Settings keys (seeded, insert-if-missing): `assistant.monthly_cost_ceiling_micros`, `assistant.limits`
  (per session / per IP / per account), `assistant.whatsapp_number`, `assistant.escalation_notify`
  (email/phone for the staff notice), `assistant.min_relevance`.

## Tasks

- [x] **ASS-00 Environment** — SRS: n/a. Paths: worktree, `web/.env.local`.
  Worktree on `foundation-v1`, `npm ci`, `.env.local` (PG 54328, web 3008), `db:reset`, typecheck + tests green.
  Accept: `npm run verify` exit 0. Evidence: see HANDOVER.md "Gotchas" (done by leader during planning).

## Brand update (2026-09-29, approved by Obaida) — do these first
- [ ] **ASS-B1 Brand + escalation number** (model: sonnet) — Read ../../DESIGN.md (ROOT/.orchestration/DESIGN.md) first. If tag brand-v1 exists and is not in your branch, `git merge brand-v1` before starting (PROTOCOL §1 step 4b). Assistant persona/copy says «دردشات» / Dardachat; WhatsApp escalation number +972543992424 as a setting default; corpus includes About/Services pages (catalog cms contract). Widget styled in the palette. Check: escalation link = wa.me/972543992424; grep finds no DardaChat in assistant files.

- [ ] **ASS-01 Text utilities: language, dialect, PII, untrusted-content fencing** — FR-AI-004, 013, 014.
  Files: `modules/assistant/text/lang.ts` (detect ar/en by script ratio; Levantine → MSA lexicon for retrieval:
  شو/ايش→ماذا، بدي→أريد، قديش/قديه/أديش→كم، وين→أين، في عندكم→هل لديكم، هلأ→الآن، منيح، كتير، هيك، ليش…),
  `text/pii.ts` (redact E.164 + local 05x phones, emails, card-like numbers (Luhn), IBAN, "payment ref" tokens, full
  addresses (street/building/apartment keywords + numbers, ar/en) → `[phone]`, `[email]`…; returns `{ text, found[] }`),
  `text/untrusted.ts` (strip control/zero-width/bidi-override chars, cap length, neutralise instruction-like lines,
  wrap in `<<<DATA source=…>>> … <<<END>>>` fences), `messages/{ar,en}/assistant.json` initial keys (disclosure etc.),
  unit tests `text/*.test.ts` (≥ 40 cases incl. Arabic digits, dialect set, PII in ar/en, injection strings).
  Accept: `npx vitest run src/modules/assistant/text` green; `npx vitest run src/lib/i18n` (parity) green.

- [ ] **ASS-02 Corpus indexer + refresh job + seed** — FR-AI-002.
  Files: `modules/assistant/corpus.ts` (`reindexCorpus(ctx?)`: products via `catalog.listProducts`/`getProduct`
  (published only, both locales: name, tagline/description, group, occasion, components, price-from as text),
  policies via `getPolicy` (4 kinds × 2 locales, split by heading/paragraph ~800 chars), FAQ via `listFaq`, static
  pages via `getStaticPage("about")`, delivery zones via `orders.listDeliveryZones` + `estimateDelivery` →
  one "delivery" chunk per zone/locale; upsert `assistant_documents` (sourceType, sourceId, locale, chunkIndex) and
  delete rows whose source vanished; `search = to_tsvector('simple', catalog_search_normalize(title||' '||chunk))`),
  `jobs.ts` (`assistant.corpus.refresh`, every 15 min, idempotent), `seed.ts` (index after catalog seed; seed the
  settings keys above), `corpus.int.test.ts`.
  Accept: int test: after seed every sourceType × locale has rows; deleting a FAQ source + reindex removes its chunks;
  second reindex is a no-op (same row ids). `npm run db:seed` twice without errors.

- [ ] **ASS-03 Retrieval** — FR-AI-002, 004, 012.
  Files: `modules/assistant/retrieval.ts` (`retrieve(query, { locale, limit=6 }, ctx?)`: normalise + dialect-expand,
  `websearch`/`plainto_tsquery('simple', catalog_search_normalize(q))` OR-ed terms, `ts_rank_cd`, prefer the
  message locale then the other, returns `{ hits[{ id, sourceType, sourceId, title, chunk, score, url }],
  confidence: "high"|"low"|"none" }` using setting `assistant.min_relevance`; `url` = store path of the source
  (`/products/<slug>`, `/policies/<kind>`, `/faq`, `/pages/about`)), `retrieval.int.test.ts`.
  Accept: int tests: an Arabic, an English and a Levantine question each return the expected seeded source first;
  a question about something absent ("do you sell laptops") → `confidence: "none"`.

- [ ] **ASS-04 The five read-only tools** — FR-AI-006, 007, 008, 016.
  Files: `modules/assistant/tools.ts`: frozen registry of EXACTLY `catalogue_search` (catalog.search),
  `recommend_products` (listProducts by group/occasion/budget, in-season first), `stock_availability`
  (inventory.getAvailability → in_stock / low / out, no raw counts beyond "low"), `delivery_estimate`
  (zone by governorate name ar/en fuzzy → orders.estimateDelivery + fee), `order_status` (requires
  `principal.customerId`; ref parsed tolerant; only `listCustomerOrders(customerId)` / own `getOrder`; otherwise
  refusal result `auth_required` / `not_found` — never reveals another customer's order). Every tool: zod input,
  read-only contract calls only, output passed through `untrusted.ts`. `tools.int.test.ts`.
  Accept: int tests: registry keys === the five names; each tool returns correct seeded data; order_status without a
  customer → `auth_required`; with customer A asking for B's reference → `not_found`; a spy DB/`pg` statement log
  during all tool calls contains no INSERT/UPDATE/DELETE.

- [ ] **ASS-05 Intent, entities and guard classifier** — FR-AI-004, 009, 015.
  Files: `modules/assistant/intent.ts` (`classify(message, locale)` → `{ intent: product|recommend|stock|delivery|
  order_status|human|policy|greeting|thanks|abuse|off_topic|unknown, entities { orderRef?, governorate?, budget?,
  terms[] }, lang }`; lexicons ar/en/Levantine; off-topic = clearly unrelated domains (politics, coding, homework,
  medical…), abuse = profanity/harassment list ar/en), `intent.test.ts` (≥ 50 cases, ≥ 15 Levantine).
  Accept: `npx vitest run src/modules/assistant/intent` green.

- [ ] **ASS-06 LLM adapter: mock + Gemini, via callExternal** — §3.3, FR-AI-003, 005, 013, 014.
  Files: `modules/assistant/llm/types.ts` (`LlmAdapter.stream({ system, context, history, message, locale }) →
  AsyncIterable<string>` + usage), `llm/mock.ts` (deterministic composer from context blocks using message templates
  from `assistant.json` via `createTranslator`; streams ~word chunks; honours locale), `llm/gemini.ts`
  (`@google/genai` `generateContentStream`, model `gemini-2.5-flash`, fixed system instruction, context fenced,
  temperature 0.2, max output tokens), `llm/index.ts` (pick by `GEMINI_API_KEY`; wrap in
  `callExternal({ service: "llm", operation: "stream", timeoutMs })` for the first chunk; outbound-payload capture hook
  for tests), `llm/cost.ts` (token estimate + USD micros price table), tests with a fake Gemini client.
  Accept: unit tests: mock output deterministic and grounded; captured outbound payload has no PII from a message
  containing phone/email/address; `FAULTS=llm:down` → `AppError("unavailable")`.

- [ ] **ASS-07 Limits, usage and monthly cost ceiling** — FR-AI-010, NFR-SEC-004, 008.
  Files: `modules/assistant/limits.ts` (`checkLimits({ sessionToken, ip, customerId })` via auth `rateLimit` +
  `DbRateLimitStore` + `LIMITS.assistantPerSession/PerIp` + local per-account rule from setting `assistant.limits`;
  `getMode(ctx)` → `"chat" | "contact_form"` when month-to-date `assistant_usage` cost ≥ ceiling (month boundary
  Asia/Jerusalem); `recordUsage({ model, tokensIn, tokensOut, cost })` upsert per day/model), `limits.int.test.ts`.
  Accept: int tests: N+1th message in a session → `rate_limited`; per-IP and per-account likewise; usage above a
  tiny ceiling → mode `contact_form`; usage rows roll up per day.

- [ ] **ASS-08 Chat orchestrator (service.ts)** — FR-AI-002, 003, 009, 010, 012, 013, 015.
  Files: `modules/assistant/service.ts` (`startSession`, `chat({ sessionToken, message, locale?, principal }, ctx?)`
  → AsyncIterable of events; conversation create/load; guard → intent → tools/retrieval → context → LLM → post-check
  grounding validator (`grounding.ts`: numbers/prices/dates/stock words in reply ⊆ context, else mock fallback) →
  persist user/assistant messages (redacted text) with citations + tokens; escalation offer when confidence none/low,
  intent human, or 2 consecutive unsuccessful exchanges on the same question (state in `assistant_conversations`
  — add `state jsonb` column in `schema.ts`); abuse/off-topic → disengage + escalation offer; ceiling → contact_form
  event; any internal failure → `fallback` event, never throws to the route), `escalate({ conversationId, reason,
  contact? })` → `assistant_escalations` row + `core.sendMessage` staff notice (`assistant.escalation_notify`) +
  `insights.recordBusinessEvent("assistant.escalated")` + `waMeUrl` (setting number + prefilled bilingual text with
  conversation short id, no PII). `service.int.test.ts` with the mock LLM.
  Accept: int tests for: grounded answer with citations; not-known + escalation; human request; 2 failed exchanges;
  abuse and off-topic disengage; LLM down → fallback event; ceiling → contact_form; persisted messages contain no PII.

- [ ] **ASS-09 API route handlers** — FR-AI-007, 009, 010, 016, NFR-SEC-004, 008.
  Files: `app/api/assistant/session/route.ts` (GET: sets httpOnly `dc_asst` cookie, returns `{ mode, disclosure
  shown-first flag }`), `app/api/assistant/chat/route.ts` (POST NDJSON stream; zod body, max 1 000 chars, same-origin
  check, refuses when `Referer` path is `/admin|/staff` (404), rate limits, customer from `getCurrentCustomer()` only),
  `app/api/assistant/escalate/route.ts`, `app/api/assistant/contact/route.ts` (contact-form fallback: honeypot field,
  min fill time, per-IP limit → escalation row + staff notice), handler logic in `modules/assistant/http.ts` with
  `http.int.test.ts` (calls handlers with `Request` objects).
  Accept: int tests green; with dev server on 3008: `curl -N -X POST localhost:3008/api/assistant/chat …` streams
  NDJSON lines ending in `{"type":"done"}`.

- [ ] **ASS-10 Storefront widget** — FR-AI-001, 005, 011, NFR-AVL-004, UI-*.
  Files: `modules/assistant/ui/AssistantLauncher.tsx` (header slot button, server-safe), `ui/AssistantPanel.tsx`
  (client, `next/dynamic` lazy, own error boundary: a crash hides the widget, never the page), disclosure banner
  before any message, streaming render, citation chips linking to sources, escalation card with wa.me button,
  contact-form mode, typing/aria-live, mobile full-height sheet / desktop side panel, RTL logical classes, keyboard +
  focus trap. SHIM: `app/[locale]/(store)/layout.tsx` `assistantSlot={<AssistantLauncher />}` marked
  `// SHIM(assistant)` + CR to PLATFORM. Use `frontend-design`/`impeccable` skills.
  Accept: dev server 3008: open `/ar` and `/en/products`, ask a question, see disclosure → streamed answer →
  citations (screenshot in evidence); `npx vitest run src/lib src/components` (no-literals, logical-classes,
  parity) green.

- [ ] **ASS-11 Storefront e2e** — FR-AI-001, 004, 009, 011, 016, NFR-AVL-004.
  Files: `tests/e2e/assistant/widget.spec.ts`, `tests/e2e/assistant/backoffice.spec.ts` (owner-session fixture).
  Covers: launcher on every store route in store-nav (ar+en); disclosure before first message both locales;
  Arabic question → Arabic answer with a citation; Levantine question answered; "بدي احكي مع موظف" → wa.me link;
  signed-in Owner: widget absent on every `/admin/**` nav route, and on the store the same five tools (API meta lists
  them); `llm` fault down → store page + cart still work and the widget shows the fallback.
  Accept: `npx playwright test tests/e2e/assistant` green against the 3008 dev server.

- [ ] **ASS-12 Admin: knowledge (corpus)** — FR-AI-002.
  Files: `app/[locale]/admin/assistant/knowledge/page.tsx` (+ actions): counts per source × locale, last refresh,
  "reindex now" (`staffAction("assistant.manage")` + `audit`), retrieval tester (query → hits + confidence),
  list/filter chunks. `requireStaff("assistant.manage")` first line.
  Accept: browser check as Owner on 3008 (ar + en); `admin-entrypoints.int.test.ts` green.

- [ ] **ASS-13 Admin: conversations, usage/limits, escalations** — FR-AI-009, 010.
  Files: `app/[locale]/admin/assistant/conversations/page.tsx` + `[id]/page.tsx` (list, transcript with citations
  and redaction markers, month-to-date usage vs ceiling bar, edit ceiling + limits → audited settings write),
  `app/[locale]/admin/assistant/escalations/page.tsx` (open/handled/dismissed tabs, mark handled/dismissed, audited).
  Accept: browser check as Owner; `admin-entrypoints.int.test.ts` green; lowering the ceiling below usage flips the
  storefront widget to the contact form.

- [ ] **ASS-14 Admin e2e** — FR-AI-009, 010, 016.
  Files: `tests/e2e/assistant/admin.spec.ts`: knowledge reindex + tester, conversation appears after a store chat,
  escalation from the store appears and can be marked handled, ceiling edit → contact form on the store.
  Accept: `npx playwright test tests/e2e/assistant` green.

- [ ] **ASS-15 Evaluation set (`npm run eval:assistant`)** — FR-AI-002..004, 009, 012..015, NFR-PERF-004, SRS §7.
  Files: `modules/assistant/eval/cases.ts` (≥ 60 cases: grounding/no-hallucinated price-stock-delivery, no-answer,
  injection via customer message / corpus entry (temp poisoned `assistant_documents` row) / product content /
  tool output, PII redaction (captured outbound payload), escalation (low confidence, request, 2 failures), Levantine
  dialect, abuse/off-topic, language match), `eval/run.ts` (runs against the mock on the worktree DB, prints a table
  per category, p90 time-to-first-delta, cleans up, exit 1 on any failure). SHIM: `package.json` script
  `"eval:assistant": "tsx src/modules/assistant/eval/run.ts"` + CR to PLATFORM.
  Accept: `npm run eval:assistant` → all categories 100 %, p90 first delta < 2 500 ms, exit 0.

- [ ] **ASS-16 Hardening, docs, final verify** — NFR-AVL-004, NFR-PERF-004, all.
  NFR-AVL-004 manual check with `FAULTS=llm:down` (home, product, cart, checkout, admin orders load); module
  `README.md` (pipeline, settings, how to switch to Gemini, eval); CONTRACTS.md note (assistant contract stays
  empty) via CR if needed; BACKLOG lines; `git grep "STUB(contracts)" web/src/modules/assistant` empty.
  Accept: `npm run verify` exit 0 + `npm run eval:assistant` exit 0 + e2e assistant green.
