/**
 * PUBLIC contract of `core` (team PLATFORM): outbound messaging (outbox), settings, service health / degradation
 * (CI-004), the adapter base for external calls (CI-003), object storage and shared errors/context.
 * Other modules import from `@/modules/core` only. See ROOT/.orchestration/CONTRACTS.md.
 */

// Messaging (outbox + mock WhatsApp/SMS/email channels)
export { dispatchDueMessages, nextAttemptDelayMs, sendMessage } from "./messaging";
export type { DispatchResult, MessageChannel, SendMessageInput, SendMessageResult } from "./messaging";

// Settings (key/value, zod-validated reads)
export { deleteSetting, getSetting, setSetting } from "../../lib/settings";

// Service health, degradation registry, fault injection
export { getServiceHealth, isServiceAvailable, reportDegradation, reportRecovery, SERVICES } from "../../lib/health";
export type { ServiceHealth, ServiceName, ServiceStatus } from "../../lib/health";
export { FAULT_MODES, getFault, setFault } from "../../lib/faults";
export type { FaultMode } from "../../lib/faults";

// Adapter base for every external call
export { callExternal, PermanentError, TimeoutError, TransientError } from "../../lib/adapters";
export type { CallExternalOptions } from "../../lib/adapters";

// Object storage (local disk now, S3-compatible later)
export { isValidStorageKey, mediaUrl, newStorageKey, storage } from "../../lib/storage";
export type { StorageAdapter, StoredObject } from "../../lib/storage";

// Shared primitives
export { AppError, httpStatus, isAppError, NotImplementedError } from "../../lib/errors";
export type { AppErrorCode } from "../../lib/errors";
export { actorOf, dbOf, nowOf, systemActor } from "../../lib/context";
export type { Actor, DbOrTx, ServiceContext } from "../../lib/context";
export { stubWarn } from "../../lib/stub";
