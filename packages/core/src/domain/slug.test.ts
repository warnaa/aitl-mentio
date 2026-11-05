import { describe, expect, it } from 'vitest';
import { MAX_SLUG_ATTEMPTS, RESERVED_SLUGS, slugify, uniqueSlug } from './slug';

describe('public slugs', () => {
  it('normalizes diacritics and punctuation and bounds length', () => {
    expect(slugify('  Éva, Müller!!  ')).toBe('eva-muller');
    expect(slugify('!!!')).toBe('');
    expect(slugify('a'.repeat(59) + ' b')).toBe('a'.repeat(59));
    expect(slugify('a'.repeat(90))).toHaveLength(60);
  });
  it('skips reserved bases and collision chains with suffix-aware truncation', () => {
    expect(RESERVED_SLUGS.has('admin')).toBe(true);
    expect(uniqueSlug('Admin', new Set())).toBe('admin-2');
    expect(uniqueSlug('!!!', new Set())).toBe('mentor-2');
    expect(uniqueSlug('Ada', new Set(['ada', 'ada-2']))).toBe('ada-3');
    const long = 'a'.repeat(60);
    expect(uniqueSlug(long, new Set([long]))).toBe('a'.repeat(58) + '-2');
    expect(MAX_SLUG_ATTEMPTS).toBe(100);
  });
});
