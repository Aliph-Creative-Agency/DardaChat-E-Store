/**
 * PUBLIC contract of `assistant` (team ASSISTANT): intentionally empty in Phase 0 — no other module calls the
 * assistant. The assistant itself is a consumer: it reads through `@/modules/catalog` (products, policies, FAQ),
 * `@/modules/orders` (order status for a signed-in customer) and calls the LLM through `callExternal({ service:
 * "llm" })` from `@/modules/core`. If another module later needs something from here (e.g. usage totals for
 * insights), add it with a CHANGE-REQUESTS.md entry and extend `src/modules/contracts.test.ts`.
 */
export {};
