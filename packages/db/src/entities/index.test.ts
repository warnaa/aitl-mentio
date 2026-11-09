import { expect, it } from 'vitest';
import { Booking, entities, Slot } from './index';

it('registers availability slots for ORM discovery', () => {
  expect(entities).toContain(Slot);
  expect(entities).toContain(Booking);
  expect(new Set(entities).size).toBe(entities.length);
});

it('registers the operator platform settings singleton', async () => {
  const { PlatformSettings, PLATFORM_SETTINGS_ID } = await import('./index');
  expect(entities).toContain(PlatformSettings);
  expect(PLATFORM_SETTINGS_ID).toBe(1);
});
