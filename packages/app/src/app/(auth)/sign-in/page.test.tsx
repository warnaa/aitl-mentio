import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { Button } from '@devmentor/ui';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import type { RoleSet, Session } from '@devmentor/core';
import { findAll, findAllByType, findByType, orderOf, textOf } from '../../../test/element-tree';

/*
 * The page's two seams (AGENTS.md): `lib/session` is mocked — the live session check
 * is tested there — and `redirect` throws a sentinel the way Next's control-flow error
 * does. The notice copy and the GitHub link come from the real `lib/sign-in`.
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
const { SIGN_IN_CANCELLED_NOTICE, SIGN_IN_NOTICES } = await import('../../../lib/sign-in');

type Query = Record<string, string | string[] | undefined>;

const render = (query: Query = {}) => SignInPage({ searchParams: Promise.resolve(query) }) as Promise<ReactElement>;

const githubLink = (tree: ReactElement) => {
  const [link] = findAll(tree, (element) => element.type === 'a');
  return link!;
};

beforeEach(() => {
  mocks.getPageSession.mockReset();
  mocks.getPageSession.mockResolvedValue(null);
  mocks.warn.mockReset();
});

describe('/sign-in', () => {
  it('is dynamic: it reads the cookie on every request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('offers GitHub first, as a navigation to the start route, then the email form', async () => {
    const tree = await render();

    const layout = findByType(tree, AuthLayout);
    expect(layout.props.title).toBe('Sign in to DevMentor');
    const link = githubLink(tree);
    expect(link.props.href).toBe('/api/auth/github');
    expect(textOf(link)).toBe('Sign in with GitHub');
    const fieldset = findByType(tree, 'fieldset');
    expect(orderOf(tree, link)).toBeLessThan(orderOf(tree, fieldset));
  });

  it('shows the email form disabled, with a one-line note and labelled fields', async () => {
    const tree = await render();

    const fieldset = findByType(tree, 'fieldset');
    expect(fieldset.props.disabled).toBe(true);
    expect(textOf(findByType(fieldset, 'legend'))).toBe('Sign in with email');
    const note = findAll(fieldset, (element) => element.props.id === 'email-sign-in-note');
    expect(textOf(note)).toBe('Email sign-in is not available yet. Use GitHub for now.');
    expect(fieldset.props['aria-describedby']).toBe('email-sign-in-note');
    const labels = findAll(fieldset, (element) => typeof element.props.htmlFor === 'string');
    expect(labels.map((label) => [label.props.htmlFor, textOf(label)])).toEqual([
      ['sign-in-email', 'Email address'],
      ['sign-in-password', 'Password'],
    ]);
    const submit = findAllByType(fieldset, Button).at(-1)!;
    expect(textOf(submit)).toBe('Sign in with email');
  });

  it('keeps a back-to-home link in the footer, separate from both sign-in methods', async () => {
    const tree = await render();

    const footer = findByType(tree, AuthLayout).props.footer as ReactElement;
    const [back] = findAll(footer, (element) => element.props.href === '/');
    expect(textOf(back)).toBe('Back to home');
  });

  it('renders no notice for a plain visit', async () => {
    expect(findAllByType(await render(), ErrorMessage)).toEqual([]);
  });

  it('says a cancelled authorisation created no account, in an alert (edge case 2)', async () => {
    const notice = findByType(await render({ cancelled: '1' }), ErrorMessage);
    expect(notice.props.message).toBe(SIGN_IN_CANCELLED_NOTICE);
    expect(notice.props.message).toBe('Sign-in was cancelled. No account was created.');
  });

  it.each(['unavailable', 'state', 'email', 'unverified', 'conflict', 'verification'] as const)(
    'explains ?error=%s above the sign-in actions',
    async (reason) => {
      const tree = await render({ error: reason });
      const notice = findByType(tree, ErrorMessage);
      expect(notice.props.message).toBe(SIGN_IN_NOTICES[reason]);
      expect(orderOf(tree, notice)).toBeLessThan(orderOf(tree, githubLink(tree)));
    },
  );

  it('ignores an unknown reason and a repeated query value', async () => {
    expect(findAllByType(await render({ error: '<script>' }), ErrorMessage)).toEqual([]);
    expect(findAllByType(await render({ cancelled: ['1', '1'] }), ErrorMessage)).toEqual([]);
  });

  it('carries a safe returnTo into the GitHub link, encoded', async () => {
    const link = githubLink(await render({ returnTo: '/admin/users?page=2' }));
    expect(link.props.href).toBe('/api/auth/github?returnTo=%2Fadmin%2Fusers%3Fpage%3D2');
  });

  it.each([
    ['another origin', '//evil.example'],
    ['an absolute URL', 'https://evil.example/home'],
    ['an API route', '/api/auth/github'],
    ['an asset path', '/_next/static/x.js'],
    ['a repeated parameter', ['/home', '/admin']],
  ])('drops a returnTo pointing at %s', async (_label, returnTo) => {
    expect(githubLink(await render({ returnTo })).props.href).toBe('/api/auth/github');
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

    expect(githubLink(tree).props.href).toBe('/api/auth/github');
    expect(mocks.warn).toHaveBeenCalledWith({ err: failure }, 'could not check the session on /sign-in');
  });
});
