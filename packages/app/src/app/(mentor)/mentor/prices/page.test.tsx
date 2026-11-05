import { expect, it, vi } from 'vitest';
vi.mock('../../../../lib/session', () => ({ requirePageRole: vi.fn() }));
import { requirePageRole } from '../../../../lib/session';
import Page, { dynamic } from './page';
it('guards the prices page independently and renders its client screen', async () => {
  expect(dynamic).toBe('force-dynamic'); expect((await Page()).type).toBeDefined();
  expect(requirePageRole).toHaveBeenCalledWith('mentor', '/mentor/prices');
  vi.mocked(requirePageRole).mockRejectedValueOnce(new Error('redirect'));
  await expect(Page()).rejects.toThrow('redirect');
});
