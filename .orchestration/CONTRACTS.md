# Module contracts — DardaChat web

Owner: team PLATFORM (lane W4 `contracts`, Phase 0). Phase 1 teams read this before calling another module.
Status: final for Phase 0 (PLC-14, 2026-09-26; auth section + merge check PLM-11 2026-09-27, tag foundation-v1). Every module in PLAN.md §3 has its contract; the fake parts are listed at the end.

## Conventions

- **Layout.** `web/src/modules/<m>/index.ts` is the PUBLIC contract: explicit named re-exports only (no `export *`).
  `types.ts` holds DTOs/input types, `service.ts` the implementation, `jobs.ts` the module's scheduled jobs.
  Other modules import only `@/modules/<m>` (never `@/modules/<m>/service` or `schema` of another module).
- **Context.** Every contract function is `async` and takes an optional last argument `ctx?: ServiceContext`
  (`@/lib/context`): `{ db?: DbOrTx; actor?: Actor; now?: Date }`. Pass `ctx.db = tx` to join one transaction across
  modules; `ctx.actor` attributes journalled writes (`withActor`); `ctx.now` pins the clock. `dbOf(ctx)` falls back to
  the process-wide pool (shared with `@/db/client`), `nowOf(ctx)`, `actorOf(ctx)` (default `systemActor`).
- **Errors.** Throw `AppError(code, message, details?)` from `@/lib/errors`. Codes: `not_found`, `invalid_input`,
  `conflict`, `forbidden`, `unauthenticated`, `rate_limited`, `unavailable`, `not_implemented`,
  `invalid_transition`, `insufficient_stock`. `httpStatus[code]` / `err.httpStatus` maps to HTTP. `isAppError(e, code?)`.
  `NotImplementedError(what)` = `AppError("not_implemented")` thrown by stubs a caller can handle.
- **Stubs.** Reads are real simple queries on the seeded DB; cheap writes are real and thin; expensive/owned logic
  returns a plausible typed value or throws `NotImplementedError`. Every stubbed body starts with
  `// STUB(contracts): <what the owning team must do>` and calls `stubWarn("<module>.<fn>")` (`@/lib/stub`, one
  console.warn per process). `grep -rn "STUB(contracts)" web/src` lists what is still fake.
- **Money** is integer agorot everywhere (`price`, `total`, never floats). VAT rates are basis points (`1600` = 16%).
  VAT is contained in prices, never added (FR-CRT-007); maths in `@/lib/vat`.
- **Locale** is `"ar" | "en"` (Arabic default). Bilingual DTO fields are `nameAr`/`nameEn` or resolved `name` when
  the function takes `{ locale }`. Timestamps are UTC `Date`; business-day logic uses Asia/Jerusalem (`@/lib/time`).
- **Settings.** `getSetting(key, zodSchema, fallback, ctx?)` / `setSetting(key, value, ctx?)` (`@/lib/settings`,
  `settings` table). Invalid stored values warn and return the fallback. Keys are `<module>.<name>`.
- **Changing a contract.** Signatures are the product. The owning Phase 1 team may change its module's *bodies*
  freely; changing a *signature* or removing an export needs an entry in `ROOT/.orchestration/CHANGE-REQUESTS.md`
  and an update of this file and of `web/src/modules/contracts.test.ts` (the export manifest) in the same commit.
- **Auth** (`@/modules/auth`, PLATFORM) guards every staff page/route/action: see `### auth` under Modules.

## Platform services

### Messaging (`core.sendMessage`, outbox)
`sendMessage({ channels, to: { phone?, email? }, eventKey, locale, text, subject?, payload?, customerId?, dedupeKey? },
ctx?) → { messageId, channel, status: "sent"|"queued"|"failed" }` (`@/modules/core`). Channels are tried in order
(fallback): one `messages` row per channel tried, delivered synchronously through the mock adapter via `callExternal`
(3 s timeout, 1 retry). A failed row keeps `status=failed` + `nextAttemptAt` (30 s × 2^(n-1), cap 1 h); job
`core.outbox.dispatch` (every 30 s) runs `dispatchDueMessages({ limit, maxAttempts=5 })` → `dead` + a dead letter when
exhausted; rows of the same send whose sibling was delivered are retired (`superseded`). Invalid address (not E.164 /
not an email) = `PermanentError` → no retries. `dedupeKey` again returns the existing message. No address for any
channel → `AppError("invalid_input")`. Customer-facing transactional events go through `engagement.notify` instead.
```ts
await sendMessage({ channels: ["whatsapp", "sms"], to: { phone: "+970599000001" }, eventKey: "auth.otp",
  locale: "ar", text: "رمز التحقق: 123456", dedupeKey: `auth.otp:${otpId}` });
```

### Business events (`insights.recordBusinessEvent`)
`recordBusinessEvent({ type, aggregateType, aggregateId, payload? }, ctx?)` inserts into `business_events`; pass
`ctx.db = tx` so it commits/rolls back with your change. `type` = `<aggregate>.<verb>` lower snake, past tense
(`order.placed`, `payment.succeeded`, `service.degraded`); invalid names throw `invalid_input`.
`listBusinessEvents({ aggregateType?, aggregateId?, type?, limit? (50, max 500), before? }, ctx?)` newest first.

### Service health, degradation and fault injection (CI-004)
Services: `payments einvoice whatsapp sms email llm storage analytics` (`SERVICES`). `reportDegradation(service,
error, "degraded"|"down")`, `reportRecovery(service)`, `getServiceHealth()` (every service; no row = up),
`isServiceAvailable(service)`. A `service.degraded` / `service.recovered` business event is recorded only on a state
change. `callExternal` calls these for you. Faults for QA: settings `dev.faults` (toggle at `/ar/dev/services`) or env
`FAULTS=whatsapp:down,llm:slow` (env wins); modes `down` (throws), `slow` (exceeds the timeout), `flaky` (first
attempt fails). `getFault(service)`, `setFault(service, mode|null)`; reads are cached ~2 s per process.

### Adapter base (`callExternal`, CI-003)
`callExternal({ service, operation, fn: (signal) => Promise<T>, timeoutMs=5000, retries=3, baseDelayMs=200,
maxDelayMs=5000, deadLetter?: { reference?, payload }, ctx? })`: applies the injected fault, aborts at the timeout,
retries `TransientError`/timeouts/unknown errors with `min(max, base·2^n)` + ≤10 % jitter, stops at once on
`PermanentError`; on final failure writes `dead_letters` (source `<service>.<operation>`) when `deadLetter` is given,
reports degradation (not for permanent errors) and throws `AppError("unavailable", …, { service, operation,
attempts, permanent })` with `cause`. Success reports recovery. Every mock/real provider (PSP, e-invoice, LLM, SMS…)
must be called through it.

### Jobs
Each module exports `jobs: JobDefinition[]` from `src/modules/<m>/jobs.ts`: `{ name: "<module>.<job>", intervalMs,
timeoutMs? (default 5 min = lease), run({ db, now, log, signal }) }`; collected in `src/lib/jobs/registry.ts`. A
`job_locks` lease guarantees one run per interval across processes; errors are caught and stored
(`last_status='error'`, `last_error`). Runs in-process from `src/instrumentation.ts` (Node runtime; `JOBS_MODE=off`
disables) and standalone: `npm run jobs` (until Ctrl+C), `npm run jobs -- --list`, `npm run jobs -- --once <name>`
(exit 1 on failure). Jobs must be idempotent. Existing: `core.outbox.dispatch` (30 s).

### Object storage
`storage.put(key, data, contentType)`, `get(key) → { data, contentType } | null`, `delete(key)`, `exists(key)` (all
through `callExternal({ service: "storage" })`; local disk under `STORAGE_DIR`, default `web/storage`). Keys match
`^[a-z0-9][a-z0-9/._-]*$`, no `..`/empty segments (`isValidStorageKey`), else `PermanentError`.
`newStorageKey("products/media", "webp")` → `products/media/2026/09/<16 chars>.webp`. `mediaUrl(key)`: keys starting
with `/` (files in `public/`, the seed images) or `http(s)://` are returned as is, others → `/api/storage/<key>`
(served with the stored content type, `cache-control: public, max-age=31536000, immutable`; 404 if missing/invalid).

### Dev tools (`/dev/outbox`, `/dev/services`)
Dev only (404 when `NODE_ENV=production`), English, not in next-intl. `/ar/dev/outbox` (or `/en/…`): newest 200
messages with channel/status filters (`?channel=sms&status=failed&to=+9705…`) + open dead letters. `/ar/dev/services`:
health table, fault toggle per service, `job_locks`, contract stubs hit by the server process.
`GET /api/dev/outbox?to=<phone|email>&limit=50` → `{ messages: [{ id, createdAt, channel, to, eventKey, locale,
status, attempts, text, subject, providerRef, error }] }` — read an OTP in e2e tests from here.
`POST /api/dev/outbox { channel, to, text, subject?, locale?, eventKey? }` → 201 sent / 502 failed.

## Modules
### core
Owner: PLATFORM. All real. Exports: messaging (`sendMessage`, `dispatchDueMessages`, `nextAttemptDelayMs`), settings
(`getSetting`, `setSetting`, `deleteSetting`), health (`getServiceHealth`, `isServiceAvailable`, `reportDegradation`,
`reportRecovery`, `SERVICES`), faults (`getFault`, `setFault`, `FAULT_MODES`), adapters (`callExternal`,
`PermanentError`, `TransientError`, `TimeoutError`), storage (`storage`, `mediaUrl`, `newStorageKey`,
`isValidStorageKey`), primitives (`AppError`, `NotImplementedError`, `isAppError`, `httpStatus`, `dbOf`, `nowOf`,
`actorOf`, `systemActor`, `stubWarn`) + their types. Details under "Platform services".
### auth
Owner: PLATFORM. All real (merged at foundation-v1). Next-bound helpers read cookies; pure helpers take `db` first.
- Pages: `requireStaff(permission, { locale, next }) → CurrentStaff` (redirects to `/<locale>/staff/sign-in`, 2FA,
  forced password change, or `/staff/forbidden`); `requireCustomer({ locale, next })`. Every `app/[locale]/admin/**`
  page must call `requireStaff` first (walker test `admin-entrypoints.int.test.ts` fails otherwise).
- Route handlers: `export const POST = staffRoute("orders.manage", async (req, { staff, session, params, ip }) => …)`
  (401/403 JSON on deny); `customerRoute(handler)`. Server actions: `staffAction(permission, async (ctx, ...args) => …)`
  (throws `AuthError`). Reads: `getCurrentStaff()`, `getCurrentCustomer()`, `getStaffContext()`, `requestMeta()`,
  `safeNext(next)`; cookies `setSessionCookie` / `clearSessionCookie`.
- Permissions: `can(db, staffId, key)`, `permissionsOf(db, staffId)`; registry `PERMISSIONS` / `PERMISSION_KEYS`
  (`permissions.ts`), `isKnownPermission`, `grantsFor(role)`, types `Permission`, `RoleKey`. New permission = add it to
  the registry + role grants + seed (CHANGE-REQUESTS if another team needs it). Admin nav items carry a permission key.
- Audit: `audit(db, { actor, action, target: { type, id }, before?, after?, ip? })` (secrets redacted),
  `auditedMutation(db, actor, meta, fn)` (write + audit in one tx), `changed(before, after)`, `listAuditEntries`.
- Rate limit: `rateLimit(store, { key, limit, windowMs })`, `rateLimitAll`, `DbRateLimitStore`, `LIMITS`, `clientIp(headers)`.
- OTP: `issueOtp` / `verifyOtp`; delivery ports `outboxOtpDelivery(db)` / `outboxResetLinkDelivery(db)` send through
  `core.sendMessage` (events `auth.otp`, `auth.password_reset`; phone → WhatsApp, SMS fallback). `revokeAllSessions`.
- Phone: `normalizePhone(input) → { ok, e164 } | { ok:false }`, `formatPhoneForDisplay`, `maskPhone` live in `@/lib/phone`.
### catalog
Owner: CATALOG. All real reads (published only unless `includeUnpublished`); the team adds the admin write side.
| Function | Returns / notes |
|---|---|
| `getProduct(idOrSlug, { locale, includeUnpublished? }, ctx?)` | `ProductDetail \| null` (variants, media, components, seasonal windows, `nextSeasonStart`) |
| `listProducts({ locale, collection?, group?, seasonalOnly?, page=1, pageSize=24 (≤100), includeUnpublished? }, ctx?)` | `{ items: ProductSummary[], total, page, pageSize }`; collection order = its positions, else newest published |
| `search(query, { locale, limit=20 (≤50) }, ctx?)` | `ProductSummary[]` by FTS rank (`catalog_search_normalize`, Arabic-normalised); blank → `[]` |
| `getVariants(ids, ctx?)` | `VariantInfo[]` in `ids` order, unknown skipped, any status (check `status`/`productStatus`) |
| `getVariantBySku(sku, ctx?)` | `VariantInfo \| null` (SKU upper-cased) |
| `getProductComponents(productId, { locale? }, ctx?)` | `ComponentView[]` (FR-CAT-010) |
| `resolveSlugRedirect(slug, ctx?)` | `{ productId, slug } \| null` → serve 301 |
| `isInSeason(productId, at?, ctx?)` | no windows → true; else business date (Asia/Jerusalem) inside a window, ends inclusive |
| `getPolicy(kind, locale, ctx?)` | version in force (`effective_at <= now`) or null; kinds `terms privacy returns delivery` |
| `listFaq(locale, ctx?)` / `getStaticPage(slug, locale, ctx?)` | published entries / page or null |
| `listPolicyVersions(kind, locale, ctx?)` | every version newest effective first: `PolicyVersionView { ...PolicyView, status: in_force|superseded|scheduled, supersededAt }` (additive, CATALOG 2026-10-01) |
| `getPolicyVersion(kind, version, locale, ctx?)` | one version (any status) or null (additive) |
| `listCollections({ locale, featuredOnly? }, ctx?)` | active collections in curator order: `CollectionView { id, slug, name, description, imageUrl (cover of first published member), position }`; `featuredOnly` = only those with >=1 published product (additive, answers the storefront request) |
| `getCollection(slug, { locale }, ctx?)` | one active collection or null (additive) |
DTOs: `ProductSummary { id, slug, name, tagline (= SEO description for now), group, occasion, status, priceFrom,
compareAtPriceFrom, imageUrl, imageAlt, inSeason, seasonal, defaultVariantId }`, `VariantInfo { id, productId,
productSlug, sku, nameAr, nameEn, productNameAr, productNameEn, variantNameAr, variantNameEn, price, compareAtPrice, vatRateBp (null = standard), status, productStatus, weightG,
position }` — never `cost` (FR-CAT-008). Stock is not in catalog DTOs: call `inventory.getAvailability`.
### inventory
Owner: INVENTORY.
| Function | Real/STUB | Notes |
|---|---|---|
| `getAvailability(variantIds, ctx?)` | real | `Availability[]` in request order: `available = Σ max(0, onHand − reserved)` over active origins; `byLocation[{ locationCode, onHand, reserved }]`; unknown → zeros |
| `reserve({ ownerType: "cart"\|"order", ownerId, lines[{ variantId, qty }], ttlMinutes? }, ctx?)` | real | `ReservationRef`; REPLACES the owner's active hold (safe to call on every cart change); cart TTL = setting `inventory.reservation_ttl_minutes` (30), orders no expiry; locks stock rows; throws `insufficient_stock` `{ variantId, requested, available }`, `invalid_input` for qty ≤ 0 |
| `release(ownerType, ownerId, ctx?)` | real | number of reservations released |
| `listLocations(ctx?)` | real | active locations (`STORE`, `HOME` origins) |
| `requestBackInStock({ variantId, contact { phone?, email? }, locale, customerId? }, ctx?)` | real (INV-08) | `{ requestId, created }` (**`created` added**): phone normalised to E.164, email lower-cased; an open request for the same variant+contact returns the existing id (`created: false`); variant currently available → `conflict`; no contact and no customer → `invalid_input`. Public route `POST /api/inventory/back-in-stock` (rate-limited) |
| `notifyBackInStock(variantIds?, ctx?)` | real (INV-08) | ids of requests notified: each open request whose variant is now available → `engagement.notify("stock.back_in_stock")` (transactional, no consent gate; SHIM falls back to `core.sendMessage`), sets `notified_at`. Also job `inventory.back_in_stock.notify` (5 min) |
| `cancelBackInStockRequest(requestId, ctx?)` | real | `boolean` (false if already notified/cancelled); audited |
| `commitDispatch({ orderId, shipmentId?, lines, locationCode }, ctx?)` | real (INV-04) | `{ movementIds }`: `sale_online` −qty per line in one tx, shrinks/releases the order's hold by the dispatched qty (partial dispatch keeps the rest held); idempotent per `shipmentId` (else per order) — a replay writes nothing |
| `restoreOnReceipt({ orderId, returnId?, lines, locationCode }, ctx?)` | real (INV-04) | `{ movementIds }`: `return` +qty, idempotent per `returnId`; runs backorder resume + back-in-stock after commit |
| `writeOff({ variantId, qty, locationCode, reason, kind? }, ctx?)` | real (INV-04) | `{ movementIds }`; `kind` (**added, optional**) `"adjustment"` (default) \| `"loss_in_transit"`; empty reason / qty ≤ 0 → `invalid_input`; below on-hand/held → `conflict`; audited |
| `recordShortfall({ orderId, orderLineId, qty }, ctx?)` | real (INV-05) | void: line must belong to the order and qty ≤ line qty (`invalid_input`); sets `order_lines.shortfall_qty`, shrinks the hold to what is held. ORDERS moves the order to BACKORDERED |
| `resumeBackorders(variantIds, ctx?)` | real (INV-05) | order ids resumed: oldest BACKORDERED first, re-reserves the shortfall, clears it and calls `orders.transition(fulfilment → PROCESSING, "shortfall_cleared")` when every line is clear. Called by inventory after any stock-in |
| `setHoldExpiry(ownerType, ownerId, expiresAt \| null, ctx?)` | real (INV-03) | number of holds updated; ORDERS clears the expiry (`null`) when a prepaid order is paid |
| `pendingOrderTtlMinutes(ctx?)` | real (INV-03) | setting `inventory.pending_order_ttl_minutes` (default 60); ORDERS passes it as `ttlMinutes` when reserving a prepaid order |
| `reacquireOrderHold(orderId, ctx?)` | real (INV-07) | `ReservationRef`: re-reserves the order's lines with the pending TTL (payment retry); `insufficient_stock` `{ variantId, requested, available }`, nothing held |
| `adjustStock({ variantId, locationCode, delta, reasonCode, note }, ctx)` | real (INV-06) | `{ movementId }`; `ctx.actor` must be staff (`forbidden`); `reasonCode` ∈ `ADJUSTMENT_REASON_CODES` (`count_correction`, `damaged`, `found`, `opening_balance`, `other`), note mandatory (`other` ≥ 3 chars); stored as `adjustment` with reference `adjust:<code>`; audited |
| `transferStock({ variantId, fromCode, toCode, qty, note? }, ctx)` | real (INV-06) | `{ transferId, movementIds }`: `transfer_out` −qty + `transfer_in` +qty in one tx, shared reference `transfer`/`transferId`; same location → `invalid_input`; beyond free stock at source → `conflict`; staff only; audited |
| `receivePurchaseStock({ receiptId, locationCode, lines, note?, deferFollowUps? }, ctx?)` | real (PUR-03) | `{ movementIds, restockedVariantIds }`: `purchase_receipt` +qty per line, idempotent per `receiptId`. Only PURCHASING calls it |
Types: `Availability`, `LocationStock`, `LocationView`, `ReservationRef`, `ReserveInput`, `StockLineInput`,
`CommitDispatchInput`, `RestoreOnReceiptInput`, `WriteOffInput`, `RecordShortfallInput`, `BackInStockInput`,
`ReceivePurchaseStockInput`, `StockMovementResult`, `AdjustStockInput`, `TransferStockInput`, `AdjustmentReasonCode`.
Jobs: `inventory.reservations.sweep` (2 min: expired order holds → PENDING orders CANCELLED `reservation_expired` +
`order.lapsed` message; expired cart holds released) and `inventory.back_in_stock.notify` (5 min).
Reservation owner id lives in `reservations.order_id` (cart id or order id, both UUIDs). Availability is derived from
reservations; `stock_levels.reserved` is not maintained. Every stock change goes through the ledger writer (one
movement per change, rows locked, on-hand never below 0 or below active holds). Admin: `/admin/inventory` (levels,
ledger, adjust, transfer, back-in-stock).
### purchasing
Owner: INVENTORY (Phase 1 module; tables in `inventory/schema.ts`). Unit costs are Owner-only: callers pass
`opts.includeCost = can(staff, "inventory.cost.read")`; without it costs are neither stored from input nor returned.
| Function | Real/STUB | Notes |
|---|---|---|
| `listSuppliers({ q?, activeOnly? }, ctx?)` / `getSupplier(id, ctx?)` | real | `Supplier { id, name, contactName, phone, email, address, paymentTerms, leadTimeDays, notes, isActive, … }` |
| `saveSupplier({ id?, name, contactName?, phone?, email?, address?, paymentTerms?, leadTimeDays?, notes?, isActive? }, ctx?)` | real | `Supplier`; zod (phone → E.164, `invalid_input` with `details.fields`), audited create/update; unknown id → `not_found` |
| `createPurchaseOrder(PurchaseOrderDraftInput, opts?, ctx?)` | real | `{ id, code }`: draft, code `PO-<yyyy>-<nnn>` (Jerusalem year, advisory lock) |
| `updateDraft(id, PurchaseOrderDraftInput, opts?, ctx?)` | real | draft only (`invalid_transition`); without `includeCost` existing line costs are kept |
| `issuePurchaseOrder(id, ctx?)` / `cancelPurchaseOrder(id, reason?, ctx?)` | real | state table `PO_TRANSITIONS` (`canTransition(from, to, trigger)`); cancel refused after any receipt |
| `receivePurchaseOrder(poId, { locationCode, lines[{ poLineId, qty, unitCost? }], notes? }, opts?, ctx?)` | real | `{ receiptId, status, movementIds }`: one tx (po_receipts + lines, `inventory.receivePurchaseStock`, `qty_received`, status → partially_received / received); over-receipt → `conflict` `{ remaining }`; after commit backorder resume + back-in-stock |
| `getPurchaseOrder(id, opts?, ctx?)` / `listPurchaseOrders({ status?, supplierId? }, ctx?)` | real | `PurchaseOrder` (lines, receipts) or null / `PurchaseOrderSummary[]` |
Statuses `PURCHASE_ORDER_STATUSES`: draft → issued → partially_received → received; draft/issued → cancelled.
Admin: `/admin/purchasing/{orders,suppliers}` (`purchasing.read` / `purchasing.write`).
### orders
Owner: ORDERS. Also re-exports the Appendix A tables/checks from `state-machine.ts` (`FULFILMENT_*`, `PAYMENT_*`,
`assertTransition`, `canTransition`, `allowedTransitions`, `completionAllowed`, `TransitionError`, …).
| Function | Real/STUB | Notes |
|---|---|---|
| `placeOrder({ customerId?, contact { name, phone, email? }, locale, lines[{ variantId, qty }], address { zoneId, city, line1, line2?, landmark?, notes?, recipientName?, recipientPhone? }, paymentMethod, idempotencyKey, customerNote? }, ctx?)` | real (ORD-04) | `{ order: OrderView, replayed }`; one tx (journalled to `ctx.actor`): idempotency replay (also on a concurrent duplicate), catalogue prices (variant `active` + product `published`, else `invalid_input`), `payments.computeTotals` + `quoteDeliveryFee`, reference `DC-XXXX-XXXX`, orders + order_lines (name snapshots) + order_events (`placed` on both machines; COD also `cod_accepted` → COD_CONFIRMED/COD_DUE), `inventory.reserve` owner "order" (`insufficient_stock` rolls everything back), business event `order.placed`; COD: minimal zone `codEligible` + cap (`payments.cod_max_total`, zone `codMaxTotal`) check, then `engagement.notify("order.confirmation")` after commit (failure logged, order stands). Prepaid stays PENDING/UNPAID. Full zone resolution (locality row wins; inactive/unknown zone → `invalid_input`), origin by `orders.origin_rule` (zone / whole_stock / default), prepaid `reservation_expires_at` (job `orders.reservations.expire`). Out of scope (BACKLOG): discount codes, free-delivery threshold |
| `transition(orderId, { machine, to, trigger?, data? }, ctx?)` | real (ORD-03: state + order_events + Appendix A side effects via inventory/payments/engagement ports) | `{ orderId, machine, from, to, trigger, eventId }`; Appendix A check (+ DELIVERED→COMPLETED payment guard) else `invalid_transition` `{ machine, from, to, trigger, reason }`; sets dispatched/delivered/completed/cancelledAt; row locked `for update`; `not_found` |
| `getOrder(idOrReference, ctx?)` | real | `OrderView` or null; reference parse is tolerant (`dc 7k3m q9tx`) |
| `listCustomerOrders(customerId, { page?, pageSize? }, ctx?)` | real | `{ items: OrderSummary[] (id, reference, states, total, itemCount, placedAt), total }` newest first |
| `getCustomerOrder(customerId, reference, ctx?)` | real (ORD-17) | `CustomerOrderView` or `null` — the caller's OWN order only: someone else's, a guest order, unknown or malformed reference → `null` (routes answer 404 `not_found`, never 403). Reference parse is tolerant. View (built field by field): `reference`, both states, `paymentMethod`, `locale`, `contact`, `totals`, `lines[]` (id, sku, names, qty, shortfallQty, prices), `address` (snapshot; the customer's delivery instructions are `deliveryNotes`), `zone { nameAr, nameEn }`, `customerNote`, placed/dispatched/delivered/completed/cancelledAt, `revisedExpectation` (BACKORDERED), `estimate` (window from placement while nothing dispatched), `consignments[] { dispatchReference, dispatchedAt, deliveredAt, outcome, estimate, lines }`, `timeline[] { at, machine, from, to }` (state changes only), `returns[]`, `can { cancel, requestReturn, returnUntil }`. Never: order/customer/staff ids, internal notes, origin, journal data, failed-delivery reasons. Types `CustomerOrderView`, `CustomerOrderLine`, `CustomerOrderAddress`, `CustomerConsignment`, `CustomerTimelineEntry`, `CustomerReturn`. |
| `listOrderEvents(orderId, ctx?)` | real | order_events rows, oldest first |
| `listDeliveryZones({ activeOnly? = true }, ctx?)` | real | `DeliveryZoneView[]` by position |
| `quoteDeliveryFee(zoneId, subtotal, ctx?)` | real | zone flat rate (agorot, VAT-incl.), edited in `/admin/delivery/zones` (ORD-18); inactive → `invalid_input`; no free-delivery threshold (BACKLOG) |
| `estimateDelivery(zoneId, placedAt?, ctx?)` | real | `{ zoneId, minDays, maxDays, earliest, latest }` business dates (Asia/Jerusalem), skipping setting `orders.non_delivery_weekdays` (default `[5]` Friday) |
`OrderView { id, reference, customerId, fulfilmentState, paymentState, paymentMethod, locale, contact, totals { subtotal,
discount, delivery, total, vat, vatRateBp }, lines[], address (snapshot), zone { id, nameAr, nameEn }, originLocationId,
customerNote, placedAt, dispatchedAt, deliveredAt, completedAt, cancelledAt }`.
Customer order API (ORD-17, `customerRoute`, JSON, `cache-control: no-store`; POSTs require `content-type: application/json`, else 415): `GET /api/orders?page=&pageSize=` (own list: reference, states, total, itemCount, placedAt), `GET /api/orders/:reference` → `{ order: CustomerOrderView }`, `POST /api/orders/:reference/cancel {reason?}` (customer may cancel from PENDING/PAID/COD_CONFIRMED/BACKORDERED, else 409 `invalid_transition`), `POST /api/orders/:reference/return-request {reasonCode, kind?, note?, lines[{orderLineId, qty}]}` → 201 `{ returnId, order }` (DELIVERED, within `orders.return_window_days`, reason from `orders.return_reasons`), `POST /api/orders/:reference/returns/:returnId/withdraw`. Errors `{ error, details? }`; not own / unknown → 404 `not_found`; no session → 401.
### payments
Owner: PAYMENTS.
| Function | Real/STUB | Notes |
|---|---|---|
| `getActiveVatRate(at?, ctx?)` | real | bp from `vat_rates` (greatest `effective_from` <= business date); `not_found` if none |
| `computeTotals({ lines[{ unitPrice, qty, vatRateBp? }], discount?, deliveryFee, at? }, ctx?)` | real | `Totals` = `OrderTotals` of `@/lib/vat` (`subtotal, discount, delivery, total, vat` "of which", `rateBp`, `lines`); VAT contained, never added; mixed rates → `invalid_input` |
| `verifyWebhookSignature(rawBody, signature)` | real (sync) | HMAC-SHA256 hex (`sha256=` prefix ok) with `PAYMENT_WEBHOOK_SECRET`, timing-safe |
| `initiatePayment({ orderId, method, returnUrl, locale }, ctx?)` | real (PAY-03) | `{ paymentId, redirectUrl }`: order must exist, `method` = the order's method; COD → `redirectUrl: null`, no row. Prepaid: fulfilment PENDING (or PAYMENT_FAILED = retry → `orders.transition` PAYMENT_FAILED→PENDING `payment_retry`) and payment UNPAID else `invalid_transition`; PSP session via `callExternal({ service: "payments" })` (provider down → `unavailable`, nothing written); appends `payments` row capture/pending with the provider ref; `redirectUrl` = mock hosted page `/<locale>/dev/psp?s=<signed token>`. `returnUrl` must be app-relative or on APP_URL. Retry (PAY-06) is atomic: `insufficient_stock` from the transition side effect or provider down → order stays PAYMENT_FAILED, no row; success → new paymentId + session for the SAME order (nothing re-entered) |
| `handleProviderWebhook(rawBody, signature, ctx?)` | real (PAY-04) | `{ accepted, duplicate, outcome? }` (`outcome` additive: applied / late_capture / amount_mismatch / ignored / duplicate); `accepted: false` → 401. Body (provider-neutral JSON): `{ eventId, type: payment.authorised|payment.captured|payment.failed, providerRef, paymentId?, orderId, amount, method, failureCode? }`; malformed or not matching our pending session → `invalid_input` (400). One tx: order row locked, ledger row appended (dedupe `payments_provider_event_uq` → duplicate, no side effects), `orders.transition` payment UNPAID→AUTHORISED/PAID + fulfilment PENDING→PAID, or fulfilment PENDING→PAYMENT_FAILED; business events `payment.succeeded|failed|late_capture|amount_mismatch` (aggregate order); after commit `engagement.notify(payment.succeeded|failed)`. Route `POST /api/webhooks/psp`, header `x-psp-signature` |
| `refund({ orderId, amount, method, reason, receivingParty?, refundedAt? }, ctx) → RefundResult { refundId, status, providerRef, paymentState, creditNoteId }` | REAL (payments PAY-11) | payment state PAID/COD_SETTLED/PART_REFUNDED else `invalid_transition`; Σ refunds ≤ paid else `invalid_input`; `method` = the order's prepaid method (PSP; down → `unavailable`, refund row failed) or `cash`/`bank_transfer` (receivingParty required); → PART_REFUNDED/REFUNDED + credit note when invoiced + event `payment.refunded` + audit |
| `issueInvoiceIfDue(orderId, ctx?)` | real (PAY-08) | `{ invoiceId, number } | null`. Locks the order row; existing invoice → returned (never a second). Due: prepaid when `dispatchedAt` set (first dispatch incl. PARTIALLY_DISPATCHED) and payment PAID/PART_REFUNDED/REFUNDED; COD when `deliveredAt` set; otherwise null. Number `INV-000001` from `next_series_number('invoice')` in the same tx (gapless, rollback reuses the number). Amounts + `vatRateBp` from the order (rate at sale); frozen `snapshot` (seller from settings `shop.legal_name_ar|en`, `shop.vat_number`, `shop.address`; buyer, lines, totals, locale). Queued for e-invoicing as `clearance_status = not_submitted`. Business event `invoice.issued`. Unknown order → `not_found`. ORDERS calls it after setting dispatchedAt / deliveredAt |
| `getPaymentSummary(orderId, ctx?)` | real read | `{ orderId, paidAmount (Σ succeeded capture+cash), lastStatus, events[] }` |
| `paymentErrorKey(error)` (+ type `PaymentErrorKey`) | real (sync, PAY-06) | message key under `payments.errors.*`: `providerDown` (AppError `unavailable`), `outOfStock` (`insufficient_stock`, retry with stock gone), `generic` (any other thrown error); a ledger `failureCode` string → `timeout` / `declined` (anything else). Storefront shows `t(`payments.errors.${key}`)` after a failed `initiatePayment` or on a PAYMENT_FAILED order (latest failed row's `failureCode`) |
| `getCodEligibility({ zoneId, total }, ctx?)` (+ types `CodEligibility`, `CodEligibilityInput`) | real (PAY-07) | FR-PAY-001 one COD rule: `{ eligible, reason?: "zone_disabled" \| "over_limit", maxTotal }`. Zone must be active + `codEligible` (else `zone_disabled`, `maxTotal: 0`); cap = min(zone `codMaxTotal`, setting `payments.cod_max_total` default 100 000 agorot); `total > cap` → `over_limit` (`total == cap` is eligible). Unknown zone → `not_found`; non-integer/negative total → `invalid_input`. Settings edited at `/admin/payments/settings` (also `payments.cod_unreconciled_days`, default 7). ORDERS may replace its inline COD check in placeOrder with this |
| *Not in the public contract (internal to PAYMENTS, listed for integration)* | real (PAY-09..17) | Invoicing: `modules/invoicing` (credit notes `issueCreditNote`, e-invoice job `einvoice/*` submitting due documents to the mock tax authority `/dev/tax-authority`, status never `cleared` without a reference, failures alert the Owner), register `/admin/invoices` + CSV `GET /api/payments/invoices/export`, PDFs (staff-only, `?locale=ar|en`, `?download=1`): `GET /api/payments/invoices/<id>/pdf`, `/api/payments/credit-notes/<id>/pdf`, `/api/payments/orders/<id-or-reference>/packing-slip` (Playwright Chromium, needs `npx playwright install chromium`). COD remittances `/admin/payments/remittances`. Mock PSP `/<locale>/dev/psp`, webhook `POST /api/webhooks/psp` (`x-psp-signature`) |
### engagement
Owner: ENGAGEMENT. Phones E.164 (`invalid_input` otherwise — normalise with the auth phone helper first), emails lower-cased.
| Function | Real/STUB | Notes |
|---|---|---|
| `notify(event, recipient { customerId?, phone?, email?, locale? }, data?, ctx?)` | real send, STUB texts | `{ messageIds }`; `event` ∈ `TRANSACTIONAL_EVENTS` (order.confirmation, payment.succeeded, payment.failed, order.dispatched, order.delivered, account.welcome, account.password_reset, account.email_changed); contact/locale from the customer row when omitted; phone → whatsapp→sms, email → email (one id per group); built-in ar/en default texts (`default-texts.ts`) until templates are approved; dedupe `<event>:<data.dedupeRef \| orderId \| customerId>` (password_reset/email_changed only with dedupeRef/orderId), email group key suffixed `:email`; no transactional consent gate; no contact or erased customer → `[]`; unknown customer → `not_found` |
| `recordConsent({ customerId, channel?, purpose, granted, source, policyVersion?, evidence? }, ctx?)` | real | appends to the ledger; stored purpose `<purpose>_<channel>` (e.g. `marketing_whatsapp`) or `purpose` alone (terms, privacy) |
| `hasConsent(customerId, channel \| null, purpose = "marketing", ctx?)` | real | latest record wins; no record → false |
| `listConsents(customerId, { history? }, ctx?)` | real | current state per purpose; `history: true` → full ledger newest first |
| `consentPurpose(purpose, channel?)` | real (sync) | the stored purpose key |
| `getCustomer(id, ctx?)` / `findCustomerByContact({ phone?, email? }, ctx?)` | real | `CustomerView { id, name, email, phone, locale, status, isGuest, createdAt }` or null; phone match beats email |
| `upsertCustomer({ name?, phone?, email?, locale, isGuest? = true }, ctx?)` | real | `{ customer, created }`; matches phone then email, fills missing fields only, never merges two customers; journalled to `ctx.actor` |
| `listAddresses(customerId, ctx?)` / `saveAddress(customerId, { id?, label?, recipientName, phone, governorate, locality, line1, line2?, landmark?, notes?, isDefault? }, ctx?)` | real | `AddressView`; first address is default, a new default clears the others; `not_found` for a foreign/unknown id; journalled |
Marketing sends (campaigns, segments, templates, back-in-stock notices) are engagement-internal and must check `hasConsent`.
### insights
Owner: INSIGHTS (implementation in `src/lib/events.ts`, PLATFORM). Real: `recordBusinessEvent(input, ctx?)`,
`listBusinessEvents(query?, ctx?)` — see "Business events". Types `BusinessEvent`, `BusinessEventInput`,
`ListBusinessEventsQuery`.
### assistant
Owner: ASSISTANT. Empty contract (`export {}`): nobody calls the assistant. It consumes catalog/orders and calls the
LLM through `callExternal({ service: "llm" })`.
### journey
Owner: JOURNEY. Empty contract (`export {}`): concept owned by the client and still open (BACKLOG). Consumes catalog,
records `journey.*` events via insights.
### storefront
Owner: STOREFRONT. Empty contract (`export {}`): carts/checkout are private to it; it consumes the other contracts.

**Export manifest:** `web/src/modules/contracts.test.ts` pins every module's export names; keep it passing.

## Stubs left for Phase 1
From `grep -rn "STUB(contracts)" web/src` (plus `stubWarn` names; `/ar/dev/services` shows which ones the running
server has hit). Remove the marker + `stubWarn` when you replace a stub.
| Module | Function / place | Owner | What is fake now | What the owner must build |
|---|---|---|---|---|
| inventory | `commitDispatch`, `restoreOnReceipt`, `writeOff`, `recordShortfall`, `requestBackInStock` | INVENTORY | — | DONE on team/inventory (INV-04/05/08); no `STUB(contracts)` left in `modules/inventory`. Remaining SHIM: `notify-shim.ts` falls back to `core.sendMessage` until ENGAGEMENT adds `order.lapsed` / `stock.back_in_stock` |
| payments | `initiatePayment` | PAYMENTS | REAL in team/payments (PAY-03/06): pending `payments` row, PSP adapter via `callExternal`, mock hosted page `/<locale>/dev/psp` | real provider adapter when the client picks one (BACKLOG) |
| payments | `handleProviderWebhook` | PAYMENTS | REAL in team/payments (PAY-04): HMAC, idempotent ledger, order transitions | provider-specific event mapping (BACKLOG) |
| payments | `refund` | PAYMENTS | REAL in team/payments (PAY-11) | PSP / cash refunds, credit notes (FR-PAY, FR-ORD-020) |
| payments | `issueInvoiceIfDue` | PAYMENTS | REAL in team/payments (PAY-08..): gapless numbering, snapshot, mock tax authority submission/clearance/retry job | real tax-authority adapter (BACKLOG) |
| engagement | `notify` texts (`default-texts.ts`) | ENGAGEMENT | built-in ar/en default texts | render from approved `message_templates` (Meta approval for WhatsApp), channel preferences, quiet hours |
| orders | `placeOrder` rules | ORDERS | DONE on team/orders (ORD-04) — no `STUB(contracts)` left | discount codes + free-delivery threshold stay in BACKLOG (no client promotion rules) |
| orders | `quoteDeliveryFee` | ORDERS | DONE on team/orders (zone flat rate, ORD-18 admin) | thresholds / promotions (BACKLOG) |
| orders | `transition` side effects | ORDERS (+ INVENTORY, PAYMENTS, ENGAGEMENT) | DONE on team/orders (ORD-03) | — |
| assistant, journey, storefront | empty contracts | their teams | `export {}` | nothing needed by other modules |
