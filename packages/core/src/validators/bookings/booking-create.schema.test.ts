import { expect, it } from 'vitest';
import { bookingCreateSchema } from './booking-create.schema';
it('accepts only a UUID and 25/50-minute duration, stripping untrusted fields', () => {
  const slotId = '11111111-1111-4111-8111-111111111111';
  for (const lengthMinutes of [25, 50]) expect(bookingCreateSchema.parse({ slotId, lengthMinutes, priceCents: 1 })).toEqual({ slotId, lengthMinutes });
  for (const data of [{ slotId: 'bad', lengthMinutes: 25 }, { slotId, lengthMinutes: 30 }, { slotId, lengthMinutes: '25' }, {}]) {
    expect(bookingCreateSchema.safeParse(data).success).toBe(false);
  }
});
