import { describe, expect, it } from 'vitest';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  isAppError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
  TooManyRequestsError,
} from './errors';

describe('AppError', () => {
  it('carries status, code, the concrete name and no optional fields by default', () => {
    const error = new AppError('Teapot', 418, 'teapot');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Teapot');
    expect(error.status).toBe(418);
    expect(error.code).toBe('teapot');
    expect(error.name).toBe('AppError');
    expect(error.cause).toBeUndefined();
    expect(error.fieldErrors).toBeUndefined();
    expect(error.headers).toBeUndefined();
    expect(error.retryAfterSeconds).toBeUndefined();
  });

  it('keeps the cause, field errors and headers it is given', () => {
    const cause = new Error('root');
    const error = new AppError('Teapot', 418, 'teapot', {
      cause,
      fieldErrors: { name: ['Required'] },
      headers: { 'retry-after': '30' },
    });

    expect(error.cause).toBe(cause);
    expect(error.fieldErrors).toEqual({ name: ['Required'] });
    expect(error.headers).toEqual({ 'retry-after': '30' });
  });

  it('keeps a retryAfterSeconds it is given', () => {
    expect(new AppError('Slow down', 429, 'rate_limited', { retryAfterSeconds: 12 }).retryAfterSeconds).toBe(12);
  });
});

describe('TooManyRequestsError', () => {
  it('is a 429 rate_limited with a generic message, the delay and a Retry-After header', () => {
    const error = new TooManyRequestsError(90);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 429, code: 'rate_limited', name: 'TooManyRequestsError', retryAfterSeconds: 90 });
    expect(error.headers).toEqual({ 'Retry-After': '90' });
    expect(error.message).toBe('Too many attempts. Wait a few minutes, then try again.');
    expect(error.message).not.toMatch(/email|account|password/i);
  });

  it.each([
    [0.2, 1],
    [0, 1],
    [-5, 1],
    [59.01, 60],
  ])('rounds a delay of %s seconds up to a whole %s', (input, expected) => {
    const error = new TooManyRequestsError(input);
    expect(error.retryAfterSeconds).toBe(expected);
    expect(error.headers).toEqual({ 'Retry-After': String(expected) });
  });

  it('accepts a custom message', () => {
    expect(new TooManyRequestsError(5, 'Slow down').message).toBe('Slow down');
  });
});

describe('the AppError family', () => {
  it.each([
    [() => new BadRequestError(), 400, 'bad_request', 'Bad request', 'BadRequestError'],
    [() => new UnauthorizedError(), 401, 'unauthorized', 'Authentication required', 'UnauthorizedError'],
    [
      () => new ForbiddenError(),
      403,
      'forbidden',
      'You do not have access to this resource',
      'ForbiddenError',
    ],
    [() => new NotFoundError(), 404, 'not_found', 'Resource not found', 'NotFoundError'],
    [
      () => new ConflictError(),
      409,
      'conflict',
      'Conflict with the current state of the resource',
      'ConflictError',
    ],
    [() => new ValidationError(), 422, 'validation_failed', 'Validation failed', 'ValidationError'],
    [
      () => new ServiceUnavailableError(),
      503,
      'service_unavailable',
      'This service is temporarily unavailable',
      'ServiceUnavailableError',
    ],
  ])('maps to status %#', (make, status, code, message, name) => {
    const error = make();

    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
    expect(error.name).toBe(name);
    expect(error.headers).toBeUndefined();
  });

  it('accepts custom messages and the options each subclass supports', () => {
    const cause = new Error('root');

    expect(new BadRequestError('Bad JSON', { cause }).cause).toBe(cause);
    expect(new UnauthorizedError('Sign in').message).toBe('Sign in');
    expect(new ForbiddenError('No').message).toBe('No');
    expect(new NotFoundError('Gone').message).toBe('Gone');
    expect(new ConflictError('Taken').message).toBe('Taken');
    expect(new ValidationError('Invalid', { email: ['Bad'] }).fieldErrors).toEqual({
      email: ['Bad'],
    });
  });

  it('gives ServiceUnavailableError status 503, code service_unavailable, cause and headers', () => {
    const cause = { reason: 'timeout' };
    const error = new ServiceUnavailableError('GitHub sign-in is unavailable', {
      cause,
      headers: { 'retry-after': '60' },
    });

    expect(error.status).toBe(503);
    expect(error.code).toBe('service_unavailable');
    expect(error.message).toBe('GitHub sign-in is unavailable');
    expect(error.cause).toBe(cause);
    expect(error.headers).toEqual({ 'retry-after': '60' });
  });
});

describe('isAppError', () => {
  it('recognises the family and rejects everything else', () => {
    expect(isAppError(new ServiceUnavailableError())).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError({ status: 503, code: 'service_unavailable' })).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });
});
