import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { Badge } from '@devmentor/ui';
import { admit, deny, GuardRedirect, guards } from '../../test/page-guards';
import { findAll, findAllByType, findByType, textOf } from '../../test/element-tree';
import { PaymentReview } from './PaymentReview';

const core = vi.hoisted(() => ({
  checkDbConnection: vi.fn<() => Promise<{ ok: boolean }>>(),
  getEnv: vi.fn(() => ({ APP_NAME: 'DevMentor', NODE_ENV: 'production' })),
}));

vi.mock('../../lib/session', async () => (await import('../../test/page-guards')).guards);
vi.mock('@devmentor/core', () => core);

const { default: AdminDashboard, dynamic } = await import('./page');

const render = () => AdminDashboard() as Promise<ReactElement>;
const status = (tree: ReactElement) => {
  const [chip] = findAll(tree, (element) => element.props.className === 'dm-product-status');
  return [textOf(chip), chip!.props['data-tone']];
};

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

  it('is the s24 operator home: account access first, then the service status', async () => {
    const tree = await render();

    expect(textOf(findByType(tree, 'h1'))).toBe('Operator workspace');
    expect(findAllByType(tree, 'h2').map(textOf)).toEqual(['Account access', 'Service status']);
    expect(findByType(tree, Link).props.href).toBe('/admin/users');
    expect(textOf(findByType(tree, Link))).toBe('View users');
    expect(textOf(findByType(tree, Badge))).toBe('Environment: production');
    expect(status(tree)).toEqual(['Connected', 'success']);
    expect(findByType(tree, PaymentReview)).toBeTruthy();
  });

  it('degrades to Unavailable when the database check fails', async () => {
    core.checkDbConnection.mockResolvedValue({ ok: false });
    const tree = await render();

    expect(status(tree)).toEqual(['Unavailable', 'error']);
  });

  it('refuses before touching the environment or the database (edge case 20)', async () => {
    deny('/mentor');
    await expect(render()).rejects.toEqual(new GuardRedirect('/mentor'));
    expect(core.getEnv).not.toHaveBeenCalled();
    expect(core.checkDbConnection).not.toHaveBeenCalled();
  });
});
