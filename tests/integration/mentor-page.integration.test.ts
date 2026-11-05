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
import {
  acceptInvitationAs,
  completeMentorProfile,
  PUBLIC_WORK_URL,
  seedPendingInvitation,
  seedPublishedMentorProfile,
  transition,
} from './fixtures/mentor';

/*
 * E02-S02 #35 mentor page and share link. Every mentor is a fresh persona made a
 * mentor through a real invitation, so slugs never collide across scenarios or runs
 * unless a scenario arranges it on purpose.
 */

// Each scenario seeds through `npm run invite` (a fresh Node process per invitation)
// before driving the browser, which outgrows the suite's 60-second default.
vi.setConfig({ testTimeout: 180_000 });

let sequence = 0;
const unique = (name: string) => `${name}-${process.pid}-${++sequence}`;

const screenshot = (session: string, name: string) =>
  runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, `${name}.png`), '--full');

async function inBrowser(name: string, scenario: (session: string) => Promise<void>): Promise<void> {
  const session = `devmentor-mentor-page-${unique(name)}`;
  try {
    await scenario(session);
  } catch (error) {
    await captureBrowserFailure(session, `mentor-page-${name}`);
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

/** N02/R04 and D21/R13: no score, review, rating or ranking in any E02 markup. */
function expectNoReputation(snapshot: string): void {
  expectAbsent(snapshot, { text: /\b(ratings?|reviews?|scores?|rank(ed|ing)?|stars?)\b/i });
}

/** A signed-in persona who just became a mentor, with their re-issued session. */
async function newMentor(session: string, baseUrl: string, login = unique('mentor')) {
  const signedIn = cookieHeader(await signInAs(session, baseUrl, login));
  return { login, mentor: await acceptInvitationAs(baseUrl, login, signedIn) };
}

describe('TC-MENTOR-PAGE-001 a mentor publishes a page a signed-out visitor can open', () => {
  it('completes, publishes and shares the page through the profile screen', async () => {
    const baseUrl = inject('integrationBaseUrl');
    let shareLink = '';

    await inBrowser('publish', async (session) => {
      const login = unique('author');
      await signInAs(session, baseUrl, login);
      await visit(session, await seedPendingInvitation(`${login}@devmentor.test`), 'You are invited to mentor');
      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Accept invitation');
      await runAgentBrowser(session, 'wait', '--text', 'Publish by ');

      const empty = await visit(session, `${baseUrl}/mentor/profile`, 'Show mentees how you can help');
      expect(empty).toContain('Required: Add a link to your public work.');
      expectNoReputation(empty);
      // An incomplete page is refused, and the refusal names the missing pieces.
      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Publish profile');
      await runAgentBrowser(session, 'wait', '--text', 'Complete the required profile fields before publishing.');
      await screenshot(session, 'mentor-profile-refused');

      await runAgentBrowser(session, 'find', 'label', 'Public work link', 'fill', PUBLIC_WORK_URL);
      await runAgentBrowser(session, 'find', 'label', 'About your mentoring', 'fill', 'I pair on React pull requests.');
      await runAgentBrowser(session, 'find', 'label', 'React', 'check');
      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Save profile');
      await runAgentBrowser(session, 'wait', '--text', 'Complete: Add a link to your public work.');
      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Publish profile');
      await runAgentBrowser(session, 'wait', '--text', 'Share your profile');

      const published = await runAgentBrowser(session, 'snapshot');
      // The share link is a read-only field; the snapshot shows its value.
      const match = new RegExp(`textbox "Share link"[^\\n]*?(${baseUrl.replaceAll('.', '\\.')}/m/[a-z0-9-]+)`).exec(published);
      expect(match, 'the share link is shown').not.toBeNull();
      shareLink = match![1]!;
      expect(published).toContain('button "Unpublish page"');
      expect(published).toContain('button "Copy profile link"');
      expectNoReputation(published);
      await screenshot(session, 'mentor-profile-published');
      await expectFitsMobile(session, 'mentor-profile-published');
    });

    await inBrowser('visitor', async (session) => {
      const page = await visit(session, shareLink, 'I pair on React pull requests.');
      expect(page).toContain('link "View public work"');
      expect(page).toContain('heading "About me"');
      expect(page).toContain('React');
      expectNoReputation(page);
      expectAbsent(page, { text: /@devmentor\.test/ });
      await screenshot(session, 'mentor-page-public');
      await expectFitsMobile(session, 'mentor-page-public');
    });
  });
});

describe('TC-MENTOR-PAGE-002 publication keeps one slug and a private boundary', () => {
  it('refuses an incomplete page, then publishes, unpublishes and republishes under the same slug', async () => {
    const baseUrl = inject('integrationBaseUrl');
    await inBrowser('lifecycle', async (session) => {
      const { mentor } = await newMentor(session, baseUrl);

      const refused = await transition(baseUrl, mentor, 'publish');
      expect(refused.status).toBe(422);
      expect(Object.keys(refused.body.error?.fieldErrors ?? {}).sort()).toEqual(['bio', 'publicWorkUrl', 'stackTags']);

      const slug = await seedPublishedMentorProfile(baseUrl, mentor);
      const page = await fetch(`${baseUrl}/api/mentors/${slug}`);
      expect(page.status).toBe(200);
      const body = (await page.json()) as { data: Record<string, unknown> };
      // The projection boundary: exactly the public keys, nothing private.
      expect(Object.keys(body.data).sort()).toEqual(['avatarUrl', 'bio', 'displayName', 'offerReadiness', 'offerReady', 'prices', 'publicWorkUrl', 'slots', 'slug', 'stackTags']);
      expect(JSON.stringify(body)).not.toMatch(/@|publishDueAt|initialPublishDueAt|publishedAt/);

      const hidden = await transition(baseUrl, mentor, 'unpublish');
      expect(hidden.body.data).toMatchObject({ slug, publishedAt: null });
      expect((await fetch(`${baseUrl}/api/mentors/${slug}`)).status).toBe(404);
      expect((await fetch(`${baseUrl}/m/${slug}`)).status).toBe(404);

      const again = await transition(baseUrl, mentor, 'publish');
      expect(again.body.data?.slug).toBe(slug);
      expect((await fetch(`${baseUrl}/api/mentors/${slug}`)).status).toBe(200);
    });
  });

  it('gives two mentors whose names make the same slug distinct share links when they publish at once', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const name = unique('twin');
    const mentors: Record<string, string>[] = [];
    // `twin--N` and `twin-N` are different logins whose display names slugify alike.
    for (const login of [name, name.replace('twin-', 'twin--')]) {
      await inBrowser('twin', async (session) => {
        const { mentor } = await newMentor(session, baseUrl, login);
        await completeMentorProfile(baseUrl, mentor, 'Twin experience');
        mentors.push(mentor);
      });
    }
    const results = await Promise.all(mentors.map((mentor) => transition(baseUrl, mentor, 'publish')));
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect(results.map((result) => result.body.data?.slug).sort()).toEqual([name, `${name}-2`]);
  });

  it('keeps owner routes behind the mentor role', async () => {
    const baseUrl = inject('integrationBaseUrl');
    await inBrowser('mentee-refused', async (session) => {
      const mentee = cookieHeader(await signInAs(session, baseUrl, unique('mentee')));
      expect((await fetch(`${baseUrl}/api/mentors/me`, { headers: mentee })).status).toBe(403);
      expect((await transition(baseUrl, mentee, 'publish')).status).toBe(403);
      expect((await fetch(`${baseUrl}/api/mentors/me`)).status).toBe(401);
    });
  });
});
