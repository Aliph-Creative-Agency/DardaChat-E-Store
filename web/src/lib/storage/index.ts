/**
 * `storage`: the app's object store (local disk now; an S3-compatible adapter later behind the same interface).
 * Every call goes through `callExternal({ service: "storage" })` so faults, timeouts and health apply.
 */
import { customAlphabet } from "nanoid";
import { callExternal } from "../adapters/call";
import type { ServiceContext } from "../context";
import { LocalStorageAdapter } from "./local";
import type { StorageAdapter, StoredObject } from "./types";

export { isValidStorageKey, LocalStorageAdapter, resolveStorageDir } from "./local";
export type { StorageAdapter, StoredObject } from "./types";

const g = globalThis as unknown as { __dardachatStorage?: StorageAdapter };
function adapter(): StorageAdapter {
  g.__dardachatStorage ??= new LocalStorageAdapter();
  return g.__dardachatStorage;
}

function call<T>(operation: string, fn: (a: StorageAdapter) => Promise<T>, ctx?: ServiceContext): Promise<T> {
  return callExternal({ service: "storage", operation, fn: () => fn(adapter()), timeoutMs: 10_000, retries: 2, ctx });
}

export const storage = {
  put: (key: string, data: Uint8Array | Buffer, contentType: string, ctx?: ServiceContext) =>
    call("put", (a) => a.put(key, data, contentType), ctx),
  get: (key: string, ctx?: ServiceContext): Promise<StoredObject | null> => call("get", (a) => a.get(key), ctx),
  delete: (key: string, ctx?: ServiceContext) => call("delete", (a) => a.delete(key), ctx),
  exists: (key: string, ctx?: ServiceContext) => call("exists", (a) => a.exists(key), ctx),
};

const keyId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

/** e.g. newStorageKey("products/media", "webp") → "products/media/2026/09/k3j…​.webp". */
export function newStorageKey(prefix: string, ext: string, now = new Date()): string {
  const clean = prefix.toLowerCase().replace(/[^a-z0-9/._-]/g, "-").replace(/^\/+|\/+$/g, "");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${clean}/${now.getUTCFullYear()}/${month}/${keyId()}.${ext.toLowerCase().replace(/^\./, "")}`;
}

/**
 * Public URL for a stored media reference: absolute URLs and paths starting with `/` (files in `public/`, used by
 * the seed per DECISIONS) are returned as is; storage keys are served by `/api/storage/<key>`.
 */
export function mediaUrl(storageKey: string): string {
  if (storageKey.startsWith("/") || /^https?:\/\//.test(storageKey)) return storageKey;
  return `/api/storage/${storageKey}`;
}
