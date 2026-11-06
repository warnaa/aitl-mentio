import { expect, it } from 'vitest';
import { Booking, entities, Slot } from './index';

it('registers availability slots for ORM discovery', () => {
  expect(entities).toContain(Slot);
  expect(entities).toContain(Booking);
  expect(new Set(entities).size).toBe(entities.length);
});
