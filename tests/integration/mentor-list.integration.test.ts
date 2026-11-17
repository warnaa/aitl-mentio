import { resolve } from 'node:path';
import { describe, expect, inject, it, vi } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  cookieHeader,
  expectFitsMobile,
  integrationArtifactsDirectory,
  runAgentBrowser,
  signInAs,
} from './agent-browser';
import { expectAbsent } from './assertions';
import { acceptInvitationAs, CSRF_HEADERS, seedMentorWithSlots, seedOfferReadyMentor } from './fixtures/mentor';

/*
 * E03-S01 #39, the public mentor list (spec 2026-11-09-mentor-list). The integration
 * database is shared by every scenario in the run, so assertions concern the mentors this
 * file seeds — their presence, absence and relative order — never the whole list.
 */

// Each mentor is invited through `npm run invite` (a fresh Node process), which outgrows the default.
vi.setConfig({ testTimeout: 240_000 });

let sequence = 0;
const unique = (name: string) => `${name}-${process.pid}-${++sequence}`;

interface ListedMentor { slug: string; displayName: string; stackTags: string[]; nextSlotStartsAt: string }

async function inBrowser(name: string, scenario: (session: string) => Promise<void>): Promise<void> {
  const session = `devmentor-mentor-list-${unique(name)}`;
  try {
    await scenario(session);
  } catch (error) {
    await captureBrowserFailure(session, `mentor-list-${name}`);
    throw error;
  } finally {
    await closeAgentBrowser(session);
  }
}

/** A signed-in persona made a mentor through a real invitation, in its own browser session. */
async function newMentor(baseUrl: string): Promise<Record<string, string>> {
  let mentor: Record<string, string> = {};
  await inBrowser('seed', async (session) => {
    const login = unique('listed');
    mentor = await acceptInvitationAs(baseUrl, login, cookieHeader(await signInAs(session, baseUrl, login)));
  });
  return mentor;
}

async function setStackTags(baseUrl: string, mentor: Record<string, string>, stackTags: string[]): Promise<void> {
  const response = await fetch(`${baseUrl}/api/mentors/me`, {
    method: 'PUT',
    headers: { ...mentor, ...CSRF_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify({ stackTags }),
  });
  if (!response.ok) throw new Error(`changing stack tags answered ${response.status}`);
}

async function listed(baseUrl: string, query = ''): Promise<ListedMentor[]> {
  const response = await fetch(`${baseUrl}/api/mentors${query}`);
  expect(response.status).toBe(200);
  return ((await response.json()) as { data: { mentors: ListedMentor[] } }).data.mentors;
}

describe('TC-MENTOR-LIST-001 a mentee finds a bookable mentor by stack tag', () => {
  it('lists bookable mentors newest availability first, filters by tag, and offers no search or score', async () => {
    const baseUrl = inject('integrationBaseUrl');
    // Seeded in order, so `pythonMentor` published availability last and is listed first.
    const reactMentor = await seedOfferReadyMentor(baseUrl, await newMentor(baseUrl));
    const pythonSession = await newMentor(baseUrl);
    const pythonMentor = await seedOfferReadyMentor(baseUrl, pythonSession);
    await setStackTags(baseUrl, pythonSession, ['python']);
    const unpriced = await seedMentorWithSlots(baseUrl, await newMentor(baseUrl));

    const all = await listed(baseUrl);
    const slugs = all.map((mentor) => mentor.slug);
    expect(slugs).toContain(reactMentor.slug);
    expect(slugs.indexOf(pythonMentor.slug)).toBeGreaterThanOrEqual(0);
    expect(slugs.indexOf(pythonMentor.slug)).toBeLessThan(slugs.indexOf(reactMentor.slug));
    expect(slugs).not.toContain(unpriced.slug);
    expect(all.find((mentor) => mentor.slug === reactMentor.slug)?.nextSlotStartsAt).toBe(reactMentor.slot.startsAt);
    expect(JSON.stringify(all)).not.toMatch(/"(id|email|rating|score|rank)"/);

    const python = (await listed(baseUrl, '?tag=python')).map((mentor) => mentor.slug);
    expect(python).toContain(pythonMentor.slug);
    expect(python).not.toContain(reactMentor.slug);
    const invalid = await fetch(`${baseUrl}/api/mentors?tag=rust`);
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({ ok: false, error: { code: 'validation_failed' } });

    const pythonName = all.find((mentor) => mentor.slug === pythonMentor.slug)!.displayName;
    const reactName = all.find((mentor) => mentor.slug === reactMentor.slug)!.displayName;
    await inBrowser('visitor', async (session) => {
      await runAgentBrowser(session, 'open', `${baseUrl}/`);
      await runAgentBrowser(session, 'find', 'role', 'link', 'click', '--name', 'Browse mentors');
      await runAgentBrowser(session, 'wait', '--text', 'mentors available');
      const page = await runAgentBrowser(session, 'snapshot');
      expect(page).toContain('heading "Find a mentor"');
      expect(page).toContain('button "Python"');
      expect(page.indexOf(`article "${pythonName}"`)).toBeGreaterThanOrEqual(0);
      expect(page.indexOf(`article "${pythonName}"`)).toBeLessThan(page.indexOf(`article "${reactName}"`));
      expectAbsent(page, { role: 'searchbox' });
      expectAbsent(page, { text: /\b(ratings?|reviews?|scores?|featured|rank(ed|ing)?)\b/i });
      await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'mentor-list.png'), '--full');
      await expectFitsMobile(session, 'mentor-list');

      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Python');
      await runAgentBrowser(session, 'wait', '--url', '**/mentors?tag=python');
      await runAgentBrowser(session, 'wait', '--text', pythonName);
      const filtered = await runAgentBrowser(session, 'snapshot');
      expect(filtered).toContain(`article "${pythonName}"`);
      expect(filtered).not.toContain(`article "${reactName}"`);
      await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'mentor-list-python.png'), '--full');

      await runAgentBrowser(session, 'find', 'role', 'link', 'click', '--name', 'View profile');
      await runAgentBrowser(session, 'wait', '--url', `**/m/${pythonMentor.slug}`);

      await runAgentBrowser(session, 'open', `${baseUrl}/mentors?tag=rust`);
      await runAgentBrowser(session, 'wait', '--text', 'We do not list that stack');
    });
  });
});
