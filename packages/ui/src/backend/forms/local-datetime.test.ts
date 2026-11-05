import { expect, it } from 'vitest';
import { localDatetimeToInstant } from './local-datetime';

it('converts viewer local minutes to the corresponding UTC instant', () => {
  expect(localDatetimeToInstant('2026-11-05T14:30')).toBe(new Date(2026, 10, 5, 14, 30).toISOString());
});
it('preserves empty, malformed and impossible local dates for schema validation', () => {
  for (const value of ['', 'invalid', '2026-02-30T12:00', '2026-11-05T25:00']) expect(localDatetimeToInstant(value)).toBe(value);
});
it('rejects DST gap normalization in a non-UTC viewer timezone', () => {
  const original = process.env.TZ;
  process.env.TZ = 'Europe/Warsaw';
  try {
    expect(localDatetimeToInstant('2026-03-29T02:30')).toBe('2026-03-29T02:30');
    expect(localDatetimeToInstant('2026-11-05T14:30')).toBe('2026-11-05T13:30:00.000Z');
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
