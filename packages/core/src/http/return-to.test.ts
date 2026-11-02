import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './return-to';

const FALLBACK = '/home';

describe('safeReturnTo', () => {
  it.each([
    ['/mentor', '/mentor'],
    ['/', '/'],
    ['/invitation/abc123', '/invitation/abc123'],
    ['/mentors/ada?slot=2026-09-04T14:00Z#book', '/mentors/ada?slot=2026-09-04T14:00Z#book'],
    ['/apiary', '/apiary'],
    ['/_nextstep', '/_nextstep'],
    ['/a/./b/../c', '/a/c'],
    ['/a b', '/a%20b'],
  ])('accepts the relative page path %j', (value, expected) => {
    expect(safeReturnTo(value, FALLBACK)).toBe(expected);
  });

  it.each([
    ['an empty string', ''],
    ['undefined', undefined],
    ['null', null],
    ['a protocol-relative URL', '//evil.example/path'],
    ['a backslash host', '/\\evil.example'],
    ['an absolute https URL', 'https://evil.example/'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a path without a leading slash', 'mentor'],
    ['a leading space', ' /mentor'],
    ['an API route', '/api/anything'],
    ['the API root', '/api'],
    ['the OAuth start route', '/api/auth/github'],
    ['a Next asset', '/_next/anything'],
    ['the Next root', '/_next'],
    ['an API route in upper case', '/API/users'],
    ['a dot segment into the API', '/a/../api/users'],
    ['an encoded dot segment into the API', '/%2e/api/users'],
    ['a percent-encoded API prefix', '/%61pi/users'],
    ['a tab that browsers strip into //host', '/\t/evil.example'],
    ['a tab that leaves an invalid host', '/\t/['],
    ['a malformed percent escape', '/%'],
  ])('falls back for %s', (_label, value) => {
    expect(safeReturnTo(value, FALLBACK)).toBe(FALLBACK);
  });
});
