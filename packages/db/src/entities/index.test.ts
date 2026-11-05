import { expect, it } from 'vitest';
import { entities, Slot } from './index';

it('registers availability slots for ORM discovery', () => {
  expect(entities).toContain(Slot);
  expect(new Set(entities).size).toBe(entities.length);
});
