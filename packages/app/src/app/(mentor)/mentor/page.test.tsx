import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { MentorWorkspace } from './MentorWorkspace';
import { BookingsPanel } from '../../../components/sessions/BookingsPanel';
import { findByType } from '../../../test/element-tree';
import { admit, deny, GuardRedirect, guards } from '../../../test/page-guards';

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

  it('renders the mentor workspace', async () => {
    const tree = await render();
    expect(findByType(tree, MentorWorkspace)).toBeTruthy();
    expect(findByType(tree, BookingsPanel).props.persona).toBe('mentor');
  });

  it.each(['/sign-in?returnTo=%2Fmentor', '/home'])('renders nothing when the guard redirects to %s (edge case 19)', async (location) => {
    deny(location);
    await expect(render()).rejects.toEqual(new GuardRedirect(location));
  });
});
