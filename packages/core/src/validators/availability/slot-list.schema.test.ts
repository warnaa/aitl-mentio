import { expect, it } from 'vitest';
import { slotListSchema } from './slot-list.schema';
it('defaults and bounds list paging while keeping past explicit', () => {
  expect(slotListSchema.parse({})).toEqual({ page: 1, past: false });
  expect(slotListSchema.parse({ page: '2', past: 'true' })).toEqual({ page: 2, past: true });
  for (const input of [{ page: 0 }, { page: 10001 }, { page: 'x' }, { past: 'yes' }]) expect(slotListSchema.safeParse(input).success).toBe(false);
});
