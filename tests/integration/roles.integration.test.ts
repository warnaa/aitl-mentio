import { resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  cookieHeader,
  currentUrl,
  integrationArtifactsDirectory,
  runAgentBrowser,
  signInAs,
} from './agent-browser';
import { expectAbsent } from './assertions';

/*
 * E01 #33 roles and access, in a real browser against the seeded personas: mock-mentee
 * (Grace Hopper, mentee), mock-mentor (Ada Lovelace, mentor) and mock-operator
 * (Margaret Hamilton, mentor and operator, via OPERATOR_EMAILS). Every scenario owns an
 * isolated browser session and closes it in `finally`. Nothing here signs out, so the
 * seeded personas' sessions elsewhere stay valid.
 */

let sequence = 0;
const browserSession = (name: string) => `devmentor-roles-${name}-${process.pid}-${++sequence}`;

const screenshot = (session: string, name: string) =>
  runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, `${name}.png`), '--full');

async function inBrowser(name: string, scenario: (session: string) => Promise<void>): Promise<void> {
  const session = browserSession(name);
  try {
    await scenario(session);
  } catch (error) {
    await captureBrowserFailure(session, `roles-${name}`);
    throw error;
  } finally {
    await closeAgentBrowser(session);
  }
}

/** The link names inside the shell's `navigation "Workspace navigation"` landmark. */
function workspaceLinks(snapshot: string): string[] {
  const lines = snapshot.split('\n');
  const start = lines.findIndex((line) => line.includes('navigation "Workspace navigation"'));
  if (start === -1) return [];
  const depth = lines[start]!.search(/\S/);
  const links: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() !== '' && line.search(/\S/) <= depth) break;
    const match = /^\s*- link "([^"]*)"/.exec(line);
    if (match) links.push(match[1]!);
  }
  return links;
}

/** Open `path` and wait for `text`, returning the snapshot and where the browser landed. */
async function visit(session: string, baseUrl: string, path: string, text: string) {
  await runAgentBrowser(session, 'open', `${baseUrl}${path}`);
  await runAgentBrowser(session, 'wait', '--text', text);
  return { snapshot: await runAgentBrowser(session, 'snapshot'), url: await currentUrl(session) };
}

describe('TC-ROLES-001 a wrong-role screen sends the user to their own home', () => {
  it('sends a mentee who opens the mentor or admin screen to /home (edge case 19)', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('mentee-refused', async (session) => {
      await signInAs(session, baseUrl, 'mock-mentee');

      for (const path of ['/mentor', '/admin', '/admin/users']) {
        const { snapshot, url } = await visit(session, baseUrl, path, 'Mentee home');
        expect(url.pathname, `opening ${path}`).toBe('/home');
        expect(snapshot).toContain('heading "Mentee home"');
        expect(snapshot).not.toContain('heading "Mentor home"');
        expect(snapshot).not.toContain('heading "Dashboard"');
      }
      await screenshot(session, 'roles-mentee-sent-home');
    });
  });

  it('refuses /admin to a mentor, sending them to /mentor without any admin content (edge case 20)', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('mentor-refused', async (session) => {
      await signInAs(session, baseUrl, 'mock-mentor');

      for (const path of ['/admin', '/admin/users']) {
        const { snapshot, url } = await visit(session, baseUrl, path, 'Mentor home');
        expect(url.pathname, `opening ${path}`).toBe('/mentor');
        expect(snapshot).not.toContain('heading "Dashboard"');
        expect(snapshot).not.toContain('heading "Users"');
        expect(snapshot).not.toContain('mock-mentee@devmentor.test');
      }
      await screenshot(session, 'roles-mentor-refused-admin');
    });
  });
});

describe('TC-ROLES-002 navigation follows the union of roles, with no way to gain one (R07)', () => {
  const personas = [
    { login: 'mock-mentee', home: '/home', heading: 'Mentee home', links: ['Mentee home'] },
    { login: 'mock-mentor', home: '/mentor', heading: 'Mentor home', links: ['Mentor home'] },
    {
      login: 'mock-operator',
      home: '/admin',
      heading: 'Dashboard',
      links: ['Admin dashboard', 'Users', 'Mentor home'],
    },
  ] as const;

  it.each(personas)('$login sees exactly its permitted links and no "become a mentor" path', async (persona) => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser(`nav-${persona.login}`, async (session) => {
      await signInAs(session, baseUrl, persona.login);
      expect((await currentUrl(session)).pathname).toBe(persona.home);
      await runAgentBrowser(session, 'wait', '--text', persona.heading);
      const snapshot = await runAgentBrowser(session, 'snapshot');

      // Absence only means something against a navigation that actually rendered.
      expect(workspaceLinks(snapshot)).toEqual(persona.links);
      expect(() => expectAbsent(snapshot, { role: 'link', text: persona.links[0] })).toThrow();

      for (const role of ['link', 'button']) {
        expectAbsent(snapshot, { role, text: /become a mentor|apply (to|as)|join as a mentor|mentor application/i });
      }
      expectAbsent(snapshot, { role: 'link', text: /^(Register|Sign up)/i });
      await screenshot(session, `roles-nav-${persona.login}`);
    });
  });

  it('lets the combined mentor/operator open both workspaces from one navigation', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('combined', async (session) => {
      await signInAs(session, baseUrl, 'mock-operator');

      await runAgentBrowser(session, 'find', 'role', 'link', 'click', '--name', 'Mentor home');
      await runAgentBrowser(session, 'wait', '--text', 'Mentor home');
      expect((await currentUrl(session)).pathname).toBe('/mentor');
      const mentor = await runAgentBrowser(session, 'snapshot');
      expect(mentor).toContain('heading "Mentor home"');
      expect(workspaceLinks(mentor)).toEqual(['Admin dashboard', 'Users', 'Mentor home']);

      await runAgentBrowser(session, 'find', 'role', 'link', 'click', '--name', 'Users');
      await runAgentBrowser(session, 'wait', '--text', 'Ada Lovelace');
      expect((await currentUrl(session)).pathname).toBe('/admin/users');
      await screenshot(session, 'roles-combined-users');
    });
  });
});

describe('TC-ROLES-003 the user list is operator-only, in the page and the API', () => {
  it('shows the operator the users list and answers a mentee 403 from /api/users', async () => {
    const baseUrl = inject('integrationBaseUrl');

    await inBrowser('operator-users', async (session) => {
      await signInAs(session, baseUrl, 'mock-operator');
      const { snapshot } = await visit(session, baseUrl, '/admin/users', 'Ada Lovelace');
      expect(snapshot).toContain('heading "Users"');
      expect(snapshot).toContain('cell "Ada Lovelace"');
      expect(snapshot).toContain('cell "mock-mentee@devmentor.test"');
    });

    await inBrowser('mentee-api', async (session) => {
      const mentee = await signInAs(session, baseUrl, 'mock-mentee');
      const response = await fetch(`${baseUrl}/api/users`, { headers: cookieHeader(mentee) });
      const payload = (await response.json()) as { ok: boolean; data?: unknown; error?: { code: string } };
      expect(response.status).toBe(403);
      expect(payload).toMatchObject({ ok: false, error: { code: 'forbidden' } });
      expect(payload.data).toBeUndefined();
    });
  });
});
