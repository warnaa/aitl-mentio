import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { BookingsPanel } from '../../../components/sessions/BookingsPanel';
import { admit, deny, GuardRedirect, guards } from '../../../test/page-guards';
import { findByType, textOf } from '../../../test/element-tree';

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

  it('is the s6 My sessions workspace with an authenticated booking projection', async () => {
    const tree = await render();

    expect((tree.props as { className: string }).className).toBe('dm-product-stack');
    expect(textOf(findByType(tree, 'h1'))).toBe('My sessions');
    expect(findByType(tree, BookingsPanel).props.persona).toBe('mentee');
  });

  it.each(['/sign-in?returnTo=%2Fhome', '/mentor'])('renders nothing when the guard redirects to %s', async (location) => {
    deny(location);
    await expect(render()).rejects.toEqual(new GuardRedirect(location));
  });
});
