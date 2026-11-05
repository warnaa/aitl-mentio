/**
 * Typed application error hierarchy. Services throw these; nothing else builds an
 * HTTP response. `apiHandler` maps a thrown `AppError` to the right status code and
 * the shared JSON envelope — see `apiHandler.ts`.
 */
export type FieldErrors = Record<string, string[]>;

/** Extra response headers an error asks `apiHandler` to send (e.g. `Retry-After`). */
export type ErrorHeaders = Readonly<Record<string, string>>;

export interface AppErrorOptions {
  fieldErrors?: FieldErrors;
  cause?: unknown;
  headers?: ErrorHeaders;
  /** Seconds until a refused request may be retried; sent in the failure envelope. */
  retryAfterSeconds?: number;
}

/**
 * Brands every `AppError` across module copies. Next compiles `core` once for route
 * handlers and again for server components, and the shared container (cached on
 * `globalThis`) builds services from whichever copy loaded first, so a service can throw
 * another copy's `NotFoundError`. Plain `instanceof` then fails: `apiHandler` answered a
 * 404 as a logged 500, and pages missed their not-found branch.
 */
const APP_ERROR = Symbol.for('devmentor.app-error');

export class AppError extends Error {
  /**
   * The fixed `code` of a concrete subclass, which identifies it across module copies.
   * A subclass declares its own; one that does not is matched by prototype only.
   */
  static readonly code?: string;

  /** `instanceof` that also recognises an error thrown by another copy of this module. */
  static override [Symbol.hasInstance](value: unknown): boolean {
    if (Function.prototype[Symbol.hasInstance].call(this, value)) return true;
    if (typeof value !== 'object' || value === null || !(APP_ERROR in value)) return false;
    if (this === AppError) return true;
    return Object.hasOwn(this, 'code') && (value as AppError).code === this.code;
  }

  readonly [APP_ERROR] = true;
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;
  /** Copied onto the response by `apiHandler`. No header is ever required. */
  readonly headers?: ErrorHeaders;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, code: string, options?: AppErrorOptions) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    // `new.target.name` gives the concrete subclass name (e.g. `NotFoundError`).
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
    this.headers = options?.headers;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export class BadRequestError extends AppError {
  static override readonly code = 'bad_request';

  constructor(message = 'Bad request', options?: { cause?: unknown }) {
    super(message, 400, BadRequestError.code, options);
  }
}

export class UnauthorizedError extends AppError {
  static override readonly code = 'unauthorized';

  constructor(message = 'Authentication required') {
    super(message, 401, UnauthorizedError.code);
  }
}

export class ForbiddenError extends AppError {
  static override readonly code = 'forbidden';

  constructor(message = 'You do not have access to this resource') {
    super(message, 403, ForbiddenError.code);
  }
}

export class NotFoundError extends AppError {
  static override readonly code = 'not_found';

  constructor(message = 'Resource not found') {
    super(message, 404, NotFoundError.code);
  }
}

export class ConflictError extends AppError {
  static override readonly code = 'conflict';

  constructor(message = 'Conflict with the current state of the resource') {
    super(message, 409, ConflictError.code);
  }
}

export class ValidationError extends AppError {
  static override readonly code = 'validation_failed';

  constructor(message = 'Validation failed', fieldErrors?: FieldErrors) {
    super(message, 422, ValidationError.code, { fieldErrors });
  }
}

/**
 * An integration or required configuration is unavailable: a missing credential, an
 * upstream that timed out, failed, or answered non-2xx. Fail closed with 503 instead
 * of hanging or pretending to succeed.
 */
export class ServiceUnavailableError extends AppError {
  static override readonly code = 'service_unavailable';

  constructor(
    message = 'This service is temporarily unavailable',
    options?: { cause?: unknown; headers?: ErrorHeaders },
  ) {
    super(message, 503, ServiceUnavailableError.code, options);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Too many attempts in the current rate-limit window (primitives B8). The message is
 * generic on purpose: it must not reveal whether an email address has an account.
 * Carries `retryAfterSeconds` in the envelope and as a `Retry-After` header.
 */
export class TooManyRequestsError extends AppError {
  static override readonly code = 'rate_limited';

  constructor(retryAfterSeconds: number, message = 'Too many attempts. Wait a few minutes, then try again.') {
    const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
    super(message, 429, TooManyRequestsError.code, {
      retryAfterSeconds: seconds,
      headers: { 'Retry-After': String(seconds) },
    });
  }
}
