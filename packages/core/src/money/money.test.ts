import { expect, it } from 'vitest';
import { parseMajorAmount, withinBounds } from './money';
import { SessionLengths } from '../domain/vocabularies/session-lengths';
it('parses decimal strings exactly, including PostgreSQL maximum', () => {
  for (const input of ['20', '20.0', '20.00']) expect(parseMajorAmount(input)).toBe(2000);
  expect(parseMajorAmount('0')).toBe(0); expect(parseMajorAmount('0.01')).toBe(1);
  expect(parseMajorAmount('21474836.47')).toBe(2147483647);
  for (const invalid of ['21474836.48', '999999999999', '', '-1', '+1', '1e2', '1,00', ' 1', '1 ', '01', '.5', '1.', '1.001']) expect(() => parseMajorAmount(invalid)).toThrow();
});
it('checks inclusive integer bounds and closes session lengths', () => {
  for (const value of [8000, 60000]) expect(withinBounds(value, { minCents: 8000, maxCents: 60000 })).toBe(true);
  for (const value of [7999, 60001, 8000.5]) expect(withinBounds(value, { minCents: 8000, maxCents: 60000 })).toBe(false);
  expect(SessionLengths.values).toEqual([25, 50]); expect(SessionLengths.schema.parse(25)).toBe(25); expect(SessionLengths.schema.parse(50)).toBe(50); expect(SessionLengths.schema.safeParse(30).success).toBe(false);
});
