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

export class AppError extends Error {
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
  constructor(message = 'Bad request', options?: { cause?: unknown }) {
    super(message, 400, 'bad_request', options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'unauthorized');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(message, 403, 'forbidden');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'not_found');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict with the current state of the resource') {
    super(message, 409, 'conflict');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', fieldErrors?: FieldErrors) {
    super(message, 422, 'validation_failed', { fieldErrors });
  }
}

/**
 * An integration or required configuration is unavailable: a missing credential, an
 * upstream that timed out, failed, or answered non-2xx. Fail closed with 503 instead
 * of hanging or pretending to succeed.
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'This service is temporarily unavailable',
    options?: { cause?: unknown; headers?: ErrorHeaders },
  ) {
    super(message, 503, 'service_unavailable', options);
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
  constructor(retryAfterSeconds: number, message = 'Too many attempts. Wait a few minutes, then try again.') {
    const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
    super(message, 429, 'rate_limited', {
      retryAfterSeconds: seconds,
      headers: { 'Retry-After': String(seconds) },
    });
  }
}
