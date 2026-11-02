import { describe, expect, it } from 'vitest';
import { AppError } from '../../http/errors';
import {
  GITHUB_CALLBACK_PATH,
  GITHUB_LOGIN_PATTERN,
  githubLoginHint,
  githubCallbackUrl,
  GithubEmailUnverifiedError,
} from './github-identity.port';

describe('githubCallbackUrl', () => {
  it('appends the callback path to the app origin', () => {
    expect(GITHUB_CALLBACK_PATH).toBe('/api/auth/github/callback');
    expect(githubCallbackUrl('https://devmentor.example')).toBe(
      'https://devmentor.example/api/auth/github/callback',
    );
  });
});

describe('GithubEmailUnverifiedError', () => {
  it('is a 403 AppError with its own code and a recovery instruction', () => {
    const error = new GithubEmailUnverifiedError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('GithubEmailUnverifiedError');
    expect(error.status).toBe(403);
    expect(error.code).toBe('github_email_unverified');
    expect(error.message).toMatch(/no verified primary email.*Verify it on GitHub/);
  });

  it('accepts a custom message', () => {
    expect(new GithubEmailUnverifiedError('custom').message).toBe('custom');
  });
});

describe('githubLoginHint', () => {
  it.each(['octocat', 'mock-mentee', 'A1-b2', 'a', 'x'.repeat(39)])('keeps the well-formed login %s', (login) => {
    expect(githubLoginHint(login)).toBe(login);
    expect(GITHUB_LOGIN_PATTERN.test(login)).toBe(true);
  });

  it.each(['', 'x'.repeat(40), 'octo cat', 'octo_cat', 'octo/../cat', 'octo%20cat', 'evil.example', 'é'])(
    'drops the malformed login %j',
    (login) => {
      expect(githubLoginHint(login)).toBeUndefined();
    },
  );

  it('drops an absent login', () => {
    expect(githubLoginHint(null)).toBeUndefined();
    expect(githubLoginHint(undefined)).toBeUndefined();
  });
});
