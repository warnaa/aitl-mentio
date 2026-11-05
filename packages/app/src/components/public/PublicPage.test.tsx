import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@devmentor/ui/backend';
import type { Session } from '@devmentor/core';
import { SignOutButton } from '../auth/SignOutButton';
import { findAllByType, findByType } from '../../test/element-tree';

const mocks = vi.hoisted(() => ({ getPageSession: vi.fn<() => Promise<Session | null>>(), warn: vi.fn() }));
vi.mock('../../lib/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/session')>()),
  getPageSession: mocks.getPageSession,
}));
vi.mock('../../lib/sign-in', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/sign-in')>()),
  authRouteLogger: () => ({ warn: mocks.warn }),
}));
const { PublicPage } = await import('./PublicPage');

const links = (tree: ReactElement) =>
  findAllByType(findByType(tree, PublicLayout).props.navigation as ReactNode, Link).map(
    (link) => `${String(link.props.children)} ${String(link.props.href)}`,
  );
const session = (roles: Session['roles']) => ({ userId: 'u1', roles }) as unknown as Session;

beforeEach(() => {
  mocks.getPageSession.mockReset();
  mocks.warn.mockReset();
});

it('offers signed-out visitors their sessions and sign-in', async () => {
  mocks.getPageSession.mockResolvedValue(null);
  const tree = (await PublicPage({ children: 'Body', className: 'page' })) as ReactElement;
  expect(links(tree)).toEqual(['My sessions /home', 'Sign in /sign-in']);
  expect(findByType(tree, PublicLayout).props.className).toBe('page');
});

it('offers signed-in visitors their role home and sign-out', async () => {
  mocks.getPageSession.mockResolvedValue(session(['mentee', 'mentor']));
  const tree = (await PublicPage({ children: 'Body' })) as ReactElement;
  expect(links(tree)).toEqual(['My workspace /mentor']);
  expect(findAllByType(tree, SignOutButton)).toHaveLength(1);
});

it('places a primary action after the account link and keeps the header without sign-out', async () => {
  mocks.getPageSession.mockResolvedValue(session(['mentee']));
  const primary = <Link href="/register">Create an account</Link>;
  const leading = <Link href="#how">How it works</Link>;
  const signedIn = (await PublicPage({ children: 'Body', primary, leading })) as ReactElement;
  expect(links(signedIn)).toEqual(['How it works #how', 'My workspace /home', 'Create an account /register']);
  expect(findAllByType(signedIn, SignOutButton)).toHaveLength(0);
  mocks.getPageSession.mockResolvedValue(null);
  const signedOut = (await PublicPage({ children: 'Body', primary })) as ReactElement;
  expect(links(signedOut)).toEqual(['Sign in /sign-in', 'Create an account /register']);
});

it('falls back to the signed-out links when the session cannot be checked', async () => {
  mocks.getPageSession.mockRejectedValue(new Error('database down'));
  const tree = (await PublicPage({ children: 'Body' })) as ReactElement;
  expect(links(tree)).toEqual(['My sessions /home', 'Sign in /sign-in']);
  expect(mocks.warn).toHaveBeenCalledOnce();
});
