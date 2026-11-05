import { expect, it } from 'vitest';
import { slotCreateSchema } from './slot-create.schema';

it('accepts UTC instants independently of time policy and strips owner fields', () => {
  expect(slotCreateSchema.parse({ startsAt: '2000-01-01T00:00:00Z', mentorProfileId: 'other' })).toEqual({ startsAt: '2000-01-01T00:00:00Z' });
  for (const startsAt of ['', 'tomorrow', '2026-11-05T12:00', '2026-02-30T12:00:00Z']) {
    expect(slotCreateSchema.safeParse({ startsAt }).success).toBe(false);
  }
});
