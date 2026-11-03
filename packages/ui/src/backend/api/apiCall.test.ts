import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiCall, apiCallOrThrow, ApiError } from './apiCall';

const fetchMock = vi.fn<typeof fetch>();

function respond(body: string, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(body, { status }));
}

vi.stubGlobal('fetch', fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

describe('apiCall', () => {
  it('GETs by default, sending JSON and the CSRF header', async () => {
    respond(JSON.stringify({ ok: true, data: [1] }));

    await expect(apiCall<number[]>('/api/things')).resolves.toEqual({ ok: true, data: [1] });
    expect(fetchMock).toHaveBeenCalledWith('/api/things', {
      method: 'GET',
      headers: { 'content-type': 'application/json', 'x-devmentor-request': '1' },
    });
  });

  it('POSTs a JSON body when one is given, keeping extra headers and options', async () => {
    respond(JSON.stringify({ ok: true, data: null }));

    await apiCall('/api/things', { body: { name: 'Ada' }, headers: { 'x-extra': 'yes' }, credentials: 'same-origin' });

    expect(fetchMock).toHaveBeenCalledWith('/api/things', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-devmentor-request': '1', 'x-extra': 'yes' },
      body: '{"name":"Ada"}',
      credentials: 'same-origin',
    });
  });

  it('honours an explicit method', async () => {
    respond(JSON.stringify({ ok: true, data: null }));
    await apiCall('/api/things/1', { method: 'DELETE' });
    expect(fetchMock.mock.calls[0]![1]!.method).toBe('DELETE');
  });

  it('returns the failure envelope as-is, including retryAfterSeconds and fieldErrors', async () => {
    const error = { code: 'rate_limited', message: 'Too many attempts.', retryAfterSeconds: 60, fieldErrors: { email: ['x'] } };
    respond(JSON.stringify({ ok: false, error }), 429);

    await expect(apiCall('/api/auth/login', { body: {} })).resolves.toEqual({ ok: false, error });
  });

  it('reports a network failure with its message', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiCall('/api/things')).resolves.toEqual({
      ok: false,
      error: { code: 'network_error', message: 'Failed to fetch' },
    });
  });

  it('reports a non-Error rejection generically', async () => {
    fetchMock.mockRejectedValueOnce('offline');
    await expect(apiCall('/api/things')).resolves.toEqual({
      ok: false,
      error: { code: 'network_error', message: 'Network request failed' },
    });
  });

  it.each([
    ['an empty body', ''],
    ['a non-JSON body', '<html>Bad gateway</html>'],
    ['JSON that is not an envelope', '[1, 2]'],
    ['JSON null', 'null'],
  ])('reports %s as an invalid response with the status', async (_label, body) => {
    respond(body, 502);
    await expect(apiCall('/api/things')).resolves.toEqual({
      ok: false,
      error: { code: 'invalid_response', message: 'Unexpected response (HTTP 502)' },
    });
  });
});

describe('apiCallOrThrow', () => {
  it('returns the data on success', async () => {
    respond(JSON.stringify({ ok: true, data: { id: 1 } }));
    await expect(apiCallOrThrow('/api/things/1')).resolves.toEqual({ id: 1 });
  });

  it('throws an ApiError carrying the code, message, field errors and retry delay', async () => {
    respond(
      JSON.stringify({ ok: false, error: { code: 'rate_limited', message: 'Too many attempts.', retryAfterSeconds: 90 } }),
      429,
    );

    const error = await apiCallOrThrow('/api/auth/login', { body: {} }).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      name: 'ApiError',
      code: 'rate_limited',
      message: 'Too many attempts.',
      retryAfterSeconds: 90,
      fieldErrors: undefined,
    });
  });
});
