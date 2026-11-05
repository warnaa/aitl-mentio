import { describe, expect, it } from 'vitest';
import { formatInstant } from './formatInstant';
describe('formatInstant', () => {
  it('labels an instant with an explicit zone', () => {
    expect(formatInstant('2026-11-04T12:00:00Z', 'UTC')).toBe('4 Nov 2026, 12:00 (UTC)');
    expect(formatInstant('2026-11-04T12:00:00Z', 'Europe/Warsaw')).toBe('4 Nov 2026, 13:00 (Europe/Warsaw)');
  });
});
