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
import { firstLink, waitForMail } from './mail';

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

/** The seeded mentee's and operator's demo password (`SEED_PASSWORD` in the seeder). */
const SEED_PASSWORD = 'devmentor-demo-password';

/** Fill and submit the email form on the open `/sign-in` page. */
async function signInWithEmail(session: string, email: string, password: string): Promise<void> {
  await runAgentBrowser(session, 'find', 'label', 'Email address', 'fill', email);
  await runAgentBrowser(session, 'find', 'label', 'Password', 'fill', password);
  await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Sign in', '--exact');
}

/** A POST as `apiCall` sends it, from outside the browser. */
function postJson(baseUrl: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-devmentor-request': '1' },
    body: JSON.stringify(body),
  });
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
        expect(page).toContain('heading "Welcome back"');
        expect(page).toMatch(/- alert\n\s+- paragraph\n\s+- StaticText "Sign-in was cancelled\. No account was created\."/);
        // GitHub first, then the email form (D07), which is live from Slice 4.
        expect(page.indexOf('button "Continue with GitHub"')).toBeGreaterThan(-1);
        expect(page.indexOf('button "Continue with GitHub"')).toBeLessThan(page.indexOf('group "Sign in with email"'));
        expect(page).toMatch(/textbox "Email address/);
        expect(page).not.toMatch(/textbox "Email address[^\n]*\[disabled/);
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
      await runAgentBrowser(session, 'wait', '--text', 'My sessions');
      const home = await runAgentBrowser(session, 'snapshot');
      expect(home).toContain('heading "My sessions"');
      expect(home).toContain('StaticText "Grace Hopper"');
      expect(home).toContain('No sessions yet');
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
      await runAgentBrowser(session, 'wait', '--text', 'Get ready for your first session');
      const home = await runAgentBrowser(session, 'snapshot');
      expect(home).toContain('heading "Get ready for your first session"');
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
      expect(dashboard).toContain('heading "Operator workspace"');
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
      await runAgentBrowser(session, 'wait', '--text', 'Welcome back');
      const page = await runAgentBrowser(session, 'snapshot');

      const url = await currentUrl(session);
      expect(url.pathname).toBe('/sign-in');
      expect(url.searchParams.get('returnTo')).toBe('/home');
      expect(page).toContain('button "Continue with GitHub"');
      expect(page).not.toContain('Grace Hopper');
      expect(page).not.toContain('My sessions');
      expect(page).not.toContain('mock-mentee@devmentor.test');
      await screenshot(session, 'auth-invalid-session');
    });
  });
});

describe('TC-AUTH-004 a signed-out deep link survives sign-in', () => {
  it('returns the operator to /admin/users through the email form, not to the admin layout\'s /admin', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('deep-link', async (session) => {
      await runAgentBrowser(session, 'open', `${baseUrl}/admin/users`);
      await runAgentBrowser(session, 'wait', '--text', 'Welcome back');

      const signIn = await currentUrl(session);
      expect(signIn.pathname).toBe('/sign-in');
      expect(signIn.searchParams.get('returnTo')).toBe('/admin/users');
      await screenshot(session, 'auth-deep-link-sign-in');

      // The seeded operator's demo password (SEED_PASSWORD); the form carries returnTo.
      await signInWithEmail(session, 'mock-operator@devmentor.test', SEED_PASSWORD);
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
      await runAgentBrowser(session, 'wait', '--text', 'My sessions');

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

describe('TC-AUTH-006 a failed email sign-in says nothing about which part was wrong', () => {
  it('shows one generic message for a wrong password and an unknown address, and sets no cookie', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('wrong-password', async (session) => {
      for (const [email, password] of [
        ['mock-mentee@devmentor.test', 'not the right password'],
        ['nobody-here@devmentor.test', SEED_PASSWORD],
      ] as const) {
        await runAgentBrowser(session, 'open', `${baseUrl}/sign-in`);
        await runAgentBrowser(session, 'wait', '--text', 'Welcome back');
        await signInWithEmail(session, email, password);
        await runAgentBrowser(session, 'wait', '--text', 'Email or password is incorrect.');

        const page = await runAgentBrowser(session, 'snapshot');
        expect(page, email).toMatch(/alert[^\n]*\n?[^\n]*Email or password is incorrect\./);
        expect((await currentUrl(session)).pathname).toBe('/sign-in');
        expect(await sessionCookie(session), email).toBeUndefined();
      }
      await screenshot(session, 'auth-wrong-password');
    });
  });

  it('answers 429 with Retry-After once an address has used its attempts (edge case 17)', async () => {
    const baseUrl = inject('integrationBaseUrl');
    // An address no other scenario uses: the per-address counter must not lock a fixture out.
    const email = `rate-limit-${process.pid}@devmentor.test`;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await postJson(baseUrl, '/api/auth/login', { email, password: 'wrong password' })).status, `attempt ${attempt}`).toBe(401);
    }
    const limited = await postJson(baseUrl, '/api/auth/login', { email, password: 'wrong password' });
    const payload = (await limited.json()) as { ok: boolean; error: { code: string; message: string; retryAfterSeconds: number } };

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(payload.error).toMatchObject({ code: 'rate_limited', retryAfterSeconds: Number(limited.headers.get('retry-after')) });
    expect(payload.error.message).not.toMatch(/email|account|password/i);
    expect(limited.headers.get('set-cookie')).toBeNull();
  });
});

describe('TC-AUTH-007 email registration, end to end', () => {
  it('registers, refuses sign-in until the emailed link is opened, then lands on the mentee home', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const email = `new-mentee-${process.pid}@devmentor.test`;
    const password = 'a long enough password';

    await inBrowser('register', async (session) => {
      await runAgentBrowser(session, 'open', `${baseUrl}/register`);
      await runAgentBrowser(session, 'wait', '--text', 'Create your account');
      const form = await runAgentBrowser(session, 'snapshot');
      expect(form.indexOf('button "Continue with GitHub"')).toBeLessThan(form.indexOf('group "Create an account with email"'));
      await screenshot(session, 'auth-register-form');

      const since = Date.now();
      await runAgentBrowser(session, 'find', 'label', 'Display name', 'fill', 'Katherine Johnson');
      await runAgentBrowser(session, 'find', 'label', 'Email address', 'fill', email);
      await runAgentBrowser(session, 'find', 'label', 'Password', 'fill', password);
      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Create account', '--exact');
      await runAgentBrowser(session, 'wait', '--text', 'Check your inbox');
      expect(await runAgentBrowser(session, 'snapshot')).toContain(`We sent the link to ${email}.`);
      expect(await sessionCookie(session)).toBeUndefined();
      await screenshot(session, 'auth-register-check-inbox');

      // Before verification the right password is refused with the reason, and no session.
      const early = await postJson(baseUrl, '/api/auth/login', { email, password });
      expect(early.status).toBe(403);
      await expect(early.json()).resolves.toMatchObject({ error: { code: 'email_unverified' } });

      // Follow the real link the log mailer wrote — no test-signed token.
      const mail = await waitForMail(email, { since });
      expect(mail.subject).toBe('Confirm your DevMentor email address');
      const link = new URL(firstLink(mail));
      expect(link.pathname).toBe('/api/auth/verify-email');
      await runAgentBrowser(session, 'open', `${baseUrl}${link.pathname}${link.search}`);
      await runAgentBrowser(session, 'wait', '--text', 'My sessions');
      expect((await currentUrl(session)).pathname).toBe('/home');
      const home = await runAgentBrowser(session, 'snapshot');
      expect(home).toContain('StaticText "Katherine Johnson"');
      expect(await sessionCookie(session)).toBeDefined();
      await screenshot(session, 'auth-register-verified-home');

      // The link again: already verified, so a confirmation and no new session.
      await runAgentBrowser(session, 'cookies', 'clear');
      await runAgentBrowser(session, 'open', `${baseUrl}${link.pathname}${link.search}`);
      await runAgentBrowser(session, 'wait', '--text', 'Email verified');
      expect((await currentUrl(session)).search).toBe('?verified=1');
      expect(await sessionCookie(session)).toBeUndefined();

      // And the password now signs in.
      await signInWithEmail(session, email, password);
      await runAgentBrowser(session, 'wait', '--text', 'My sessions');
      expect((await currentUrl(session)).pathname).toBe('/home');
    });
  });
});

describe('TC-AUTH-008 GitHub and email accounts for the same address', () => {
  it('links nothing when a GitHub email matches an unverified registration, and says why (edge case 4)', async () => {
    const baseUrl = inject('integrationBaseUrl');
    // The mock adapter's identity for login L has the verified email L@devmentor.test.
    const login = `pending-link-${process.pid}`;
    const registered = await postJson(baseUrl, '/api/auth/register', {
      displayName: 'Pending Person',
      email: `${login}@devmentor.test`,
      password: 'a long enough password',
    });
    expect(registered.status).toBe(200);

    await inBrowser('unverified-link', async (session) => {
      await runAgentBrowser(session, 'open', `${baseUrl}/api/auth/github?login=${login}`);
      await runAgentBrowser(session, 'wait', '--text', 'waiting for email verification');

      const url = await currentUrl(session);
      expect(url.pathname).toBe('/sign-in');
      expect(url.searchParams.get('error')).toBe('unverified');
      expect(await sessionCookie(session)).toBeUndefined();
      await screenshot(session, 'auth-github-unverified-link');
    });
  });

  it('refuses to register an address tied to a GitHub account, pointing to GitHub (edge case 14)', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const login = `github-only-${process.pid}`;

    await inBrowser('github-only', async (session) => {
      await signInAs(session, baseUrl, login); // creates a verified, GitHub-only account
    });

    await inBrowser('github-only-register', async (session) => {
      await runAgentBrowser(session, 'open', `${baseUrl}/register`);
      await runAgentBrowser(session, 'wait', '--text', 'Create your account');
      await runAgentBrowser(session, 'find', 'label', 'Display name', 'fill', 'Someone Else');
      await runAgentBrowser(session, 'find', 'label', 'Email address', 'fill', `${login}@devmentor.test`);
      await runAgentBrowser(session, 'find', 'label', 'Password', 'fill', 'a long enough password');
      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Create account', '--exact');
      await runAgentBrowser(session, 'wait', '--text', 'signs in with GitHub');

      const page = await runAgentBrowser(session, 'snapshot');
      expect(page).toContain('This email address signs in with GitHub. Choose Continue with GitHub.');
      expect(page).not.toContain('Check your inbox');
      await screenshot(session, 'auth-register-github-account');
    });
  });
});
