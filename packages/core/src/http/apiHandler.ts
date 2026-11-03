import { createLogger, type Logger } from '../logger';
import { requireCsrfHeader } from './auth';
import { type ErrorHeaders, type FieldErrors, isAppError } from './errors';

/**
 * The response envelope every `/api/*` route returns. This is a *shape convention*
 * shared with the client (`@devmentor/ui/backend/api`), which declares its own
 * matching type — `ui` must not import `core`, so the two are intentionally separate
 * declarations of the same shape.
 */
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fieldErrors?: FieldErrors; retryAfterSeconds?: number };
};
export type ApiResponseBody<T> = ApiSuccess<T> | ApiFailure;

/** Next passes `params` as a promise in the route context (App Router). */
export type ApiRouteContext = { params: Promise<Record<string, string | string[]>> };

export type ApiRouteHandler = (req: Request, ctx: ApiRouteContext) => Promise<Response>;

/** Route logic: return the payload to wrap, or a `Response` to pass through as-is. */
export type RouteLogic = (req: Request, ctx: ApiRouteContext) => Promise<unknown> | unknown;

export interface ApiHandlerOptions {
  /**
   * Require the CSRF header on state-changing methods. Defaults to `true`; `false` is
   * reserved for the payment-webhook route, which authenticates by signature instead.
   */
  csrf?: boolean;
}

/** Methods that must not change state, so they need no CSRF header. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let cachedLogger: Logger | undefined;
function logger(): Logger {
  return (cachedLogger ??= createLogger());
}

function json(
  status: number,
  body: ApiResponseBody<unknown>,
  extraHeaders?: ErrorHeaders,
): Response {
  // The envelope is always JSON, whatever an error's own headers say.
  const headers = new Headers(extraHeaders);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers });
}

export function jsonOk<T>(data: T, status = 200): Response {
  return json(status, { ok: true, data });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldErrors,
  headers?: ErrorHeaders,
  retryAfterSeconds?: number,
): Response {
  return json(
    status,
    {
      ok: false,
      error: {
        code,
        message,
        ...(fieldErrors ? { fieldErrors } : {}),
        ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
      },
    },
    headers,
  );
}

/**
 * Wrap a route function: run it, wrap its return value in the success envelope (or
 * pass through a `Response` it built itself), and turn any thrown `AppError` into the
 * matching status + failure envelope, copying the error's optional `headers` onto the
 * response. Unexpected errors are logged via the shared logger and returned as a
 * generic 500 — a raw stack trace never reaches the client.
 *
 * Every method other than GET, HEAD and OPTIONS must carry the CSRF header `apiCall`
 * sends (`requireCsrfHeader`), checked before `logic` runs, so no route can forget it;
 * without it the answer is `403 forbidden`. Opt out only with `{ csrf: false }`.
 *
 * Every route handler goes through this — no route writes its own `try/catch`.
 */
export function apiHandler(logic: RouteLogic, options: ApiHandlerOptions = {}): ApiRouteHandler {
  const csrf = options.csrf ?? true;
  return async (req, ctx) => {
    try {
      if (csrf && !SAFE_METHODS.has(req.method)) {
        requireCsrfHeader(req);
      }
      const result = await logic(req, ctx);
      return result instanceof Response ? result : jsonOk(result);
    } catch (error) {
      if (isAppError(error)) {
        return jsonError(
          error.status,
          error.code,
          error.message,
          error.fieldErrors,
          error.headers,
          error.retryAfterSeconds,
        );
      }
      logger().error({ err: error, path: req.url }, 'unhandled route error');
      return jsonError(500, 'internal_error', 'Something went wrong');
    }
  };
}
