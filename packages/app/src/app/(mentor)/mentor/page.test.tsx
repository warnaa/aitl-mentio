import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { RoleChips } from '../../../components/auth/SignedInShell';
import { admit, deny, GuardRedirect, guards } from '../../../test/page-guards';
import { findAll, findByType, textOf } from '../../../test/element-tree';

vi.mock('../../../lib/session', async () => (await import('../../../test/page-guards')).guards);

const { default: MentorHomePage, dynamic } = await import('./page');

const render = () => MentorHomePage() as Promise<ReactElement>;

beforeEach(() => {
  admit('mentor');
});

describe('/mentor', () => {
  it('is dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('guards itself with mentor, returning to /mentor — the layout does not re-run on client navigation', async () => {
    await render();
    expect(guards.requirePageAccount).toHaveBeenCalledExactlyOnceWith('mentor', '/mentor');
  });

  it('says which account is signed in and which roles it holds', async () => {
    const live = admit('mentor', 'operator');
    const tree = await render();

    expect(textOf(findByType(tree, 'h1'))).toBe('Mentor home');
    const [who] = findAll(tree, (element) => textOf(element).startsWith('You are signed in'));
    expect(textOf(who)).toBe('You are signed in with mock-mentee@devmentor.test.');
    expect(findByType(tree, RoleChips).props.roles).toBe(live.roles);
  });

  it.each(['/sign-in?returnTo=%2Fmentor', '/home'])('renders nothing when the guard redirects to %s (edge case 19)', async (location) => {
    deny(location);
    await expect(render()).rejects.toEqual(new GuardRedirect(location));
  });
});
