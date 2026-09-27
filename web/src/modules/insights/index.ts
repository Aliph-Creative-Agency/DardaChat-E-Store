/**
 * PUBLIC contract of `insights` (team INSIGHTS): business events (NFR-MNT-005). Every module records domain facts
 * with `recordBusinessEvent({ type: "<aggregate>.<verb>", aggregateType, aggregateId, payload }, ctx)`; pass
 * `ctx.db = tx` so the event commits or rolls back with the change. Reports read them with `listBusinessEvents`.
 * Real (implemented in `src/lib/events.ts`, owned by PLATFORM); the insights team adds dashboards on top.
 */
export { listBusinessEvents, recordBusinessEvent } from "../../lib/events";
export type { BusinessEvent, BusinessEventInput, ListBusinessEventsQuery } from "../../lib/events";
