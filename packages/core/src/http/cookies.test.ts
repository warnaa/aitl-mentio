import { describe, expect, it } from 'vitest';
import { readCookie, serializeCookie } from './cookies';

describe('serializeCookie', () => {
  it('builds an HttpOnly, SameSite=Lax cookie with path and Max-Age', () => {
    expect(serializeCookie('name', 'value', { path: '/x', maxAgeSeconds: 60, secure: false })).toBe(
      'name=value; Path=/x; Max-Age=60; HttpOnly; SameSite=Lax',
    );
  });

  it('adds Expires before Max-Age when given, and Secure last when asked', () => {
    expect(
      serializeCookie('name', '', { path: '/', maxAgeSeconds: 0, expiresAt: new Date(0), secure: true }),
    ).toBe('name=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax; Secure');
  });
});

describe('readCookie', () => {
  it('returns null without a header', () => {
    expect(readCookie(null, 'a')).toBeNull();
    expect(readCookie(undefined, 'a')).toBeNull();
    expect(readCookie('', 'a')).toBeNull();
  });

  it('finds the named cookie among others, trimming whitespace', () => {
    expect(readCookie('other=1;  a = va=lue ; b=2', 'a')).toBe('va=lue');
    expect(readCookie('b=2; a=1', 'b')).toBe('2');
  });

  it('skips pairs without "=" and cookies whose name only shares a prefix', () => {
    expect(readCookie('flag; ab=1; a=2', 'a')).toBe('2');
  });

  it('returns null for an absent or empty cookie', () => {
    expect(readCookie('b=2', 'a')).toBeNull();
    expect(readCookie('a=; b=2', 'a')).toBeNull();
  });
});
