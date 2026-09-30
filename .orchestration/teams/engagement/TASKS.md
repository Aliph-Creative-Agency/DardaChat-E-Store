# TASKS — team engagement (Phase 1)

Worktree `D:/Personal/Projects/DardaChat-wt/engagement` (branch `team/engagement`), DB 54326, web 3006. All commands from `web/`.
Code lives in `web/src/modules/engagement/**` (the module the foundation created; `modules/customers|messaging` are
not used — one module, one contract). Strings in `web/messages/<ar|en>/engagement.json` (the registered namespace,
see DECISIONS 2026-09-27 engagement). Admin pages: `admin/customers/**` (customers, segments) and `admin/messaging/**`
(overview, templates, campaigns). Store: `(store)/unsubscribe/**`. API: `api/messaging/**`. E2E: `tests/e2e/engagement/**`.
Every task ends with `npx tsc --noEmit` green + its own tests green; UI tasks also load the page on :3006 (ar + en).
Legend: `[ ]` todo, `[~]` partial, `[x]` done (paste evidence line), `[!]` blocked.

- [x] **ENG-00 Environment** (leader) — npm ci, `.env.local` (54326/3006), `db:reset`, `npm run verify` green.
  Evidence: see LEADER.md "Setup".

## Brand update (2026-09-29, approved by Obaida) — do these first
- [ ] **ENG-B1 Brand in messages** (model: sonnet) — Read ../../DESIGN.md (ROOT/.orchestration/DESIGN.md) first. If tag brand-v1 exists and is not in your branch, `git merge brand-v1` before starting (PROTOCOL §1 step 4b). Templates/default texts use «دردشات» / Dardachat and the contact block (DESIGN.md §1); email layout in the palette. Check: grep finds no DardaChat/«دردشة» in engagement files; outbox render shows the new name.

- [ ] **ENG-01 Event list + template renderer** — SRS FR-MSG-004, FR-INV-008 (transactional), FR-AI-009, AS-18.
  Files: `modules/engagement/types.ts`, `render.ts`, `render.test.ts`, `default-texts.ts`, `index.ts`;
  `ROOT/.orchestration/CONTRACTS.md` (engagement row), `CHANGE-REQUESTS.md`, `DECISIONS.md`.
  Extend `TRANSACTIONAL_EVENTS` (additive) with `order.backordered` (revised expectation), `order.lapsed`,
  `stock.back_in_stock`, `account.otp`, `assistant.escalation`; default ar/en texts for each (real Arabic).
  `renderTemplate(body, vars)` for `{{name}}` placeholders: HTML-escaped for email, missing var → throws
  `invalid_input` listing names; `templateVariables(body)`; sample data per event for previews.
  Accept: `npx vitest run src/modules/engagement/render.test.ts src/modules/contracts.test.ts` green; `tsc` green.

- [ ] **ENG-02 Template registry (schema + seed + service)** — FR-MSG-005, FR-MSG-006, CON-06.
  Files: `modules/engagement/schema.ts` (add `message_suppressions`: customerId?, channel, eventKey, reason
  `no_consent|cap|template_not_approved|unsubscribed|no_contact`, campaignId?, templateId?, detail, createdAt),
  `templates.ts`, `templates.int.test.ts`, `seed.ts`.
  Seed one template per (event, channel, locale) for all transactional events + `marketing.generic` (isMarketing),
  WhatsApp rows with `providerTemplateName` and approval `approved`, except one `submitted` and one `rejected` demo row.
  Service: `listTemplates`, `getTemplate`, `updateTemplate` (WhatsApp body edit ⇒ back to `draft`), `submitTemplate`
  (→ `submitted`), `refreshTemplateApprovals()` = mock Meta via `callExternal({ service: "whatsapp" })`
  (deterministic: submitted older than 60 s → approved, body containing `[reject]` → rejected), `listBlockedSends()`.
  Accept: `npm run db:setup && npm run db:seed` twice without error (idempotent); int test covers edit→draft,
  submit, refresh → approved/rejected.

- [ ] **ENG-03 `notify` on templates (replace the stub)** — FR-MSG-004, FR-MSG-006, FR-ACC-003/AS-18, FR-AI-009.
  Files: `modules/engagement/service.ts` (or split `notify.ts`), `notify.int.test.ts`, `contract.int.test.ts`.
  Render from the active template for (event, channel, customer locale); no row → default text. WhatsApp template not
  `approved` ⇒ WhatsApp is NOT attempted, a `template_not_approved` suppression is written (admin alert) and the phone
  group falls back to SMS. Keep dedupe keys, no consent gate for transactional (incl. back-in-stock, escalation, OTP).
  Remove `STUB(contracts)` + `stubWarn` from notify.
  Accept: int test: every event in `TRANSACTIONAL_EVENTS` sends in the customer's locale (ar + en customer);
  pending/rejected WhatsApp template → no whatsapp row, sms row sent, suppression row present;
  `git grep -n "STUB(contracts)" web/src/modules/engagement` empty.

- [ ] **ENG-04 Consent completion + unsubscribe tokens + keyword opt-out** — FR-MSG-001, FR-MSG-003, NFR-PRV-002.
  Files: `modules/engagement/consent.ts`, `unsubscribe.ts`, `consent.int.test.ts`, `types.ts` (ConsentSource +=
  `unsubscribe_link`, `keyword`), `index.ts` (new exports only if other teams need them — record in CONTRACTS.md).
  `setMarketingConsent(customerId, channel, granted, source)` (one call = one step both ways, per purpose/channel,
  timestamp + source + policyVersion), `unsubscribeToken(customerId, channel)` / `verifyUnsubscribeToken` (HMAC with
  SESSION_SECRET, no expiry), `handleInboundMessage({ channel, from, text })`: keywords `STOP`, `UNSUBSCRIBE`, `إلغاء`,
  `الغاء`, `توقف` (trim/case/diacritics-insensitive) → withdraw that channel, send a transactional confirmation.
  Accept: int test: grant → hasConsent true; token withdraw → false; keyword from the customer's phone withdraws
  whatsapp (and sms when inbound on sms); ledger shows 3 timestamped rows with sources.

- [ ] **ENG-05 Marketing dispatch gate + 14-day cap** — FR-MSG-002, FR-MSG-003, FR-MSG-006, FR-MSG-008, AS-19, FR-INV-008.
  Files: `modules/engagement/marketing.ts`, `marketing.int.test.ts`.
  `sendMarketing({ customerId, channel, templateKey, data?, campaignId? }, ctx?)` — at dispatch, in one tx with a
  per-customer advisory lock: customer active + contact for channel; `hasConsent(channel)`; WhatsApp template approved;
  no marketing message (eventKey `marketing.*`, status not failed-dead) to this customer on ANY channel in the last 14
  days (setting `engagement.marketing_cap_days`, default 14); then `core.sendMessage` (single channel, no fallback)
  with the unsubscribe footer (link for email/sms, keyword line for WhatsApp). Any refusal → suppression row +
  `{ status: "suppressed", reason }`. Transactional sends never count toward the cap.
  Accept: int tests: no consent → suppressed `no_consent` and no messages row; send on whatsapp then email within
  14 days → second `cap`; after 15 days (ctx.now) → sent; withdraw via token → next send `no_consent`;
  `notify("stock.back_in_stock")` does not affect the cap; rendered text contains a working unsubscribe URL.

- [ ] **ENG-06 Unsubscribe page + inbound API** — FR-MSG-003, NFR-PRV-002.
  Files: `app/[locale]/(store)/unsubscribe/[token]/page.tsx` (+ server action), `app/api/messaging/inbound/route.ts`
  (mock provider webhook: `{ channel, from, text }`, dev-signed with PAYMENT_WEBHOOK_SECRET-style HMAC header
  `x-dc-signature` using SESSION_SECRET; 401 on bad sig), `messages/*/engagement.json` (`unsubscribe.*`),
  `tests/e2e/engagement/unsubscribe.spec.ts`.
  Page: shows the channel, one button "Unsubscribe" (one click, same effort as the checkbox that gave it), success
  state with "resubscribe" option; bad token → friendly error; ar + en, RTL.
  Accept: e2e: seed consenting customer → `sendMarketing` → read the link from `/api/dev/outbox?to=` → click →
  consent withdrawn, next `sendMarketing` suppressed; curl POST inbound `STOP` with valid sig → 200 and withdrawn.

- [ ] **ENG-07 Customer 360 + metrics service** — FR-CRM-001, FR-CRM-002.
  Files: `modules/engagement/customers.ts`, `metrics.ts`, `customers.int.test.ts`.
  `customerMetrics(ids)` (SQL over `orders`, read-only; excludes CANCELLED/unpaid-lapsed per the rule written in the
  file header; LTV = sum of `total` of counted orders, AOV = round(LTV / count), first/last `placed_at`),
  `listCustomers({ q, page, sort })` (name/phone/email search, metrics columns), `getCustomerProfile(id)` = customer +
  metrics + orders (`orders.listCustomerOrders`) + addresses + consents (current + history) + Journey results
  (SQL read of `journey_results`, SHIM until journey exports a reader — CR) + recent messages + suppressions.
  Accept: int test with directly inserted orders: all five figures equal an independent JS computation over the
  same rows (incl. zero-order customer); profile has all four linked record types (FR-CRM-001).

- [ ] **ENG-08 Demo seed** — supports all FRs (demo data for the back office).
  Files: `modules/engagement/seed.ts`, `seed-data.ts`.
  ~12 demo customers (ar/en, mixed consents per channel with sources, addresses), 3–4 of them with COD orders placed
  through `orders.placeOrder` (idempotency keys `seed-eng-<n>`), 3 segments (e.g. "repeat buyers", "Arabic, WhatsApp
  consent", "no order in 60 days"), 1 draft campaign. Idempotent.
  Accept: `npm run db:reset` then `npm run db:seed` again → no error, row counts unchanged (query printed in evidence).

- [ ] **ENG-09 Admin: customers list + customer detail** — FR-CRM-001, FR-CRM-002, FR-MSG-001, NFR-PRV-002.
  Files: `app/[locale]/admin/customers/page.tsx`, `admin/customers/[id]/page.tsx`, `modules/engagement/ui/**`,
  `messages/*/engagement.json`, `tests/e2e/engagement/customers.spec.ts`.
  List (search, paging, orders/LTV/last order), detail (contact, 5 metrics, orders, addresses, consent per channel
  with source/time + grant/withdraw toggles (`customers.write`, audited, one click each way), consent history,
  Journey results or empty state, messages + suppressions). `requireStaff("customers.read")` first line.
  Accept: e2e (owner-session): list shows a seeded customer, detail shows the 5 metrics, withdraw WhatsApp consent →
  ledger row with source `admin`; page loads in ar and en without console errors.

- [ ] **ENG-10 Segment rules engine** — FR-CRM-003.
  Files: `modules/engagement/segments.ts`, `segment-rules.ts` (zod schema + SQL compiler), `segment-rules.test.ts`,
  `segments.int.test.ts`.
  Rules `{ match: "all"|"any", conditions: [{ field, op, value }] }` over: locale, isGuest, status, createdAt (days
  ago), governorate (any address), consent (channel), orderCount, ltv, aov, lastOrderDaysAgo, firstOrderDaysAgo,
  hasJourneyResult. Compiled to one SQL query evaluated live (no membership cache). `listSegments`, `saveSegment`,
  `deleteSegment`, `previewSegment(rules)` → `{ count, sample }`, `segmentMemberIds(id)`, `customerSegments(id)`.
  Accept: unit tests for the zod schema/compiler per operator; int test: customer outside segment → insert an order →
  appears in `segmentMemberIds` on the very next call (no refresh).

- [ ] **ENG-11 Admin: segment builder UI** — FR-CRM-003.
  Files: `app/[locale]/admin/customers/segments/**`, `modules/engagement/ui/segment-builder.tsx`,
  `messages/*/engagement.json`, `tests/e2e/engagement/segments.spec.ts`.
  List (name, live count), new/edit with rule builder rows (field → op → typed value input), all/any toggle, live
  preview count + first 10 members; save/delete (`campaigns.write`), view (`customers.read`).
  Accept: e2e: build "orderCount ≥ 2" segment, preview shows the seeded repeat buyer, save, list shows count.

- [ ] **ENG-12 Admin: messaging overview + templates UI + approval refresh job** — FR-MSG-005, FR-MSG-006.
  Files: `app/[locale]/admin/messaging/page.tsx` (alerts: blocked sends + dead letters for engagement events, recent
  sends), `admin/messaging/templates/**`, `modules/engagement/jobs.ts` (`engagement.templates.refresh`, every 5 min),
  `messages/*/engagement.json`, `tests/e2e/engagement/templates.spec.ts`.
  Template list grouped by event with channel/locale/approval badge; edit with placeholder list + live preview on
  sample data; submit for approval; "refresh status" button; blocked-send alert banner (FR-MSG-006 "surfaced").
  Accept: e2e: edit an approved WhatsApp template → shows draft; submit → submitted; trigger `notify` for that event
  → overview shows the blocked-send alert; refresh after 60 s (ctx/now pinned in int test instead) → approved.

- [ ] **ENG-13 Campaign service + dispatch job** — FR-MSG-007, FR-MSG-002, FR-MSG-008.
  Files: `modules/engagement/campaigns.ts`, `jobs.ts` (`engagement.campaigns.dispatch`, every 60 s),
  `campaigns.int.test.ts`.
  Draft CRUD (name, segment, channel, template, scheduledAt), `scheduleCampaign` (`campaigns.send`, Owner), `cancel`,
  `sendNow`. Job: claims due `scheduled` campaigns (`UPDATE … status='sending' … RETURNING`, idempotent), evaluates
  the segment live, one `campaign_recipients` row per member (unique), `sendMarketing` each (batch 200), records
  messageId or skippedReason, → `sent`. `campaignReport(id)` = counts + per-recipient status from `messages.status`.
  Accept: int test: campaign scheduled at T sends nothing before T, at T+1 min sends; recipients without consent /
  capped are `skipped` with reason; re-running the job sends nothing twice.

- [ ] **ENG-14 Admin: campaigns UI** — FR-MSG-007.
  Files: `app/[locale]/admin/messaging/campaigns/**`, `modules/engagement/ui/**`, `messages/*/engagement.json`,
  `tests/e2e/engagement/campaigns.spec.ts`.
  List (status, segment, scheduled, sent/skipped counts), create/edit draft (segment + channel + marketing template +
  datetime in Asia/Jerusalem), schedule / send now / cancel, detail with per-recipient table (customer, channel,
  status sent|failed|dead|queued|skipped + reason, time).
  Accept: e2e: create campaign to a seeded segment, "send now", run job via `/api/dev` job trigger (or wait ≤ 60 s),
  detail shows per-recipient statuses incl. a `no_consent` skip.

- [ ] **ENG-15 Cross-team wiring requests + docs** — FR-MSG-004 triggers owned by others, FR-AI-009, FR-INV-008.
  Files: `ROOT/.orchestration/CHANGE-REQUESTS.md`, `CONTRACTS.md` (engagement section), `DECISIONS.md`, `BACKLOG.md`.
  CRs (nav CR already filed by the leader 2026-09-27): admin-nav hrefs → `/admin/messaging/templates`, `/admin/messaging/campaigns`, add `/admin/customers/segments`
  (platform); orders transitions → notify dispatched/delivered/backordered/lapsed; payments → payment.succeeded/failed;
  inventory restock → `stock.back_in_stock`; auth OTP/welcome/reset/email-change → notify (AS-18 order kept);
  assistant escalation → `assistant.escalation`; journey → export a results reader (replaces our SQL shim).
  Accept: every CR line present with status OPEN; CONTRACTS.md engagement table matches `index.ts` exports and
  `contracts.test.ts` passes.

- [ ] **ENG-16 Full validation pass** — all of the above.
  `npm run verify` green; `npm run test:e2e -- tests/e2e/engagement` green on :3006; manual browser pass of every
  engagement page in ar + en (RTL, no console errors, no Arabic-Indic digits in codes/prices); `/ar/dev/services`
  shows no engagement stub hit. Update HANDOVER/LEADER, tag nothing (integration merges).
