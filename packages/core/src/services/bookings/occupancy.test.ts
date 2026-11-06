import { expect, it } from 'vitest';
import { activeOccupancy, MINUTE_MS, overlappingInterval, viableLengths } from './occupancy';

const start = new Date('2026-11-05T12:00:00Z');
const at = (minutes: number) => new Date(start.getTime() + minutes * MINUTE_MS);
it('queries only confirmed and unexpired pending occupancy', () => {
  expect(activeOccupancy(start)).toEqual({ $or: [{ status: 'confirmed' }, { status: 'pending', expiresAt: { $gt: start } }, { status: 'pending', paymentPending: true }] });
});
it('uses strict half-open interval boundaries for both stored durations', () => {
  expect(overlappingInterval(start, 25)).toEqual({ startsAt: { $lt: at(25) }, $or: [
    { lengthMinutes: 25, startsAt: { $gt: at(-25) } }, { lengthMinutes: 50, startsAt: { $gt: at(-50) } },
  ] });
  expect(viableLengths(start, [])).toEqual([25, 50]);
  expect(viableLengths(start, [{ startsAt: at(25), lengthMinutes: 25 }])).toEqual([25]);
  expect(viableLengths(start, [{ startsAt: at(-25), lengthMinutes: 25 }, { startsAt: at(50), lengthMinutes: 50 }])).toEqual([25, 50]);
  expect(viableLengths(start, [{ startsAt: at(0), lengthMinutes: 25 }])).toEqual([]);
  expect(viableLengths(start, [{ startsAt: at(-10), lengthMinutes: 25 }])).toEqual([]);
});
