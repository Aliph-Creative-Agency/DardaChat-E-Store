# Lane W4 `contracts` — team PLATFORM — Phase 0

Parent brief: `ROOT/.orchestration/teams/platform/BRIEF.md` (section "W4 contracts" is authoritative; this file adds the
lane's concrete decisions). Stack/layout: `ROOT/.orchestration/PLAN.md` §1–§2. W1 conventions:
`ROOT/.orchestration/teams/platform/lanes/core/HANDOVER.md`, `ROOT/web/README.md`, and every `platform/core` line in
`ROOT/.orchestration/DECISIONS.md` (schema→module map, snake_case casing, append-only ledgers, withActor, seeds).

- **Working dir:** `D:/Personal/Projects/DardaChat-wt/platform-contracts` (git worktree), app in `.../web`.
  **Branch `platform/contracts`** (from `main` @ 827abc4). The platform leader merges it into `main` with W2/W3.
- **Ports:** Postgres **54332**, web **3012** (already in `web/.env.local`). DB names `dardachat` / `dardachat_test`.
- **Parallel lanes:** W2 `auth` (worktree `platform-auth`, 54330/3010) and W3 `shell` (`platform-shell`, 54331/3011).
  Never touch their worktrees or their paths.

## Owned paths (only these; see DECISIONS.md "file ownership inside Phase 0")
- `web/src/lib/{errors,context,settings,events,health,faults,stub}.ts` (+ their `*.test.ts`)
- `web/src/lib/adapters/**`, `web/src/lib/channels/**`, `web/src/lib/jobs/**`, `web/src/lib/storage/**`
- `web/src/modules/<m>/{index,types,service,jobs}.ts` (+ tests) for m in core, catalog, inventory, orders, payments,
  engagement, insights, assistant, journey, storefront. Extra helper files inside those module folders are fine
  (e.g. `core/messaging.ts`). **Not** `modules/auth/**` (W2). Do not edit existing `schema.ts`/`seed.ts`/`state-machine.ts`
  unless a task says so (schema changes need a DECISIONS.md line; W2/W3 may also touch schema → merge risk).
- `web/src/instrumentation.ts`, `web/scripts/jobs.ts`, the single `"jobs"` script line in `web/package.json`
- `web/src/app/[locale]/dev/**`, `web/src/app/api/dev/**`, `web/src/app/api/storage/**`, `web/tests/e2e/core/**`
- `ROOT/.orchestration/CONTRACTS.md`, this lane folder. Append-only: `DECISIONS.md`, `BACKLOG.md`, `CHANGE-REQUESTS.md`.
- Do **not** edit `web/README.md`, `src/app/[locale]/layout.tsx`, `globals.css`, `messages/**`, `proxy.ts`/middleware,
  `src/lib/{session,audit,rate-limit,phone,password,format,bidi}*` (W2/W3 territory).

## SRS to read (only when the task needs it)
§3.3 (software interfaces), §3.4 CI-003/CI-004, §4.11 FR-MSG-004, NFR-MNT-005, NFR-AVL-004/005, §5.1–5.2 for DTO field
names, plus the FR rows a contract function serves (e.g. FR-INV-* for inventory signatures, FR-ORD-* for orders).

## Scope
1. Shared primitives: errors, ServiceContext, settings helper, stub marker.
2. Business events helper (NFR-MNT-005), degradation registry + `reportDegradation()` (CI-004), fault injection.
3. Adapter base: timeout, exponential backoff retry, permanent/transient errors, dead-letter table (CI-003).
4. Mock WhatsApp/SMS/email channels + outbox (`messages` table) + `core.sendMessage` + retry dispatcher.
5. Job scheduler with DB lease lock, per-module `jobs.ts`, in-process runner + `npm run jobs`.
6. Object storage adapter (local disk, `STORAGE_DIR`) + `/api/storage/*` serving + `mediaUrl()`.
7. `/dev/outbox` and `/dev/services` dev pages (+ JSON route for e2e).
8. `index.ts` contract for every module in PLAN §3 with typed working stubs (reads hit the seeded DB; writes are thin
   or plausible), `ROOT/.orchestration/CONTRACTS.md`, a manifest test that pins every contract's export names.

## Stub policy (decided)
- **Read** functions do real, simple queries on the seeded DB (products, zones, stock, VAT, consent…) so teams get
  realistic data. **Cheap writes** are real and thin (business events, consent, reservations, outbox, a minimal
  placeOrder/transition so storefront can show a placed order). **Expensive/owned logic** (refunds, invoices,
  dispatch ledger writes, PSP) returns a plausible typed value or throws `NotImplementedError` where the caller can
  handle it. Every stubbed body starts with `// STUB(contracts): <what the owning team must do>` and calls
  `stubWarn("<module>.<fn>")` (one console.warn per process).
- Signatures are the product. Get the DTOs right (§5.2 names, agorot integers, ar/en fields, Actor, ctx) even where
  the body is a stub. Owning Phase 1 teams keep signatures or file a change request.
