import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableError } from './errors';

const state = vi.hoisted(() => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  createLogger: vi.fn(),
}));

vi.mock('../logger', () => ({ createLogger: state.createLogger }));

const { DEFAULT_OUTBOUND_TIMEOUT_MS, fetchJson } = await import('./outbound');

const URL_WITH_QUERY = 'https://api.example.test/v1/thing?code=secret-code';
const SECRET_BODY = 'client_secret=super-secret-value';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  state.createLogger.mockReturnValue(state.logger);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  fetchMock.mockReset();
});

/** A fetch that never settles on its own and rejects like undici once aborted. */
function hangingFetch(): typeof fetch {
  return (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal as AbortSignal;
      signal.addEventListener('abort', () => reject(signal.reason));
    });
}

async function failure(promise: Promise<unknown>): Promise<ServiceUnavailableError> {
  const error = await promise.then(
    () => {
      throw new Error('expected fetchJson to reject');
    },
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ServiceUnavailableError);
  return error as ServiceUnavailableError;
}

function everythingLogged(): string {
  return inspect(state.logger.warn.mock.calls, { depth: Infinity });
}

describe('fetchJson', () => {
  it('returns the parsed JSON body on a 2xx response', async () => {
    fetchMock.mockResolvedValue(Response.json({ login: 'ada' }));

    await expect(fetchJson<{ login: string }>(URL_WITH_QUERY)).resolves.toEqual({
      login: 'ada',
    });
    expect(state.logger.warn).not.toHaveBeenCalled();
  });

  it('passes the request through with a timeout signal attached', async () => {
    fetchMock.mockResolvedValue(Response.json({}));

    await fetchJson(URL_WITH_QUERY, {
      method: 'POST',
      body: SECRET_BODY,
      headers: { accept: 'application/json' },
      timeoutMs: 1234,
    });

    const [input, init] = fetchMock.mock.calls[0]!;
    expect(input).toBe(URL_WITH_QUERY);
    expect(init).toMatchObject({
      method: 'POST',
      body: SECRET_BODY,
      headers: { accept: 'application/json' },
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init).not.toHaveProperty('timeoutMs');
  });

  it('defaults to a ten-second timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(Response.json({}));

    await fetchJson(URL_WITH_QUERY);

    expect(DEFAULT_OUTBOUND_TIMEOUT_MS).toBe(10_000);
    expect(timeout).toHaveBeenCalledWith(10_000);
    timeout.mockRestore();
  });

  it('resolves an empty 2xx body to undefined', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(fetchJson(URL_WITH_QUERY)).resolves.toBeUndefined();
  });

  it('throws a 503 carrying the upstream status on a non-2xx response', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"bad_verification_code"}', { status: 401 }));

    const error = await failure(fetchJson(URL_WITH_QUERY, { method: 'post' }));

    expect(error.status).toBe(503);
    expect(error.code).toBe('service_unavailable');
    expect(error.cause).toEqual({
      method: 'POST',
      url: 'https://api.example.test/v1/thing',
      reason: 'http_status',
      status: 401,
    });
    expect(state.logger.warn).toHaveBeenCalledWith(
      {
        upstream: {
          method: 'POST',
          url: 'https://api.example.test/v1/thing',
          reason: 'http_status',
          status: 401,
        },
      },
      'outbound request failed',
    );
  });

  it('throws a 503 on a bodyless non-2xx response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 502 }));

    const error = await failure(fetchJson(URL_WITH_QUERY));

    expect(error.cause).toMatchObject({ method: 'GET', reason: 'http_status', status: 502 });
  });

  it('still throws the 503 when releasing the error body fails', async () => {
    const body = new ReadableStream({
      cancel() {
        throw new Error('cancel failed');
      },
    });
    fetchMock.mockResolvedValue(new Response(body, { status: 500 }));

    const error = await failure(fetchJson(URL_WITH_QUERY));

    expect(error.cause).toMatchObject({ reason: 'http_status', status: 500 });
  });

  it('throws a 503 when the request times out', async () => {
    fetchMock.mockImplementation(hangingFetch());

    const error = await failure(fetchJson(URL_WITH_QUERY, { timeoutMs: 5 }));

    expect(error.cause).toMatchObject({ reason: 'timeout' });
    expect((error.cause as { error: Error }).error.name).toBe('TimeoutError');
  });

  it('throws a 503 when the caller signal aborts', async () => {
    fetchMock.mockImplementation(hangingFetch());
    const controller = new AbortController();

    const pending = failure(fetchJson(URL_WITH_QUERY, { signal: controller.signal }));
    controller.abort();
    const error = await pending;

    expect(error.cause).toMatchObject({ reason: 'aborted' });
  });

  it('throws a 503 on a network failure', async () => {
    const networkError = new TypeError('fetch failed');
    fetchMock.mockRejectedValue(networkError);

    const error = await failure(fetchJson(URL_WITH_QUERY));

    expect(error.cause).toMatchObject({ reason: 'network', error: networkError });
    expect(state.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: networkError }),
      'outbound request failed',
    );
  });

  it('reports a network failure, not an abort, when a caller signal is still live', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const error = await failure(
      fetchJson(URL_WITH_QUERY, { signal: new AbortController().signal }),
    );

    expect(error.cause).toMatchObject({ reason: 'network' });
  });

  it('throws a 503 when the body cannot be read', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.error(new TypeError('terminated'));
      },
    });
    fetchMock.mockResolvedValue(new Response(body, { status: 200 }));

    const error = await failure(fetchJson(URL_WITH_QUERY));

    expect(error.cause).toMatchObject({ reason: 'network', status: 200 });
  });

  it('throws a 503 on a 2xx body that is not JSON, without logging the body', async () => {
    fetchMock.mockResolvedValue(new Response('<html>access_token=leaked</html>', { status: 200 }));

    const error = await failure(fetchJson(URL_WITH_QUERY));

    expect(error.cause).toEqual({
      method: 'GET',
      url: 'https://api.example.test/v1/thing',
      reason: 'invalid_json',
      status: 200,
    });
    expect(everythingLogged()).not.toContain('leaked');
  });

  it('logs a placeholder for a URL that cannot be parsed', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to parse URL'));

    const error = await failure(fetchJson('not a url'));

    expect(error.cause).toMatchObject({ url: '[invalid url]', reason: 'network' });
  });

  it('never lets the request body, headers or query string reach the logger', async () => {
    const init = {
      method: 'POST',
      body: SECRET_BODY,
      headers: { authorization: 'Bearer secret-token' },
    };
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    fetchMock.mockResolvedValueOnce(new Response('not json', { status: 200 }));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await failure(fetchJson(URL_WITH_QUERY, init));
    }

    const logged = everythingLogged();
    expect(state.logger.warn).toHaveBeenCalledTimes(3);
    expect(logged).not.toContain('super-secret-value');
    expect(logged).not.toContain('secret-token');
    expect(logged).not.toContain('secret-code');
  });

  it('creates the logger lazily, once, and reuses it', async () => {
    // A fresh module instance, so the module-level logger cache starts empty. The
    // module graph here is two small files; no ORM is imported.
    vi.resetModules();
    const fresh = await import('./outbound');
    const { ServiceUnavailableError: FreshError } = await import('./errors');
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    expect(state.createLogger).not.toHaveBeenCalled();
    await expect(fresh.fetchJson(URL_WITH_QUERY)).rejects.toBeInstanceOf(FreshError);
    await expect(fresh.fetchJson(URL_WITH_QUERY)).rejects.toBeInstanceOf(FreshError);

    expect(state.createLogger).toHaveBeenCalledTimes(1);
    expect(state.logger.warn).toHaveBeenCalledTimes(2);
  });
});
