import { envelopeSchema, type ApiErrorBody, type ApiResult, type FieldErrors } from "./types";

/** CSRF header required by `apiHandler` on state-changing requests. Keep in sync with `@mentio/core/http`. */
export const CSRF_HEADER = "x-mentio-request";
const CSRF_HEADER_VALUE = "1";

/** Fixed, actionable text for network failures (F1; becomes Polish with the F1 sweep). */
export const NETWORK_ERROR_MESSAGE = "Check your connection, then try again.";

export type ApiPath = `/api/${string}`;

export interface ApiCallOptions extends Omit<RequestInit, "body"> {
  /** Serialized as JSON. */
  body?: unknown;
  /** Appended as query-string parameters; `undefined` values are skipped. */
  query?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor(status: number, { code, message, fieldErrors }: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * The only sanctioned `fetch()` to `/api/*`. Never throws: network failures and
 * responses that are not a valid envelope come back as `{ ok: false }`.
 */
export async function apiCall<T>(path: ApiPath, options: ApiCallOptions = {}): Promise<ApiResult<T>> {
  const { body, query, headers, ...init } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("accept", "application/json");
  requestHeaders.set(CSRF_HEADER, CSRF_HEADER_VALUE);
  if (body !== undefined) requestHeaders.set("content-type", "application/json");

  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(withQuery(path, query), {
      credentials: "same-origin",
      ...init,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    payload = await readJsonSafe(response);
  } catch {
    // F1: a network failure shows a fixed message, never the browser's `error.message`.
    return failure(0, { code: "network_error", message: NETWORK_ERROR_MESSAGE });
  }

  const envelope = envelopeSchema.safeParse(payload);
  if (!envelope.success) {
    return failure(response.status, {
      code: "invalid_response",
      message: `Unexpected response from server (HTTP ${response.status})`,
    });
  }
  return envelope.data.ok
    ? { ok: true, data: envelope.data.data as T, status: response.status }
    : failure(response.status, envelope.data.error);
}

/** Like `apiCall`, but returns the data directly and throws `ApiError` on failure. */
export async function apiCallOrThrow<T>(path: ApiPath, options?: ApiCallOptions): Promise<T> {
  const result = await apiCall<T>(path, options);
  if (!result.ok) throw new ApiError(result.status, result.error);
  return result.data;
}

/** Parses a JSON body without throwing; an empty or non-JSON body yields `null`. */
export async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function withQuery(path: ApiPath, query: ApiCallOptions["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function failure(status: number, error: ApiErrorBody): ApiResult<never> {
  return { ok: false, error, status };
}
