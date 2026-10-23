export type FieldErrors = Record<string, string[]>;

/** Base of every error a service may throw. Mapped to an HTTP response by `apiHandler`. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor(
    message: string,
    { status = 500, code = "internal_error", fieldErrors, cause }: {
      status?: number;
      code?: string;
      fieldErrors?: FieldErrors;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause });
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** Server-side failures (5xx) never expose their message to the client. */
  get isExposed(): boolean {
    return this.status < 500;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", fieldErrors?: FieldErrors, options?: { cause?: unknown }) {
    super(message, { status: 400, code: "validation_error", fieldErrors, cause: options?.cause });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", options?: { cause?: unknown }) {
    super(message, { status: 401, code: "unauthorized", cause: options?.cause });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, { status: 403, code: "forbidden" });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, { status: 404, code: "not_found" });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, { status: 409, code: "conflict" });
  }
}

/** Misconfiguration (missing/invalid env). A 500 whose message is never exposed. */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, { status: 500, code: "config_error" });
  }
}
