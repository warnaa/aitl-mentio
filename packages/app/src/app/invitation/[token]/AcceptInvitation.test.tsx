import { expect, it, vi } from 'vitest';
import { navigation } from '../../../lib/navigation';
import { AcceptInvitation } from './AcceptInvitation';
vi.mock('../../../lib/navigation', () => ({ navigation: { assign: vi.fn() } }));
it('uses the CSRF-bearing workflow and reloads the new mentor session', () => {
  const tree = AcceptInvitation({ token: 'a/b' });
  expect(tree.props.endpoint).toBe('/api/invitations/a%2Fb/accept');
  tree.props.onSuccess();
  expect(navigation.assign).toHaveBeenCalledWith('/mentor');
});
