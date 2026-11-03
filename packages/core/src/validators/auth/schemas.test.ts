import { describe, expect, it } from 'vitest';
import { loginSchema } from './login.schema';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from './password';
import { registerSchema } from './register.schema';

const valid = { displayName: 'Grace Hopper', email: 'grace@devmentor.test', password: 'correct horse battery' };
const issues = (result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }) =>
  result.error?.issues.map((issue) => [issue.path.join('.'), issue.message]) ?? [];

describe('registerSchema', () => {
  it('accepts a valid registration, trimming the name and normalising the email', () => {
    expect(registerSchema.parse({ ...valid, displayName: '  Grace Hopper ', email: ' Grace@DevMentor.Test ' })).toEqual({
      displayName: 'Grace Hopper',
      email: 'grace@devmentor.test',
      password: 'correct horse battery',
    });
  });

  it('keeps an optional returnTo, and accepts its absence', () => {
    expect(registerSchema.parse({ ...valid, returnTo: '/mentor' }).returnTo).toBe('/mentor');
    expect(registerSchema.parse(valid)).not.toHaveProperty('returnTo');
    expect(registerSchema.safeParse({ ...valid, returnTo: `/${'a'.repeat(2048)}` }).success).toBe(false);
  });

  it(`requires at least ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(issues(registerSchema.safeParse({ ...valid, password: 'a'.repeat(11) }))).toEqual([
      ['password', 'Use at least 12 characters.'],
    ]);
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(12) }).success).toBe(true);
  });

  it(`caps the password at ${PASSWORD_MAX_BYTES} UTF-8 bytes, not characters`, () => {
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(72) }).success).toBe(true);
    expect(issues(registerSchema.safeParse({ ...valid, password: 'a'.repeat(73) }))).toEqual([['password', 'Use at most 72 bytes.']]);
    // 24 three-byte characters are 72 bytes; 25 are 75 — over, though only 25 characters.
    expect(registerSchema.safeParse({ ...valid, password: '€'.repeat(24) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, password: '€'.repeat(25) }).success).toBe(false);
  });

  it('never trims the password', () => {
    expect(registerSchema.parse({ ...valid, password: '  spaced password  ' }).password).toBe('  spaced password  ');
  });

  it.each(['not-an-email', 'grace@', '', `${'a'.repeat(250)}@x.io`])('refuses the email %j', (email) => {
    expect(issues(registerSchema.safeParse({ ...valid, email }))).toEqual([['email', 'Enter a valid email address.']]);
  });

  it('requires a name of 1 to 120 characters', () => {
    expect(issues(registerSchema.safeParse({ ...valid, displayName: '   ' }))).toEqual([['displayName', 'Enter your name.']]);
    expect(issues(registerSchema.safeParse({ ...valid, displayName: 'x'.repeat(121) }))).toEqual([
      ['displayName', 'Use at most 120 characters.'],
    ]);
  });
});

describe('loginSchema', () => {
  const login = { email: 'grace@devmentor.test', password: 'whatever' };

  it('accepts any non-empty password up to the byte cap, normalising the email', () => {
    expect(loginSchema.parse({ ...login, email: 'GRACE@devmentor.test', password: 'x' })).toEqual({ email: 'grace@devmentor.test', password: 'x' });
    expect(loginSchema.safeParse({ ...login, password: 'a'.repeat(72) }).success).toBe(true);
  });

  it('refuses an empty password and one over the byte cap', () => {
    expect(issues(loginSchema.safeParse({ ...login, password: '' }))).toEqual([['password', 'Enter your password.']]);
    expect(issues(loginSchema.safeParse({ ...login, password: 'a'.repeat(73) }))).toEqual([['password', 'Use at most 72 bytes.']]);
  });

  it('keeps an optional returnTo and refuses a malformed email', () => {
    expect(loginSchema.parse({ ...login, returnTo: '/home' }).returnTo).toBe('/home');
    expect(loginSchema.safeParse({ ...login, email: 'nope' }).success).toBe(false);
  });
});
