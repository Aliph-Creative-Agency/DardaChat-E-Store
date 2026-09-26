/**
 * Error-copy convention (NFR-USA-005). Every user-facing error message says WHAT HAPPENED and WHAT TO DO, in both
 * locales. Generic cases live in `common.json` `errors.codes.*`; a module adds its own specific messages to its own
 * namespace following the same two-part rule (e.g. `payments.errors.cardDeclined`).
 *
 * Usage (server or client):
 *   const t = useTranslations("common");            // or await getTranslations("common")
 *   t(errorMessageKey(result.code));                 // code from an action/API result, unknown → server
 *   t(errorMessageKey(errorCodeFromStatus(res.status)));
 */

export const ERROR_CODES = [
  "notFound",
  "unauthorized",
  "forbidden",
  "validation",
  "conflict",
  "rateLimited",
  "network",
  "unavailable",
  "server",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Message key relative to the `common` namespace. */
export type ErrorMessageKey = `errors.codes.${ErrorCode}`;

const CODE_SET: ReadonlySet<string> = new Set(ERROR_CODES);

/** Aliases other modules are likely to use (snake/HTTP-ish names) mapped to the canonical code. */
const ALIASES: Record<string, ErrorCode> = {
  not_found: "notFound",
  unauthenticated: "unauthorized",
  permission_denied: "forbidden",
  invalid: "validation",
  invalid_input: "validation",
  rate_limited: "rateLimited",
  too_many_requests: "rateLimited",
  offline: "network",
  timeout: "network",
  degraded: "unavailable",
  internal: "server",
};

export function isErrorCode(code: unknown): code is ErrorCode {
  return typeof code === "string" && CODE_SET.has(code);
}

/** Canonical code for any value (unknown or missing → `server`). */
export function toErrorCode(code: unknown): ErrorCode {
  if (isErrorCode(code)) return code;
  return (typeof code === "string" && Object.hasOwn(ALIASES, code) && ALIASES[code]) || "server";
}

/** Message key for an error code; pass to `t()` from the `common` namespace. */
export function errorMessageKey(code: unknown): ErrorMessageKey {
  return `errors.codes.${toErrorCode(code)}`;
}

/** Canonical code for an HTTP status (fetch results, route handlers). */
export function errorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
    case 422:
      return "validation";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
    case 410:
      return "notFound";
    case 409:
    case 412:
      return "conflict";
    case 429:
      return "rateLimited";
    case 502:
    case 503:
    case 504:
      return "unavailable";
    default:
      return status === 0 ? "network" : "server";
  }
}
