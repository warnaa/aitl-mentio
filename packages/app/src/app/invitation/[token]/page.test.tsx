import { beforeEach, expect, it, vi } from 'vitest';
import { NotFoundError, withScope } from '@devmentor/core';
import { getPageAccount, signInRedirectPath } from '../../../lib/session';
import { findByType, textOf } from '../../../test/element-tree';
import { AcceptInvitation } from './AcceptInvitation';
import InvitationPage, { dynamic } from './page';
vi.mock('@devmentor/core', async (original) => ({
  ...(await original<typeof import('@devmentor/core')>()),
  withScope: vi.fn(),
}));
vi.mock('../../../lib/session', () => ({
  getPageAccount: vi.fn(),
  signInRedirectPath: vi.fn((path) => `/sign-in?returnTo=${encodeURIComponent(path)}`),
}));
const render = () => InvitationPage({ params: Promise.resolve({ token: 'abc' }) });
beforeEach(() => {
  vi.mocked(withScope).mockImplementation(async (callback) =>
    callback({
      invitationService: {
        lookup: vi
          .fn()
          .mockResolvedValue({
            email: 'ada@example.test',
            stackTags: ['react'],
            expiresAt: '2026-11-18T12:00:00Z',
          }),
      },
    } as never),
  );
  vi.mocked(getPageAccount).mockResolvedValue(null);
});
it('is dynamic and keeps invitation continuation for sign in', async () => {
  expect(dynamic).toBe('force-dynamic');
  const tree = await render();
  expect(textOf(tree)).toContain('Your mentor invitation');
  expect(findByType(tree, 'a').props.href).toContain('returnTo=');
  expect(signInRedirectPath).toHaveBeenCalledWith('/invitation/abc');
});
it('offers acceptance only to the matching signed-in address', async () => {
  vi.mocked(getPageAccount).mockResolvedValue({ user: { email: ' ADA@example.test ' } } as never);
  const tree = await render();
  expect(findByType(tree, AcceptInvitation).props.token).toBe('abc');
  expect(textOf(tree)).toContain('Accepting adds the mentor role to the account you are signed in with.');
  vi.mocked(getPageAccount).mockResolvedValue({ user: { email: 'other@example.test' } } as never);
  const mismatch = await render();
  expect(() => findByType(mismatch, AcceptInvitation)).toThrow();
  expect(JSON.stringify(mismatch)).toContain('signed in as other@example.test; sign out and sign in as ada@example.test');
});
it('names the invited stacks by label, and omits the line for an invitation without tags', async () => {
  expect(textOf(await render())).toContain('Stacks you were invited for: React.');
  vi.mocked(withScope).mockImplementation(async (callback) =>
    callback({
      invitationService: {
        lookup: vi.fn().mockResolvedValue({ email: 'ada@example.test', stackTags: [], expiresAt: '2026-11-18T12:00:00Z' }),
      },
    } as never),
  );
  expect(textOf(await render())).not.toContain('Stacks you were invited for');
});
it.each([new NotFoundError(), new Error('down')])(
  'renders invalid or unavailable feedback',
  async (error) => {
    vi.mocked(withScope).mockRejectedValue(error);
    const tree = await render();
    expect(tree.props.children.props.message).toBe(
      error instanceof NotFoundError
        ? 'This invitation is not valid.'
        : 'Invitations are unavailable. Please try again later.',
    );
  },
);
