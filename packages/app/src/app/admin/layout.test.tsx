import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { SignedInShell } from '../../components/auth/SignedInShell';
import { admit, deny, GuardRedirect, guards, user } from '../../test/page-guards';

vi.mock('../../lib/session', async () => (await import('../../test/page-guards')).guards);

const { default: AdminLayout, dynamic } = await import('./layout');

const render = () => AdminLayout({ children: <p>page</p> }) as Promise<ReactElement>;

beforeEach(() => {
  admit('operator');
});

describe('admin layout', () => {
  it('is dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('requires operator, returning to /admin', async () => {
    await render();
    expect(guards.requirePageAccount).toHaveBeenCalledExactlyOnceWith('operator', '/admin');
  });

  it('wraps the page in the shared signed-in shell, with every held role for the navigation', async () => {
    const live = admit('mentor', 'operator');
    const tree = await render();

    expect(tree.type).toBe(SignedInShell);
    expect(tree.props).toMatchObject({ user, roles: live.roles, children: <p>page</p> });
  });

  it.each(['/sign-in?returnTo=%2Fadmin', '/mentor', '/home'])(
    'renders nothing when the guard redirects to %s (edge case 20)',
    async (location) => {
      deny(location);
      await expect(render()).rejects.toEqual(new GuardRedirect(location));
    },
  );
});
