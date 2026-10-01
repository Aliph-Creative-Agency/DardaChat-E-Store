# Lane W1 `core` — team PLATFORM — Phase 0

Parent brief: `ROOT/.orchestration/teams/platform/BRIEF.md` (section "W1 core" is authoritative; this file adds the
lane's concrete decisions). Stack/layout: `ROOT/.orchestration/PLAN.md` §1–§2.

- **Working dir:** `D:/Personal/Projects/DardaChat-E-store` (ROOT), app in `ROOT/web`. **Branch `main`** (no worktree).
- **Ports:** Postgres **54320**, web **3000**. DB names: `dardachat` (dev), `dardachat_test` (vitest).
- **Owns:** everything under `ROOT/web/` (Phase 0). Never touch `ROOT/docs/`.
- **SRS to read** (only when a task needs it): §5 (all), Appendix A, §4.3 FR-CRT-007/009, §4.13, §2.5 CON-01/05/10,
  and the table rows named in the task you are on.

## Scope (from the parent brief, W1)
1. Next.js scaffold + every dependency later teams need + Playwright Chromium.
2. Embedded-Postgres dev DB + scripts (`db:start|stop|push|setup|seed|reset`), test DB, `.env.example`, README.
3. Full Drizzle schema for every §5 entity + what requirements imply, one `schema.ts` per module, barrel `src/db/schema.ts`.
4. `src/db/sql/append-only.sql` (FR-DAT-006) with the FR-DAT-008 erasure escape; plus DB journal triggers for the
   five mutable entities (Order, OrderLine, Customer, Address, Variant) so FR-DAT-006's journaling is guaranteed.
5. `src/lib/money.ts`, `src/lib/vat.ts` (+ `time.ts` Asia/Jerusalem business boundaries, `ids.ts` reference codes).
6. `src/modules/orders/state-machine.ts` — Appendix A.1–A.4 as data + pure transition checks, exhaustively tested.
7. Seed runner + module seeds (reference data + 5 placeholder titles etc.).
8. vitest (unit + integration) + Playwright configs and npm scripts.

## Schema → module map (decided by the lane leader; W4 contracts must follow it)
| Module file `web/src/modules/<m>/schema.ts` | Tables |
|---|---|
| core | settings (key/value jsonb), audit_entries, business_events, dead_letters, job_locks, service_health (mutable-row journal entries go into audit_entries) |
| auth | staff_users, roles, permissions, role_permissions, user_roles, sessions (subject_type customer/staff), otp_codes, totp_secrets, password_reset_tokens, rate_limit_hits |
| catalog | products, variants, media_assets, collections, collection_products, slug_redirects, product_components, seasonal_windows, static_pages, faq_entries, policies (versioned) |
| inventory | locations (origins), stock_levels, stock_movements, reservations, back_in_stock_requests, suppliers, purchase_orders, po_lines, po_receipts, po_receipt_lines |
| storefront | carts, cart_lines |
| orders | delivery_zones, orders, order_lines, order_events, idempotency_keys, shipments (consignments), shipment_lines, delivery_outcomes, returns, return_lines |
| payments | vat_rates, payments, refunds, invoices, credit_notes, number_series, einvoice_submissions, cash_remittances, remittance_allocations |
| engagement | customers, addresses, consent_records, segments, segment_memberships, message_templates (+approval state), messages (= outbox), campaigns, campaign_recipients |
| insights | data_requests, retention_settings |
| assistant | assistant_documents (retrieval corpus), assistant_conversations, assistant_messages, assistant_usage, assistant_escalations |
| journey | journey_sessions, journey_results, journey_aggregates |

Conventions: ids `uuid` default `gen_random_uuid()` (human codes are separate columns); money columns `integer`
agorot with `_agorot`-free names as in §5.2 (`subtotal`, `total`, …) and a code comment; timestamps
`timestamp with time zone` UTC; enums as `pgEnum` named `<module>_<name>`; bilingual text as `name_ar`/`name_en`
columns; snake_case column names. Cross-module FKs are allowed in schema files (schema is the one place a module may
import another module's file directly).
