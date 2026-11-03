import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { SignedInShell } from '../../components/auth/SignedInShell';
import { admit, deny, GuardRedirect, guards, user } from '../../test/page-guards';

vi.mock('../../lib/session', async () => (await import('../../test/page-guards')).guards);

const { default: MentorLayout, dynamic } = await import('./layout');

const render = () => MentorLayout({ children: <p>page</p> }) as Promise<ReactElement>;

beforeEach(() => {
  admit('mentor');
});

describe('(mentor) layout', () => {
  it('is dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('requires mentor, returning to /mentor', async () => {
    await render();
    expect(guards.requirePageAccount).toHaveBeenCalledExactlyOnceWith('mentor', '/mentor');
  });

  it('wraps the page in the signed-in shell with who is signed in and their roles', async () => {
    const live = admit('mentee', 'mentor');
    const tree = await render();

    expect(tree.type).toBe(SignedInShell);
    expect(tree.props).toMatchObject({ user, roles: live.roles, current: 'mentor', children: <p>page</p> });
  });

  it('renders nothing of the user when the guard redirects', async () => {
    deny('/sign-in?returnTo=%2Fmentor');
    await expect(render()).rejects.toEqual(new GuardRedirect('/sign-in?returnTo=%2Fmentor'));
  });
});
