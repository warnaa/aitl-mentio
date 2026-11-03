import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { SignOutButton } from '../../components/auth/SignOutButton';
import { admit, deny, GuardRedirect, guards } from '../../test/page-guards';
import { findAllByType, findByType, textOf } from '../../test/element-tree';

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
    expect(guards.requirePageRole).toHaveBeenCalledExactlyOnceWith('operator', '/admin');
  });

  it('keeps the chrome: the Dashboard and Users links, the page, and adds sign-out', async () => {
    const tree = await render();

    const links = findAllByType(tree, Link).map((link) => [link.props.href, textOf(link)]);
    expect(links).toEqual([
      ['/', 'DevMentor'],
      ['/admin', 'Dashboard'],
      ['/admin/users', 'Users'],
    ]);
    findByType(tree, SignOutButton);
    expect(textOf(findByType(tree, 'main'))).toBe('page');
  });

  it.each(['/sign-in?returnTo=%2Fadmin', '/mentor', '/home'])(
    'renders nothing when the guard redirects to %s (edge case 20)',
    async (location) => {
      deny(location);
      await expect(render()).rejects.toEqual(new GuardRedirect(location));
    },
  );
});
