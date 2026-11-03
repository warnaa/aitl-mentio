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
    // Normalisation collapsing a valid-looking path into a protocol-relative `//host`.
    ['a dot-dot segment into //host', '/foo/..//evil.example'],
    ['an encoded dot-dot segment into //host', '/%2e%2e//evil.example'],
    ['a dot segment into //host', '/.//evil.example'],
    ['nested dot-dot segments into //host, with query and hash', '/a/b/../..//evil.example/x?y#z'],
    ['two backslashes into //host', '/foo/..\\\\evil.example'],
    ['a slash and a backslash into //host', '/foo/../\\evil.example'],
  ])('falls back for %s', (_label, value) => {
    expect(safeReturnTo(value, FALLBACK)).toBe(FALLBACK);
  });

  it('accepts an encoded double slash: it stays one path segment, never a host', () => {
    expect(safeReturnTo('/%2F%2Fevil.example', FALLBACK)).toBe('/%2F%2Fevil.example');
  });

  it('never returns a value it would itself refuse (normalised output is a fixed point)', () => {
    const inputs = ['/a/./b/../c', '/a b', '/foo/..//evil.example', '/%2e%2e//evil.example', '/mentors/ada?x=1#y'];
    for (const input of inputs) {
      const once = safeReturnTo(input, FALLBACK);
      expect(safeReturnTo(once, 'refused')).toBe(once);
    }
  });
});
