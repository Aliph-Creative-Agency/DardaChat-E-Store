/**
 * Application errors shared by every module contract (DECISIONS 2026-09-26 platform/contracts).
 * Throw `AppError` for anything a caller may handle; route handlers map `httpStatus[code]`.
 */
export const APP_ERROR_CODES = [
  "not_found",
  "invalid_input",
  "conflict",
  "forbidden",
  "unauthenticated",
  "rate_limited",
  "unavailable",
  "not_implemented",
  "invalid_transition",
  "insufficient_stock",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export const httpStatus: Record<AppErrorCode, number> = {
  not_found: 404,
  invalid_input: 400,
  conflict: 409,
  forbidden: 403,
  unauthenticated: 401,
  rate_limited: 429,
  unavailable: 503,
  not_implemented: 501,
  invalid_transition: 409,
  insufficient_stock: 409,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: AppErrorCode, message: string, details?: Record<string, unknown>, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }

  get httpStatus(): number {
    return httpStatus[this.code];
  }
}

/** Thrown by Phase 0 contract stubs that cannot return plausible data. */
export class NotImplementedError extends AppError {
  constructor(what: string) {
    super("not_implemented", `${what} is not implemented yet`, { what });
    this.name = "NotImplementedError";
  }
}

export function isAppError(error: unknown, code?: AppErrorCode): error is AppError {
  return error instanceof AppError && (code === undefined || error.code === code);
}
