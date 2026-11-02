import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiRouteContext } from './apiHandler';
import { AppError, ServiceUnavailableError, ValidationError } from './errors';

const state = vi.hoisted(() => ({
  logger: { error: vi.fn() },
  createLogger: vi.fn(),
}));

vi.mock('../logger', () => ({ createLogger: state.createLogger }));

const { apiHandler, jsonError, jsonOk } = await import('./apiHandler');

const ctx = { params: Promise.resolve({}) } as ApiRouteContext;

function request(): Request {
  return new Request('http://devmentor.test/api/things');
}

beforeEach(() => {
  vi.clearAllMocks();
  state.createLogger.mockReturnValue(state.logger);
});

describe('jsonOk', () => {
  it('wraps data in the success envelope with status 200 by default', async () => {
    const response = jsonOk({ id: '1' });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    await expect(response.json()).resolves.toEqual({ ok: true, data: { id: '1' } });
  });

  it('uses the status it is given', () => {
    expect(jsonOk(null, 201).status).toBe(201);
  });
});

describe('jsonError', () => {
  it('builds the failure envelope without fieldErrors when there are none', async () => {
    const response = jsonError(404, 'not_found', 'Resource not found');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: 'not_found', message: 'Resource not found' },
    });
  });

  it('adds extra headers but keeps the JSON content type', () => {
    const response = jsonError(503, 'service_unavailable', 'Down', undefined, {
      'Retry-After': '30',
      'Content-Type': 'text/plain',
    });

    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get('content-type')).toBe('application/json');
  });
});

describe('apiHandler', () => {
  it('wraps the returned value in the success envelope', async () => {
    const response = await apiHandler(() => ({ hello: 'world' }))(request(), ctx);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { hello: 'world' } });
  });

  it('passes a Response returned by the logic through untouched', async () => {
    const own = new Response('raw', { status: 302 });

    await expect(apiHandler(async () => own)(request(), ctx)).resolves.toBe(own);
  });

  it('maps an AppError to its status and envelope, including fieldErrors', async () => {
    const response = await apiHandler(() => {
      throw new ValidationError('Invalid', { email: ['Required'] });
    })(request(), ctx);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: 'validation_failed', message: 'Invalid', fieldErrors: { email: ['Required'] } },
    });
    expect(state.logger.error).not.toHaveBeenCalled();
  });

  it('round-trips an AppError’s headers onto the response', async () => {
    const response = await apiHandler(() => {
      throw new ServiceUnavailableError('GitHub sign-in is unavailable', {
        headers: { 'retry-after': '120' },
      });
    })(request(), ctx);

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('120');
    expect(response.headers.get('content-type')).toBe('application/json');
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: 'service_unavailable', message: 'GitHub sign-in is unavailable' },
    });
  });

  it('sends no extra headers for an AppError without them', async () => {
    const response = await apiHandler(() => {
      throw new AppError('Teapot', 418, 'teapot');
    })(request(), ctx);

    expect([...response.headers.keys()]).toEqual(['content-type']);
  });

  it('logs an unexpected error once and answers a generic 500', async () => {
    const boom = new Error('database exploded');
    const handler = apiHandler(() => {
      throw boom;
    });

    const first = await handler(request(), ctx);
    await handler(request(), ctx);

    expect(first.status).toBe(500);
    await expect(first.json()).resolves.toEqual({
      ok: false,
      error: { code: 'internal_error', message: 'Something went wrong' },
    });
    expect(state.logger.error).toHaveBeenCalledWith(
      { err: boom, path: 'http://devmentor.test/api/things' },
      'unhandled route error',
    );
    // The logger is created lazily on the first failure and then reused.
    expect(state.createLogger).toHaveBeenCalledTimes(1);
  });
});
