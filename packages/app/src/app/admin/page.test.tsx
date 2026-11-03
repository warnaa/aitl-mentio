import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { CardContent } from '@devmentor/ui';
import { admit, deny, GuardRedirect, guards } from '../../test/page-guards';
import { findAllByType, findByType, textOf } from '../../test/element-tree';

const core = vi.hoisted(() => ({
  checkDbConnection: vi.fn<() => Promise<{ ok: boolean }>>(),
  getEnv: vi.fn(() => ({ APP_NAME: 'DevMentor', NODE_ENV: 'production' })),
}));

vi.mock('../../lib/session', async () => (await import('../../test/page-guards')).guards);
vi.mock('@devmentor/core', () => core);

const { default: AdminDashboard, dynamic } = await import('./page');

const render = () => AdminDashboard() as Promise<ReactElement>;

beforeEach(() => {
  admit('operator');
  core.checkDbConnection.mockReset().mockResolvedValue({ ok: true });
  core.getEnv.mockClear();
});

describe('/admin', () => {
  it('is dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('guards itself with operator, returning to /admin', async () => {
    await render();
    expect(guards.requirePageRole).toHaveBeenCalledExactlyOnceWith('operator', '/admin');
  });

  it('shows the instance, its environment and a connected database', async () => {
    const tree = await render();

    expect(textOf(findByType(tree, 'h1'))).toBe('Dashboard');
    expect(findAllByType(tree, CardContent).map(textOf)).toEqual(['production', 'Connected']);
  });

  it('degrades to Unavailable when the database check fails', async () => {
    core.checkDbConnection.mockResolvedValue({ ok: false });
    const tree = await render();

    expect(findAllByType(tree, CardContent).map(textOf)).toEqual(['production', 'Unavailable']);
  });

  it('refuses before touching the environment or the database (edge case 20)', async () => {
    deny('/mentor');
    await expect(render()).rejects.toEqual(new GuardRedirect('/mentor'));
    expect(core.getEnv).not.toHaveBeenCalled();
    expect(core.checkDbConnection).not.toHaveBeenCalled();
  });
});
