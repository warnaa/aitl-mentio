import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { NotificationsPanel } from '../../../components/notifications/NotificationsPanel';
import { BookingsPanel } from '../../../components/sessions/BookingsPanel';
import { admit, deny, GuardRedirect, guards } from '../../../test/page-guards';
import { findByType, textOf } from '../../../test/element-tree';

vi.mock('../../../lib/session', async () => (await import('../../../test/page-guards')).guards);

const { default: MenteeHomePage, dynamic } = await import('./page');

const render = (booked?: string | string[]) => MenteeHomePage({ searchParams: Promise.resolve({ booked }) }) as Promise<ReactElement>;
const booking = '11111111-1111-4111-8111-111111111111';

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
    expect(findByType(tree, NotificationsPanel)).toBeTruthy();
    expect(findByType(tree, BookingsPanel).props).toEqual({ persona: 'mentee', returnedId: undefined });
  });

  it('marks the booking named by a Checkout return, and nothing else', async () => {
    expect(findByType(await render(booking), BookingsPanel).props.returnedId).toBe(booking);
    for (const value of ['nope', [booking, booking], '']) {
      expect(findByType(await render(value), BookingsPanel).props.returnedId).toBeUndefined();
    }
    expect(findByType(await (MenteeHomePage() as Promise<ReactElement>), BookingsPanel).props.returnedId).toBeUndefined();
  });

  it.each(['/sign-in?returnTo=%2Fhome', '/mentor'])('renders nothing when the guard redirects to %s', async (location) => {
    deny(location);
    await expect(render()).rejects.toEqual(new GuardRedirect(location));
  });
});
