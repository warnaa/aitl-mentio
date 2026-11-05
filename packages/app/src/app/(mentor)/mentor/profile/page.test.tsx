import { beforeEach, expect, it, vi } from 'vitest';
import { admit, deny, guards } from '../../../../test/page-guards';
import Page, { dynamic } from './page';
vi.mock('../../../../lib/session', async () => (await import('../../../../test/page-guards')).guards);
beforeEach(() => admit('mentor'));
it('guards each page navigation and passes server-controlled vocabulary/origin', async () => {
  const tree = await Page();
  expect(dynamic).toBe('force-dynamic');
  expect(guards.requirePageRole).toHaveBeenCalledWith('mentor', '/mentor/profile');
  expect(tree.props.options).toHaveLength(4);
  expect(tree.props.appUrl).toMatch(/^http/);
});
it('renders nothing when denied', async () => {
  deny('/home');
  await expect(Page()).rejects.toThrow('redirect /home');
});
