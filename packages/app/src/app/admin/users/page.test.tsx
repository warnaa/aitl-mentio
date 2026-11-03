import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { admit, deny, GuardRedirect, guards } from '../../../test/page-guards';

vi.mock('../../../lib/session', async () => (await import('../../../test/page-guards')).guards);

const { default: UsersPage, dynamic } = await import('./page');
const { UsersList } = await import('./UsersList');

const render = () => UsersPage() as Promise<ReactElement>;

beforeEach(() => {
  admit('operator');
});

describe('/admin/users', () => {
  it('is dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('guards itself with operator, returning to /admin/users', async () => {
    await render();
    expect(guards.requirePageRole).toHaveBeenCalledExactlyOnceWith('operator', '/admin/users');
  });

  it('renders the client users list for an operator', async () => {
    expect((await render()).type).toBe(UsersList);
  });

  it('refuses a revoked operator on a client-side navigation, where the layout does not re-run (edge case 21)', async () => {
    deny('/mentor');
    await expect(render()).rejects.toEqual(new GuardRedirect('/mentor'));
  });
});
