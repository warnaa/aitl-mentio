import { getLogger } from "../logger";
import { AppError, ForbiddenError, type FieldErrors } from "./errors";

/**
 * Header every state-changing request must carry (CSRF defense on top of
 * `sameSite` cookies — a plain HTML form post cannot set it). `apiCall` in
 * `@mentio/ui` sends the same header; keep the two in sync.
 */
export const CSRF_HEADER = "x-mentio-request";
export const CSRF_HEADER_VALUE = "1";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fieldErrors?: FieldErrors };
};
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export type RouteParams = Record<string, string | string[] | undefined>;
export type RouteContext<P extends RouteParams = RouteParams> = { params: Promise<P> };
export type RouteHandler<P extends RouteParams = RouteParams> = (
  req: Request,
  context: RouteContext<P>,
) => Promise<Response>;

export interface ApiHandlerOptions {
  /** Success status code. Defaults to 200. */
  status?: number;
  /** Require the CSRF header on unsafe methods. Disable only for webhooks that verify a signature instead. */
  csrf?: boolean;
}

/**
 * Wraps a route handler: CSRF check, `AppError` → status + JSON envelope, and
 * logging of unexpected failures without leaking details to the client.
 * Every route handler goes through this — routes never write their own try/catch.
 */
export function apiHandler<T, P extends RouteParams = RouteParams>(
  handler: (args: { req: Request; params: P }) => Promise<T>,
  { status = 200, csrf = true }: ApiHandlerOptions = {},
): RouteHandler<P> {
  return async (req, context) => {
    try {
      if (csrf) assertCsrfHeader(req);
      const params = await context.params;
      const data = await handler({ req, params });
      return Response.json({ ok: true, data } satisfies ApiSuccess<T>, { status });
    } catch (error) {
      return errorResponse(error, req);
    }
  };
}

function assertCsrfHeader(req: Request): void {
  if (SAFE_METHODS.has(req.method)) return;
  if (req.headers.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    throw new ForbiddenError("Missing or invalid CSRF header");
  }
}

const INTERNAL_ERROR = { code: "internal_error", message: "Internal server error" } as const;

function errorResponse(error: unknown, req: Request): Response {
  const isAppError = error instanceof AppError;
  const status = isAppError ? error.status : 500;

  if (!isAppError || !error.isExposed) {
    getLogger().error(
      { err: error, method: req.method, path: new URL(req.url).pathname },
      "Unhandled error in API route",
    );
  }

  const body: ApiFailure = {
    ok: false,
    error:
      isAppError && error.isExposed
        ? { code: error.code, message: error.message, fieldErrors: error.fieldErrors }
        : INTERNAL_ERROR,
  };
  return Response.json(body, { status });
}
