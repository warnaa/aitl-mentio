import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import type { RoleSet, Session } from '@devmentor/core';
import { AccountPanel } from '../../../components/auth/AccountPanel';
import { findAll, findByType, textOf } from '../../../test/element-tree';

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

const { default: RegisterPage, dynamic } = await import('./page');

type Query = Record<string, string | string[] | undefined>;

const render = (query: Query = {}) => RegisterPage({ searchParams: Promise.resolve(query) }) as Promise<ReactElement>;

const panel = (tree: ReactElement) => findByType(tree, AccountPanel);

beforeEach(() => {
  mocks.getPageSession.mockReset();
  mocks.getPageSession.mockResolvedValue(null);
  mocks.warn.mockReset();
});

describe('/register', () => {
  it('is dynamic: it reads the cookie on every request', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('renders the account panel in register mode, linking back to sign-in', async () => {
    const tree = await render();

    const layout = findByType(tree, AccountPanel);
    expect(layout.props.title).toBe('Create your account');
    expect(layout.props.description).toMatch(/We email you a link to confirm the address/);
    expect(panel(tree).props).toMatchObject({ mode: 'register', githubHref: '/api/auth/github', switchHref: '/sign-in' });
  });

  it('offers no way to become a mentor (R07)', async () => {
    const { title, description } = findByType(await render(), AccountPanel).props as { title: string; description: string };
    expect(`${title} ${description}`).not.toMatch(/become a mentor|apply to mentor|mentor application/i);
  });

  it('keeps a back-to-home link in the footer', async () => {
    const footer = findByType(await render(), AccountPanel).props.footer as ReactElement;
    const [back] = findAll(footer, (element) => element.props.href === '/');
    expect(textOf(back)).toBe('Back to home');
  });

  it('carries a safe returnTo into the form and both links, and drops an unsafe one', async () => {
    expect(panel(await render({ returnTo: '/mentor' })).props).toMatchObject({
      returnTo: '/mentor',
      githubHref: '/api/auth/github?returnTo=%2Fmentor',
      switchHref: '/sign-in?returnTo=%2Fmentor',
    });
    expect(panel(await render({ returnTo: '//evil.example' })).props).toMatchObject({ githubHref: '/api/auth/github', switchHref: '/sign-in' });
  });

  it.each<[RoleSet, string]>([
    [['mentee'], '/home'],
    [['mentor', 'operator'], '/admin'],
  ])('sends a visitor already signed in as %j to %s', async (roles, home) => {
    mocks.getPageSession.mockResolvedValue({ userId: 'user-1', roles });
    const thrown = await render().catch((error: unknown) => error);
    expect((thrown as RedirectSentinel).location).toBe(home);
  });

  it('still renders the form when the session cannot be checked', async () => {
    mocks.getPageSession.mockRejectedValue(new Error('database unreachable'));
    expect(panel(await render()).props.mode).toBe('register');
    expect(mocks.warn).toHaveBeenCalledOnce();
  });
});
