import { resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  type BrowserCookie,
  captureBrowserFailure,
  closeAgentBrowser,
  cookieHeader,
  currentUrl,
  integrationArtifactsDirectory,
  runAgentBrowser,
  signInAs,
} from './agent-browser';

/*
 * Issue #83 (ZAP 10038, threat model T34): every HTML page carries an enforced
 * Content-Security-Policy with a fresh per-response nonce, Next stamps that nonce on
 * every script it renders, and the production build still hydrates and navigates.
 * The policy's effect is asserted in the browser, not just its presence: an injected
 * inline handler must not run.
 */

let sequence = 0;
const browserSession = (name: string) => `devmentor-csp-${name}-${process.pid}-${++sequence}`;

async function inBrowser(name: string, scenario: (session: string) => Promise<void>): Promise<void> {
  const session = browserSession(name);
  try {
    await scenario(session);
  } catch (error) {
    await captureBrowserFailure(session, `csp-${name}`);
    throw error;
  } finally {
    await closeAgentBrowser(session);
  }
}

/** Fetch a page as a full document load and return its policy, nonce and HTML. */
async function page(baseUrl: string, path: string, cookie?: BrowserCookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    headers: { accept: 'text/html', ...(cookie ? cookieHeader(cookie) : {}) },
  });
  const policy = response.headers.get('content-security-policy');
  const html = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    policy,
    nonce: policy?.match(/'nonce-([^']+)'/)?.[1],
    html,
  };
}

/** The served document is enforced, report-only is absent, and every script carries the nonce. */
function expectNoncedDocument(result: Awaited<ReturnType<typeof page>>, path: string): void {
  expect(result.status, path).toBe(200);
  expect(result.contentType, path).toMatch(/^text\/html/);
  expect(result.policy, path).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'(;|$)/);
  expect(result.policy, path).not.toContain('unsafe-eval');
  expect(result.policy, path).toContain("object-src 'none'");
  expect(result.policy, path).toContain("base-uri 'self'");

  // Case-insensitive, so an upper-case `<SCRIPT>` cannot slip past the nonce check.
  const scripts = result.html.match(/<script\b[^>]*>/gi) ?? [];
  expect(scripts.length, `${path} renders framework scripts`).toBeGreaterThan(0);
  for (const script of scripts) {
    expect(script, `${path} script carries the response nonce`).toContain(`nonce="${result.nonce}"`);
  }
}

/** True when the page's own scripts ran (React attached), false for a dead document. */
async function hydrated(session: string): Promise<boolean> {
  return (await runAgentBrowser(session, 'eval', "typeof window.next === 'object'")) === 'true';
}

/**
 * Inject an inline event handler and fire it synchronously. Without an enforced
 * policy it runs and sets the flag; under the policy it is refused.
 */
async function inlineHandlerRan(session: string): Promise<boolean> {
  const result = await runAgentBrowser(
    session,
    'eval',
    `(() => {
      const probe = document.createElement('button');
      probe.setAttribute('onclick', 'window.__cspInlineRan = true');
      document.body.append(probe);
      probe.click();
      probe.remove();
      return window.__cspInlineRan === true;
    })()`,
  );
  return result === 'true';
}

async function cspViolations(session: string): Promise<string[]> {
  const logs = `${await runAgentBrowser(session, 'console')}\n${await runAgentBrowser(session, 'errors')}`;
  return logs.split('\n').filter((line) => /Content Security Policy/i.test(line));
}

describe('TC-CSP-001 public pages are served under an enforced nonce policy', () => {
  it('sets the policy on /, /sign-in and /register with a fresh nonce on every response', async () => {
    const baseUrl = inject('integrationBaseUrl');

    for (const path of ['/', '/sign-in', '/register']) {
      const first = await page(baseUrl, path);
      expectNoncedDocument(first, path);
      const second = await page(baseUrl, path);
      expect(second.nonce, `${path} nonce varies per response`).not.toBe(first.nonce);
    }
  });

  it('hydrates, navigates client-side and refuses injected inline script on the home page', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('public', async (session) => {
      await runAgentBrowser(session, 'open', `${baseUrl}/`);
      await runAgentBrowser(session, 'wait', '--text', 'Book a session for your question.');
      expect(await hydrated(session)).toBe(true);
      expect(await inlineHandlerRan(session)).toBe(false);

      // A marker on `window` survives only a client-side navigation, not a reload.
      await runAgentBrowser(session, 'eval', 'window.__cspSoftNavigation = true');
      await runAgentBrowser(session, 'find', 'role', 'link', 'click', '--name', 'Sign in');
      await runAgentBrowser(session, 'wait', '--text', 'Welcome back');
      expect((await currentUrl(session)).pathname).toBe('/sign-in');
      expect(await runAgentBrowser(session, 'eval', 'window.__cspSoftNavigation === true')).toBe('true');

      expect(await cspViolations(session)).toEqual([]);
      await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'csp-public.png'), '--full');
    });
  });
});

describe('TC-CSP-002 signed-in pages are served under the same enforced policy', () => {
  for (const persona of [
    { login: 'mock-mentee', path: '/home', text: 'My sessions' },
    { login: 'mock-mentor', path: '/mentor', text: 'Get ready for your first session' },
    { login: 'mock-operator', path: '/admin', text: 'Operator workspace' },
  ]) {
    it(`${persona.login} gets the policy on ${persona.path} and the page still works`, async () => {
      const baseUrl = inject('integrationBaseUrl');

      await inBrowser(persona.login, async (session) => {
        const cookie = await signInAs(session, baseUrl, persona.login);
        expectNoncedDocument(await page(baseUrl, persona.path, cookie), persona.path);

        await runAgentBrowser(session, 'open', `${baseUrl}${persona.path}`);
        await runAgentBrowser(session, 'wait', '--text', persona.text);
        expect(await hydrated(session)).toBe(true);
        expect(await inlineHandlerRan(session)).toBe(false);
        expect(await cspViolations(session)).toEqual([]);
        await runAgentBrowser(
          session,
          'screenshot',
          resolve(integrationArtifactsDirectory, `csp-${persona.login}.png`),
          '--full',
        );
      });
    });
  }
});
