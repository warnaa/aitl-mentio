import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { SignedInShell } from '../../components/auth/SignedInShell';
import { admit, deny, GuardRedirect, guards, user } from '../../test/page-guards';

vi.mock('../../lib/session', async () => (await import('../../test/page-guards')).guards);

const { default: SessionsLayout, dynamic } = await import('./layout');

const render = () => SessionsLayout({ children: <p>page</p> }) as Promise<ReactElement>;

beforeEach(() => {
  admit('mentee');
});

describe('sessions layout', () => {
  it('is dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('asks only for a signed-in user, because who may open a session is decided per booking', async () => {
    await render();
    expect(guards.requirePageSignedIn).toHaveBeenCalledExactlyOnceWith('/home');
    expect(guards.requirePageAccount).not.toHaveBeenCalled();
  });

  it('wraps the page in the signed-in shell for a mentor, a mentee or both', async () => {
    const live = admit('mentee', 'mentor');
    const tree = await render();
    expect(tree.type).toBe(SignedInShell);
    expect(tree.props).toMatchObject({ user, roles: live.roles, children: <p>page</p> });
  });

  it('renders nothing of the user when the guard redirects', async () => {
    deny('/sign-in?returnTo=%2Fhome');
    await expect(render()).rejects.toEqual(new GuardRedirect('/sign-in?returnTo=%2Fhome'));
  });
});
