import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { AuthFeedback } from '@devmentor/ui';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import type { RoleSet, Session } from '@devmentor/core';
import { AccountPanel } from '../../../components/auth/AccountPanel';
import { findAll, findAllByType, findByType, textOf } from '../../../test/element-tree';

/*
 * The page's two seams (AGENTS.md): `lib/session` is mocked — the live session check
 * is tested there — and `redirect` throws a sentinel the way Next's control-flow error
 * does. The notice copy and the links come from the real `lib/sign-in`; the form itself
 * is `AccountPanel`, tested on its own under jsdom.
 */
class RedirectSentinel extends Error {
  constructor(readonly location: string) {
    super(`redirect ${location}`);
  }
}

const mocks = vi.hoisted(() => ({
  getPageSession: vi.fn<() => Promise<Session | null>>(),
  warn: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: (location: string) => {
    throw new RedirectSentinel(location);
  },
}));
vi.mock('../../../lib/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/session')>()),
  getPageSession: mocks.getPageSession,
}));
vi.mock('../../../lib/sign-in', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/sign-in')>()),
  authRouteLogger: () => ({ warn: mocks.warn }),
}));

const { default: SignInPage, dynamic } = await import('./page');
const { SIGN_IN_CANCELLED_NOTICE, SIGN_IN_NOTICES, SIGN_IN_VERIFIED_NOTICE } = await import('../../../lib/sign-in');

type Query = Record<string, string | string[] | undefined>;

const render = (query: Query = {}) => SignInPage({ searchParams: Promise.resolve(query) }) as Promise<ReactElement>;

const panel = (tree: ReactElement) => findByType(tree, AccountPanel);
const notice = (tree: ReactElement) => panel(tree).props.notice as ReactElement<Record<string, unknown>> | undefined;

beforeEach(() => {
  mocks.getPageSession.mockReset();
  mocks.getPageSession.mockResolvedValue(null);
  mocks.warn.mockReset();
});

describe('/sign-in', () => {
  it('is dynamic: it reads the cookie on every request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('renders the account panel in sign-in mode, GitHub first (the panel orders it), linking to registration', async () => {
    const tree = await render();

    expect(panel(tree).props).toMatchObject({
      title: 'Welcome back',
      description: 'Sign in to see your sessions, written answers and private notes.',
      mode: 'sign-in',
      returnTo: undefined,
      githubHref: '/api/auth/github',
      switchHref: '/register',
      notice: undefined,
    });
  });

  it('keeps a back-to-home link in the footer, separate from both sign-in methods', async () => {
    const tree = await render();

    const footer = panel(tree).props.footer as ReactElement;
    const [back] = findAll(footer, (element) => element.props.href === '/');
    expect(textOf(back)).toBe('Back to home');
  });

  it('says a cancelled authorisation created no account, in an alert (edge case 2)', async () => {
    const shown = notice(await render({ cancelled: '1' }))!;
    expect(shown.type).toBe(ErrorMessage);
    expect(shown.props.message).toBe(SIGN_IN_CANCELLED_NOTICE);
  });

  it.each(['unavailable', 'state', 'email', 'unverified', 'conflict'] as const)(
    'explains ?error=%s in an alert above the form',
    async (reason) => {
      const shown = notice(await render({ error: reason }))!;
      expect(shown.type).toBe(ErrorMessage);
      expect(shown.props.message).toBe(SIGN_IN_NOTICES[reason]);
    },
  );

  it('confirms an already-verified address as a status, not an error (edge case 16)', async () => {
    const shown = notice(await render({ verified: '1' }))!;
    expect(shown.type).toBe(AuthFeedback);
    expect(shown.props).toEqual({ state: 'verified' });
    const tree = await render({ verified: '1' });
    // s22's heading; the link created no session, so the form stays (spec A10).
    expect(panel(tree).props).toMatchObject({ title: 'Your email is verified', description: SIGN_IN_VERIFIED_NOTICE });
  });

  it.each([
    ['verification', 'verification-invalid'],
    ['verification-unavailable', 'service-unavailable'],
  ] as const)('turns ?error=%s into the s22 recovery screen without the form', async (reason, state) => {
    const tree = await render({ error: reason, verified: '1' });
    expect(findAllByType(tree, AccountPanel)).toEqual([]);
    expect(findByType(tree, AuthLayout).props.title).toBe('Check your verification link');
    expect(findByType(tree, AuthFeedback).props).toEqual({ state, detail: SIGN_IN_NOTICES[reason] });
    expect(findAll(tree, (element) => typeof element.props.href === 'string').map((link) => `${textOf(link)} ${String(link.props.href)}`)).toEqual([
      'Request a new verification link /register',
      'Back to sign in /sign-in',
    ]);
  });

  it('titles the screen for an invitation and leads back to it', async () => {
    const props = panel(await render({ returnTo: '/invitation/abc' })).props;
    expect(props).toMatchObject({ title: 'Sign in to accept your invitation', description: 'After signing in, you will return to your mentor invitation.' });
    const [back] = findAll(props.footer as ReactElement, (element) => element.props.href === '/invitation/abc');
    expect(textOf(back)).toBe('Back to invitation');
  });

  it('lets an error win over verified', async () => {
    expect(notice(await render({ verified: '1', error: 'state' }))!.type).toBe(ErrorMessage);
  });

  it('ignores an unknown reason, other verified values and a repeated query value', async () => {
    expect(notice(await render({ error: '<script>' }))).toBeUndefined();
    expect(notice(await render({ verified: 'yes' }))).toBeUndefined();
    expect(notice(await render({ cancelled: ['1', '1'] }))).toBeUndefined();
    expect(findAllByType(await render({ error: '<script>' }), ErrorMessage)).toEqual([]);
  });

  it('carries a safe returnTo into the form and both links, encoded', async () => {
    expect(panel(await render({ returnTo: '/admin/users?page=2' })).props).toMatchObject({
      returnTo: '/admin/users?page=2',
      githubHref: '/api/auth/github?returnTo=%2Fadmin%2Fusers%3Fpage%3D2',
      switchHref: '/register?returnTo=%2Fadmin%2Fusers%3Fpage%3D2',
    });
  });

  it.each([
    ['another origin', '//evil.example'],
    ['an absolute URL', 'https://evil.example/home'],
    ['an API route', '/api/auth/github'],
    ['an asset path', '/_next/static/x.js'],
  ])('drops a returnTo pointing at %s from the links (the route re-checks the form’s)', async (_label, returnTo) => {
    expect(panel(await render({ returnTo })).props).toMatchObject({ githubHref: '/api/auth/github', switchHref: '/register' });
  });

  it('ignores a repeated returnTo parameter', async () => {
    expect(panel(await render({ returnTo: ['/home', '/admin'] })).props.returnTo).toBeUndefined();
  });

  it.each<[RoleSet, string]>([
    [['mentee'], '/home'],
    [['mentor'], '/mentor'],
    [['mentor', 'operator'], '/admin'],
  ])('sends a visitor already signed in as %j to %s instead of the form (edge case 28)', async (roles, home) => {
    mocks.getPageSession.mockResolvedValue({ userId: 'user-1', roles });

    const thrown = await render({ returnTo: '/elsewhere' }).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(RedirectSentinel);
    expect((thrown as RedirectSentinel).location).toBe(home);
  });

  it('still renders the form when the session cannot be checked, and logs why', async () => {
    const failure = new Error('database unreachable');
    mocks.getPageSession.mockRejectedValue(failure);

    const tree = await render();

    expect(panel(tree).props.mode).toBe('sign-in');
    expect(mocks.warn).toHaveBeenCalledWith({ err: failure }, 'could not check the session on an auth page');
  });
});
