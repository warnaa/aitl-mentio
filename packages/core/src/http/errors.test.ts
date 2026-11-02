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
