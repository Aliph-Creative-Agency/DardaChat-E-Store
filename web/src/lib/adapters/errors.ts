/** Error classes adapters throw so `callExternal` knows whether a retry can help (CI-003). */

/** Worth retrying: timeouts, 5xx, connection resets, rate limits. Unknown errors are treated the same way. */
export class TransientError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TransientError";
  }
}

/** Retrying cannot help: invalid address, rejected credentials, 4xx validation errors. */
export class PermanentError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PermanentError";
  }
}

export class TimeoutError extends TransientError {
  constructor(readonly timeoutMs: number) {
    super(`timed out after ${timeoutMs} ms`);
    this.name = "TimeoutError";
  }
}
