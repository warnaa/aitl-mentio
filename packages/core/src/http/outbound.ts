import { createLogger, type Logger } from '../logger';
import { ServiceUnavailableError } from './errors';

/** Node's `fetch` has no default timeout; every outbound call gets this one. */
export const DEFAULT_OUTBOUND_TIMEOUT_MS = 10_000;

export type FetchJsonInit = RequestInit & {
  /** Abort the whole exchange, body included, after this many milliseconds. */
  timeoutMs?: number;
};

/** Why an outbound call failed. Carried as the `cause` of the thrown 503. */
export interface OutboundFailure {
  method: string;
  /** Origin and path only. The query string can carry credentials, so it is dropped. */
  url: string;
  reason: 'http_status' | 'timeout' | 'aborted' | 'network' | 'invalid_json';
  /** The upstream HTTP status, when the upstream answered. */
  status?: number;
  /** The underlying transport error, when there was one. */
  error?: unknown;
}

let cachedLogger: Logger | undefined;
function logger(): Logger {
  return (cachedLogger ??= createLogger());
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '[invalid url]';
  }
}

function transportReason(timeout: AbortSignal, signal: AbortSignal | null | undefined) {
  if (timeout.aborted) {
    return 'timeout';
  }
  return signal?.aborted ? 'aborted' : 'network';
}

/**
 * Log the failure and build the 503. Only the method, redacted URL, status, reason
 * and transport error are logged. The request body and headers never are: they carry
 * client secrets, OAuth codes and API keys.
 */
function unavailable(failure: OutboundFailure): ServiceUnavailableError {
  const { error, ...fields } = failure;
  logger().warn(
    { upstream: fields, ...(error === undefined ? {} : { err: error }) },
    'outbound request failed',
  );
  return new ServiceUnavailableError(undefined, { cause: failure });
}

/**
 * Fetch a JSON resource from a third party under the outbound policy (primitives B20):
 * the exchange is bounded by `AbortSignal.timeout` (default 10 s), combined with any
 * caller `signal`. A timeout, an abort, a network failure, a non-2xx status or a
 * non-JSON body all throw `ServiceUnavailableError`, with an `OutboundFailure` as its
 * cause. An empty 2xx body resolves to `undefined`.
 */
export async function fetchJson<T>(url: string, init: FetchJsonInit = {}): Promise<T> {
  const { timeoutMs = DEFAULT_OUTBOUND_TIMEOUT_MS, signal, ...rest } = init;
  const timeout = AbortSignal.timeout(timeoutMs);
  const target = { method: (rest.method ?? 'GET').toUpperCase(), url: redactUrl(url) };

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    throw unavailable({ ...target, reason: transportReason(timeout, signal), error });
  }

  if (!response.ok) {
    // Release the connection; the upstream's error body is neither read nor logged.
    try {
      await response.body?.cancel();
    } catch {
      // The request has already failed; a failed cancel changes nothing.
    }
    throw unavailable({ ...target, reason: 'http_status', status: response.status });
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw unavailable({
      ...target,
      reason: transportReason(timeout, signal),
      status: response.status,
      error,
    });
  }

  if (text === '') {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    // The parse error quotes the body, so it is deliberately not attached.
    throw unavailable({ ...target, reason: 'invalid_json', status: response.status });
  }
}
