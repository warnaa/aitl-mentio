import { resolve } from 'node:path';
import { describe, expect, inject, it, vi } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  cookieHeader,
  currentUrl,
  expectFitsMobile,
  integrationArtifactsDirectory,
  runAgentBrowser,
  sessionCookie,
  signInAs,
} from './agent-browser';
import { expectAbsent } from './assertions';
import { CSRF_HEADERS, seedPendingInvitation, tokenOf } from './fixtures/mentor';

/*
 * E02-S01 #34 invitation and role grant. Each scenario signs in a persona of its own
 * (the mock adapter gives `<login>@devmentor.test` as a verified email) and seeds its
 * invitation through `npm run invite`, so no scenario depends on another's state.
 */

// Each scenario seeds through `npm run invite` (a fresh Node process per invitation)
// before driving the browser, which outgrows the suite's 60-second default.
vi.setConfig({ testTimeout: 180_000 });

let sequence = 0;
const unique = (name: string) => `${name}-${process.pid}-${++sequence}`;

const screenshot = (session: string, name: string) =>
  runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, `${name}.png`), '--full');

async function inBrowser(name: string, scenario: (session: string) => Promise<void>): Promise<void> {
  const session = `devmentor-invitations-${unique(name)}`;
  try {
    await scenario(session);
  } catch (error) {
    await captureBrowserFailure(session, `invitations-${name}`);
    throw error;
  } finally {
    await closeAgentBrowser(session);
  }
}

async function visit(session: string, url: string, text: string): Promise<string> {
  await runAgentBrowser(session, 'open', url);
  await runAgentBrowser(session, 'wait', '--text', text);
  return runAgentBrowser(session, 'snapshot');
}

const accept = (baseUrl: string, token: string, headers: Record<string, string>) =>
  fetch(`${baseUrl}/api/invitations/${token}/accept`, { method: 'POST', headers: { ...headers, ...CSRF_HEADERS } });

describe('TC-INVITATION-001 accepting an invitation makes a signed-in user a mentor', () => {
  it('lands on the mentor home with the publish-by date and stays signed in with both roles', async () => {
    const baseUrl = inject('integrationBaseUrl');
    await inBrowser('accept', async (session) => {
      const login = unique('invitee');
      await signInAs(session, baseUrl, login);
      const before = await sessionCookie(session);
      const link = await seedPendingInvitation(`${login}@devmentor.test`);

      const invitation = await visit(session, link, 'Your mentor invitation');
      expect(invitation).toContain(`${login}@devmentor.test`);
      await screenshot(session, 'invitation-pending');
      await expectFitsMobile(session, 'invitation-pending');
      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Accept invitation');
      await runAgentBrowser(session, 'wait', '--text', 'Publish at least one bookable session by');
      expect((await currentUrl(session)).pathname).toBe('/mentor');

      // The C1 regression: the grant bumps session_version, so without the re-issued
      // cookie the next navigation would land on sign-in.
      const after = await sessionCookie(session);
      expect(after?.value).not.toBe(before?.value);
      const home = await visit(session, `${baseUrl}/mentor`, 'Publish at least one bookable session by');
      expect((await currentUrl(session)).pathname).toBe('/mentor');
      expect(home).toContain('link "Mentee home"');
      expect(home).toContain('link "Mentor home"');
      await screenshot(session, 'invitation-accepted-mentor-home');
      await expectFitsMobile(session, 'invitation-accepted-mentor-home');

      // A consumed link answers exactly like an unknown one.
      const reused = await visit(session, link, 'This invitation is not valid.');
      expectAbsent(reused, { role: 'button', text: 'Accept invitation' });
      expect((await accept(baseUrl, tokenOf(link), cookieHeader(after!))).status).toBe(404);
    });
  });
});

describe('TC-INVITATION-002 invalid invitations grant nothing', () => {
  it('shows one sentence for an unknown token, whoever opens it', async () => {
    const baseUrl = inject('integrationBaseUrl');
    await inBrowser('unknown', async (session) => {
      const snapshot = await visit(session, `${baseUrl}/invitation/not-a-real-token`, 'This invitation is not valid.');
      expectAbsent(snapshot, { role: 'button', text: 'Accept invitation' });
      expectAbsent(snapshot, { text: /@/ });
      await screenshot(session, 'invitation-unknown');
    });
    const response = await fetch(`${baseUrl}/api/invitations/not-a-real-token`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ ok: false, error: { message: 'This invitation is not valid.' } });
  });

  it('refuses another verified account, leaving the invitation for its owner', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const invitee = unique('owner');
    const link = await seedPendingInvitation(`${invitee}@devmentor.test`);
    await inBrowser('mismatch', async (session) => {
      const other = await signInAs(session, baseUrl, unique('other'));
      const snapshot = await visit(session, link, 'This invitation belongs to a different email address.');
      expectAbsent(snapshot, { role: 'button', text: 'Accept invitation' });
      expect(snapshot).toContain('button "Sign out"');
      await screenshot(session, 'invitation-mismatch');
      expect((await accept(baseUrl, tokenOf(link), cookieHeader(other))).status).toBe(403);
    });
    expect((await fetch(`${baseUrl}/api/invitations/${tokenOf(link)}`)).status).toBe(200);
  });

  it('lets exactly one of two simultaneous acceptances win', async () => {
    const baseUrl = inject('integrationBaseUrl');
    await inBrowser('race', async (session) => {
      const login = unique('racer');
      const cookie = await signInAs(session, baseUrl, login);
      const token = tokenOf(await seedPendingInvitation(`${login}@devmentor.test`));
      const responses = await Promise.all([1, 2].map(() => accept(baseUrl, token, cookieHeader(cookie))));
      // The loser finds the invitation consumed (404), or, if it authenticated after the
      // winner committed, a retired session version (401). Either way it grants nothing.
      const [winner, ...losers] = [...responses].sort((a, b) => a.status - b.status);
      expect(winner!.status).toBe(200);
      expect(losers.map((response) => response.status)).toEqual([expect.toBeOneOf([401, 404])]);
      expect(winner!.headers.get('set-cookie')).toContain('devmentor_session=');
      expect(await winner!.json()).toMatchObject({ ok: true, data: { roles: ['mentee', 'mentor'] } });
    });
  });

  it('refuses acceptance without the CSRF header', async () => {
    const baseUrl = inject('integrationBaseUrl');
    await inBrowser('csrf', async (session) => {
      const login = unique('csrf');
      const cookie = await signInAs(session, baseUrl, login);
      const token = tokenOf(await seedPendingInvitation(`${login}@devmentor.test`));
      const forged = await fetch(`${baseUrl}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: cookieHeader(cookie),
      });
      expect(forged.status).toBe(403);
      expect((await fetch(`${baseUrl}/api/invitations/${token}`)).status).toBe(200);
    });
  });
});

describe('TC-INVITATION-003 a signed-in user finds no path to become a mentor (R07)', () => {
  it('offers a mentee no invitation, application or mentor link', async () => {
    const baseUrl = inject('integrationBaseUrl');
    await inBrowser('no-path', async (session) => {
      await signInAs(session, baseUrl, unique('mentee'));
      const snapshot = await visit(session, `${baseUrl}/home`, 'Mentee home');
      expect(snapshot).toContain('navigation "Workspace navigation"');
      expectAbsent(snapshot, { role: 'link', text: /mentor|become|apply|invit/i });
      expectAbsent(snapshot, { role: 'button', text: /mentor|become|apply|invit/i });
    });
  });
});
