import { expect, it } from 'vitest';
import { splitSessions } from './split-sessions';

const now = new Date('2026-11-06T12:00:00Z');
const session = (id: string, startsAt: string, status = 'confirmed') => ({ id, startsAt, status });

it('puts future pending and confirmed sessions first, soonest first, and everything else in past, latest first', () => {
  const { upcoming, past } = splitSessions([
    session('later', '2026-11-20T10:00:00Z'),
    session('soon', '2026-11-07T10:00:00Z', 'pending'),
    session('old', '2026-10-01T10:00:00Z'),
    session('older', '2026-09-01T10:00:00Z'),
    session('newer', '2026-11-01T10:00:00Z'),
  ], now);
  expect(upcoming.map(item => item.id)).toEqual(['soon', 'later']);
  expect(past.map(item => item.id)).toEqual(['newer', 'old', 'older']);
});

it('treats expired and cancelled reservations as past even when the slot is still ahead', () => {
  const { upcoming, past } = splitSessions([session('x', '2026-12-01T10:00:00Z', 'expired'), session('y', '2026-12-02T10:00:00Z', 'cancelled')], now);
  expect(upcoming).toEqual([]);
  expect(past.map(item => item.id)).toEqual(['y', 'x']);
});

it('counts a session starting exactly now as past and never mutates its input', () => {
  const input = [session('now', now.toISOString()), session('next', '2026-11-06T12:00:01Z')];
  const { upcoming, past } = splitSessions(input, now);
  expect(upcoming.map(item => item.id)).toEqual(['next']);
  expect(past.map(item => item.id)).toEqual(['now']);
  expect(input.map(item => item.id)).toEqual(['now', 'next']);
});
