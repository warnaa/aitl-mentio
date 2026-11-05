import { beforeEach, describe, expect, it, vi } from 'vitest';
import { admit, deny, GuardRedirect, guards } from '../../../../test/page-guards';

vi.mock('../../../../lib/session', async () => (await import('../../../../test/page-guards')).guards);
vi.mock('next/navigation', () => ({
  redirect: (location: string) => {
    throw new GuardRedirect(location);
  },
}));

const { default: Page, dynamic } = await import('./page');

beforeEach(() => {
  admit('mentor');
});

describe('/mentor/slots', () => {
  it('is dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('guards itself, then sends the mentor to the workspace section', async () => {
    await expect(Page()).rejects.toEqual(new GuardRedirect('/mentor#mentor-time'));
    expect(guards.requirePageRole).toHaveBeenCalledExactlyOnceWith('mentor', '/mentor/slots');
  });

  it('renders nothing when the guard redirects', async () => {
    deny('/home');
    await expect(Page()).rejects.toEqual(new GuardRedirect('/home'));
  });
});
