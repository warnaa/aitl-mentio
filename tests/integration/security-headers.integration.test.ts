import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  cookieHeader,
  integrationArtifactsDirectory,
  runAgentBrowser,
  signInAs,
} from './agent-browser';

/*
 * Issue #84 (ZAP 10020, missing anti-clickjacking header): every HTML response must
 * forbid framing, so another origin cannot render DevMentor under a decoy page.
 */

let sequence = 0;
const browserSession = (name: string) => `devmentor-framing-${name}-${process.pid}-${++sequence}`;

async function inBrowser(name: string, scenario: (session: string) => Promise<void>): Promise<void> {
  const session = browserSession(name);
  try {
    await scenario(session);
  } catch (error) {
    await captureBrowserFailure(session, `framing-${name}`);
    throw error;
  } finally {
    await closeAgentBrowser(session);
  }
}

/** An HTML response's framing policy; fails loudly when the response is not a page. */
async function framingPolicy(url: string, init?: RequestInit): Promise<string | null> {
  const response = await fetch(url, { redirect: 'manual', ...init });
  if (response.status === 200) {
    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
  }
  await response.body?.cancel();
  return response.headers.get('x-frame-options');
}

/**
 * A second origin (another loopback port) hosting a decoy page that frames the app,
 * next to a same-origin control frame proving framed content does show up when allowed.
 */
async function startAttackerOrigin(target: string): Promise<{ url: string; server: Server }> {
  const server = createServer((request, response) => {
    response.setHeader('content-type', 'text/html; charset=utf-8');
    if (request.url === '/control') {
      response.end('<!doctype html><title>Control</title><h1>Control frame rendered</h1>');
      return;
    }
    response.end(
      `<!doctype html><title>Decoy</title><h1>Decoy page</h1>` +
        `<iframe title="Control" src="/control" width="400" height="200"></iframe>` +
        `<iframe title="Framed DevMentor" src="${target}" width="800" height="600"></iframe>`,
    );
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/`, server };
}

describe('TC-SEC-084 anti-clickjacking framing policy', () => {
  it('sends X-Frame-Options: DENY on public, auth and signed-in pages', async () => {
    const baseUrl = inject('integrationBaseUrl');

    for (const path of ['/', '/sign-in', '/register']) {
      expect(await framingPolicy(`${baseUrl}${path}`), path).toBe('DENY');
    }
    // A signed-out deep link is redirected to sign-in, and the redirect is covered too.
    expect(await framingPolicy(`${baseUrl}/home`), 'signed-out /home').toBe('DENY');

    await inBrowser('signed-in', async (session) => {
      const mentee = await signInAs(session, baseUrl, 'mock-mentee');
      const response = await fetch(`${baseUrl}/home`, { headers: cookieHeader(mentee), redirect: 'manual' });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/^text\/html/);
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      await response.body?.cancel();
    });
  });

  it('refuses to render inside another origin, while direct navigation still works', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const attacker = await startAttackerOrigin(`${baseUrl}/sign-in`);

    try {
      await inBrowser('cross-origin', async (session) => {
        await runAgentBrowser(session, 'open', attacker.url);
        await runAgentBrowser(session, 'wait', '--text', 'Decoy page');
        // The control frame renders, so framed content is visible to the snapshot…
        await runAgentBrowser(session, 'wait', '2000');
        const snapshot = await runAgentBrowser(session, 'snapshot');
        expect(snapshot).toContain('Control frame rendered');
        // …but the browser refused to render the framed sign-in page.
        expect(snapshot).not.toMatch(/button "Sign in/);
        expect(snapshot).not.toContain('Email address');
        await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'framing-refused.png'));

        // Opened directly, the same page renders and hydrates as before.
        await runAgentBrowser(session, 'open', `${baseUrl}/sign-in`);
        await runAgentBrowser(session, 'wait', '--text', 'Email address');
        expect(await runAgentBrowser(session, 'snapshot')).toMatch(/button "Sign in/);
      });
    } finally {
      await new Promise<void>((resolveClose) => attacker.server.close(() => resolveClose()));
    }
  });
});
