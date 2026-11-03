import { resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  cookieHeader,
  currentUrl,
  integrationArtifactsDirectory,
  runAgentBrowser,
  SESSION_COOKIE,
  sessionCookie,
  signInAs,
  type BrowserCookie,
} from './agent-browser';

/*
 * E01 #31 sign-in through the mock GitHub adapter (AUTH_IDENTITY_ADAPTER=mock with
 * INTEGRATION_TEST_RUN=1, set by environment.ts). Each scenario owns an isolated
 * browser session, so cookies never leak between them, and closes it in `finally`.
 * The personas are the seeded users: mock-mentee (Grace Hopper, mentee), mock-mentor
 * (Ada Lovelace, mentor) and mock-operator (Margaret Hamilton, mentor and operator).
 */

let sequence = 0;
const browserSession = (name: string) => `devmentor-auth-${name}-${process.pid}-${++sequence}`;

const screenshot = (session: string, name: string) =>
  runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, `${name}.png`), '--full');

async function inBrowser(name: string, scenario: (session: string) => Promise<void>): Promise<void> {
  const session = browserSession(name);
  try {
    await scenario(session);
  } catch (error) {
    await captureBrowserFailure(session, `auth-${name}`);
    throw error;
  } finally {
    await closeAgentBrowser(session);
  }
}

/** The number of accounts, read through the operator-only `/api/users`. */
async function userCount(baseUrl: string, operator: BrowserCookie): Promise<number> {
  const response = await fetch(`${baseUrl}/api/users`, { headers: cookieHeader(operator) });
  const payload = (await response.json()) as { ok: boolean; data?: unknown[] };
  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  return payload.data?.length ?? -1;
}

describe('TC-AUTH-001 a cancelled GitHub authorisation', () => {
  it('explains that nothing was created, and creates nothing', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('operator-count', async (operatorSession) => {
      const operator = await signInAs(operatorSession, baseUrl, 'mock-operator');
      const before = await userCount(baseUrl, operator);

      await inBrowser('cancelled', async (session) => {
        // GitHub's redirect back when the user presses Cancel on its consent screen.
        await runAgentBrowser(session, 'open', `${baseUrl}/api/auth/github/callback?error=access_denied`);
        await runAgentBrowser(session, 'wait', '--text', 'Sign-in was cancelled.');
        const page = await runAgentBrowser(session, 'snapshot');

        const url = await currentUrl(session);
        expect(url.pathname).toBe('/sign-in');
        expect(url.searchParams.get('cancelled')).toBe('1');
        expect(page).toContain('heading "Sign in to DevMentor"');
        expect(page).toMatch(/- alert\n\s+- paragraph\n\s+- StaticText "Sign-in was cancelled\. No account was created\."/);
        // GitHub first, then the email form, which is disabled until email sign-in ships.
        expect(page.indexOf('link "Sign in with GitHub"')).toBeGreaterThan(-1);
        expect(page.indexOf('link "Sign in with GitHub"')).toBeLessThan(page.indexOf('group "Sign in with email"'));
        expect(page).toMatch(/textbox "Email address" \[disabled/);
        expect(await sessionCookie(session)).toBeUndefined();
        await screenshot(session, 'auth-cancelled');
      });

      expect(await userCount(baseUrl, operator)).toBe(before);
    });
  });
});

describe('TC-AUTH-002 GitHub sign-in lands on the role home', () => {
  it('signs a mentee in to /home with a secure, httpOnly session cookie', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('mentee', async (session) => {
      const cookie = await signInAs(session, baseUrl, 'mock-mentee');

      expect(cookie).toMatchObject({ name: SESSION_COOKIE, secure: true, httpOnly: true, path: '/', sameSite: 'Lax' });
      expect((await currentUrl(session)).pathname).toBe('/home');
      await runAgentBrowser(session, 'wait', '--text', 'Mentee home');
      const home = await runAgentBrowser(session, 'snapshot');
      expect(home).toContain('heading "Mentee home"');
      expect(home).toContain('StaticText "Grace Hopper"');
      expect(home).toContain('list "Your roles"');
      expect(home).toContain('button "Sign out"');
      await screenshot(session, 'auth-mentee-home');

      // A signed-in visitor opening /sign-in goes home instead (edge case 28).
      await runAgentBrowser(session, 'open', `${baseUrl}/sign-in`);
      expect((await currentUrl(session)).pathname).toBe('/home');
    });
  });

  it('signs the seeded mentor in to /mentor', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('mentor', async (session) => {
      await signInAs(session, baseUrl, 'mock-mentor');

      expect((await currentUrl(session)).pathname).toBe('/mentor');
      await runAgentBrowser(session, 'wait', '--text', 'Mentor home');
      const home = await runAgentBrowser(session, 'snapshot');
      expect(home).toContain('heading "Mentor home"');
      expect(home).toContain('StaticText "Ada Lovelace"');
      await screenshot(session, 'auth-mentor-home');
    });
  });

  it('signs the mentor/operator in to /admin', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('operator', async (session) => {
      await signInAs(session, baseUrl, 'mock-operator');

      expect((await currentUrl(session)).pathname).toBe('/admin');
      await runAgentBrowser(session, 'wait', '--text', 'Connected');
      const dashboard = await runAgentBrowser(session, 'snapshot');
      expect(dashboard).toContain('heading "Dashboard"');
      expect(dashboard).toContain('link "Users"');
      await screenshot(session, 'auth-operator-admin');
    });
  });
});

describe('TC-AUTH-003 an invalid session on a signed-in screen', () => {
  it('redirects to sign-in and shows nothing of the user', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('tampered', async (session) => {
      const cookie = await signInAs(session, baseUrl, 'mock-mentee');

      // Corrupt the signature, as a tampered or foreign token would be (edge case 10).
      const tampered = `${cookie.value.slice(0, -4)}${cookie.value.endsWith('AAAA') ? 'BBBB' : 'AAAA'}`;
      await runAgentBrowser(session, 'cookies', 'clear');
      await runAgentBrowser(
        session,
        'cookies',
        'set',
        SESSION_COOKIE,
        tampered,
        '--url',
        baseUrl,
        '--httpOnly',
        '--secure',
        '--sameSite',
        'Lax',
      );
      expect((await sessionCookie(session))?.value).toBe(tampered);

      await runAgentBrowser(session, 'open', `${baseUrl}/home`);
      await runAgentBrowser(session, 'wait', '--text', 'Sign in to DevMentor');
      const page = await runAgentBrowser(session, 'snapshot');

      const url = await currentUrl(session);
      expect(url.pathname).toBe('/sign-in');
      expect(url.searchParams.get('returnTo')).toBe('/home');
      expect(page).toContain('link "Sign in with GitHub"');
      expect(page).not.toContain('Grace Hopper');
      expect(page).not.toContain('Mentee home');
      expect(page).not.toContain('mock-mentee@devmentor.test');
      await screenshot(session, 'auth-invalid-session');
    });
  });
});

describe('TC-AUTH-004 a signed-out deep link survives sign-in', () => {
  it('returns the operator to /admin/users, not to the admin layout\'s /admin', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('deep-link', async (session) => {
      await runAgentBrowser(session, 'open', `${baseUrl}/admin/users`);
      await runAgentBrowser(session, 'wait', '--text', 'Sign in to DevMentor');

      const signIn = await currentUrl(session);
      expect(signIn.pathname).toBe('/sign-in');
      expect(signIn.searchParams.get('returnTo')).toBe('/admin/users');
      const href = await runAgentBrowser(session, 'get', 'attr', 'a[href^="/api/auth/github"]', 'href');
      expect(href.trim()).toBe('/api/auth/github?returnTo=%2Fadmin%2Fusers');
      await screenshot(session, 'auth-deep-link-sign-in');

      // Follow the page's own GitHub link, adding only the mock adapter's login hint.
      await runAgentBrowser(session, 'open', `${baseUrl}${href.trim()}&login=mock-operator`);
      await runAgentBrowser(session, 'wait', '--text', 'Ada Lovelace');
      expect((await currentUrl(session)).pathname).toBe('/admin/users');
      const users = await runAgentBrowser(session, 'snapshot');
      expect(users).toContain('heading "Users"');
      expect(users).toContain('cell "Ada Lovelace"');
      expect(await sessionCookie(session)).toBeDefined();
      await screenshot(session, 'auth-deep-link-users');
    });
  });
});

describe('TC-AUTH-005 sign-out ends every session, including a copied cookie', () => {
  /** Whether `cookie` is a live session: probed through a page and an API, without following redirects. */
  async function probe(baseUrl: string, cookie: BrowserCookie) {
    const home = await fetch(`${baseUrl}/home`, { headers: cookieHeader(cookie), redirect: 'manual' });
    const users = await fetch(`${baseUrl}/api/users`, { headers: cookieHeader(cookie) });
    const payload = (await users.json()) as { ok: boolean; error?: { code: string } };
    return { home: home.status, homeLocation: home.headers.get('location'), users: users.status, code: payload.error?.code };
  }

  it('refuses a sign-out without the CSRF header, then signs out and kills the copy', async () => {
    const baseUrl = inject('integrationBaseUrl');

    // A user owned by this scenario: sign-out bumps session_version for *every* session of
    // the user, so a seeded persona would also kill cookies other scenarios hold.
    await inBrowser('sign-out', async (session) => {
      const copied = await signInAs(session, baseUrl, 'mock-signout');
      await runAgentBrowser(session, 'wait', '--text', 'Mentee home');

      // Live: the page renders, and the operator-only API answers 403 (signed in, wrong role).
      expect(await probe(baseUrl, copied)).toEqual({ home: 200, homeLocation: null, users: 403, code: 'forbidden' });

      // A cross-site form post cannot set the header: refused, and the session survives.
      const forged = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: cookieHeader(copied) });
      expect(forged.status).toBe(403);
      expect(((await forged.json()) as { error?: { code: string } }).error?.code).toBe('forbidden');
      expect(forged.headers.get('set-cookie')).toBeNull();
      expect(await probe(baseUrl, copied)).toEqual({ home: 200, homeLocation: null, users: 403, code: 'forbidden' });

      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Sign out');
      await runAgentBrowser(session, 'wait', '--url', `${baseUrl}/`);
      expect((await currentUrl(session)).pathname).toBe('/');
      expect(await sessionCookie(session)).toBeUndefined();
      await screenshot(session, 'auth-signed-out');

      // The copy taken before sign-out is dead in PostgreSQL, not just deleted in this browser.
      expect(await probe(baseUrl, copied)).toEqual({
        home: 307,
        homeLocation: '/sign-in?returnTo=%2Fhome',
        users: 401,
        code: 'unauthorized',
      });
    });
  });
});
