import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { NotFoundError, withScope } from '@devmentor/core';
import { ErrorMessage } from '@devmentor/ui/backend';
import { TechnologyChips } from '@devmentor/ui/components/mentors/TechnologyChips';
import { getPageAccount } from '../../../lib/session';
import { SignOutButton } from '../../../components/auth/SignOutButton';
import { PublicPage } from '../../../components/public/PublicPage';
import { findAll, findAllByType, findByType, textOf } from '../../../test/element-tree';
import { AcceptInvitation } from './AcceptInvitation';
import InvitationPage, { dynamic } from './page';
vi.mock('@devmentor/core', async (original) => ({
  ...(await original<typeof import('@devmentor/core')>()),
  withScope: vi.fn(),
}));
vi.mock('../../../lib/session', async (original) => ({
  ...(await original<typeof import('../../../lib/session')>()),
  getPageAccount: vi.fn(),
}));
const render = async () => (await InvitationPage({ params: Promise.resolve({ token: 'a b' }) })) as ReactElement;
const lookup = (result: Promise<unknown>) =>
  vi.mocked(withScope).mockImplementation(async (callback) =>
    callback({ invitationService: { lookup: vi.fn().mockReturnValue(result) } } as never),
  );
const account = (email: string, roles = ['mentee']) =>
  vi.mocked(getPageAccount).mockResolvedValue({ user: { email }, session: { userId: 'u1', roles } } as never);
const headings = (tree: ReactElement) => findAll(tree, (element) => element.type === 'h1' || element.type === 'h2').map(textOf);
const links = (tree: ReactElement) => findAllByType(tree, Link).map((link) => `${textOf(link.props.children)} ${String(link.props.href)}`);

beforeEach(() => {
  lookup(Promise.resolve({ email: 'ada@example.test', stackTags: ['react'], expiresAt: '2026-11-18T12:00:00Z' }));
  vi.mocked(getPageAccount).mockReset();
  vi.mocked(getPageAccount).mockResolvedValue(null);
});

it('composes s26 in the public frame and offers a signed-out visitor sign-in that returns here', async () => {
  expect(dynamic).toBe('force-dynamic');
  const tree = await render();
  expect(tree.type).toBe(PublicPage);
  expect(headings(tree)).toEqual(['Mentor developers through text sessions.', 'You are invited to mentor']);
  expect(textOf(tree)).toContain('within 14 days of accepting');
  expect(textOf(tree)).toContain('Invitation for ada@example.test.');
  expect(findByType(tree, TechnologyChips).props.stacks).toEqual(['React']);
  expect(links(tree)).toEqual(['Sign in to accept /sign-in?returnTo=%2Finvitation%2Fa%2520b']);
  expect(textOf(tree)).toContain('Creating an account alone does not grant this role.');
});

it('offers acceptance only to the matching signed-in address', async () => {
  account(' ADA@example.test ');
  const tree = await render();
  expect(findByType(tree, AcceptInvitation).props.token).toBe('a b');
  expect(textOf(tree)).toContain('Accepting as  ADA@example.test ');
  account('other@example.test');
  const mismatch = await render();
  expect(findAllByType(mismatch, AcceptInvitation)).toHaveLength(0);
  expect(findByType(mismatch, ErrorMessage).props.message).toContain(
    'signed in as other@example.test; sign out and sign in as ada@example.test',
  );
  expect(findAllByType(mismatch, SignOutButton)).toHaveLength(1);
});

it('omits the technologies for an invitation without tags', async () => {
  lookup(Promise.resolve({ email: 'ada@example.test', stackTags: [], expiresAt: '2026-11-18T12:00:00Z' }));
  expect(findAllByType(await render(), TechnologyChips)).toHaveLength(0);
});

it('shows one unusable-link state, with a way back for each visitor', async () => {
  lookup(Promise.reject(new NotFoundError()));
  const signedOut = await render();
  expect(headings(signedOut)).toContain('This invitation link cannot be used');
  expect(textOf(signedOut)).toContain('This invitation is not valid.');
  expect(textOf(signedOut)).not.toContain('@');
  expect(links(signedOut)).toEqual(['Sign in /sign-in']);
  account('ada@example.test', ['mentee', 'mentor']);
  expect(links(await render())).toEqual(['Open mentor workspace /mentor']);
  account('ada@example.test', ['mentee']);
  expect(links(await render())).toEqual(['Open my workspace /home']);
});

it('reports an unavailable service without reading the account', async () => {
  lookup(Promise.reject(new Error('down')));
  const tree = await render();
  expect(headings(tree)).toContain('Invitations are unavailable');
  expect(links(tree)).toEqual([]);
  expect(getPageAccount).not.toHaveBeenCalled();
});
