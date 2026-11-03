import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { RoleChips } from '../../../components/auth/SignedInShell';
import { admit, deny, GuardRedirect, guards } from '../../../test/page-guards';
import { findAll, findByType, textOf } from '../../../test/element-tree';

vi.mock('../../../lib/session', async () => (await import('../../../test/page-guards')).guards);

const { default: MenteeHomePage, dynamic } = await import('./page');

const render = () => MenteeHomePage() as Promise<ReactElement>;

beforeEach(() => {
  admit('mentee');
});

describe('/home', () => {
  it('is dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('guards itself with mentee, returning to /home — the layout does not re-run on client navigation', async () => {
    await render();
    expect(guards.requirePageAccount).toHaveBeenCalledExactlyOnceWith('mentee', '/home');
  });

  it('says which account is signed in and which roles it holds', async () => {
    const live = admit('mentee', 'mentor');
    const tree = await render();

    expect(textOf(findByType(tree, 'h1'))).toBe('Mentee home');
    const [who] = findAll(tree, (element) => textOf(element).startsWith('You are signed in'));
    expect(textOf(who)).toBe('You are signed in with mock-mentee@devmentor.test.');
    expect(findByType(tree, RoleChips).props.roles).toBe(live.roles);
  });

  it.each(['/sign-in?returnTo=%2Fhome', '/mentor'])('renders nothing when the guard redirects to %s', async (location) => {
    deny(location);
    await expect(render()).rejects.toEqual(new GuardRedirect(location));
  });
});
