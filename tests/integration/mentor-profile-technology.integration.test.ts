import { resolve } from 'node:path';
import { expect, inject, it } from 'vitest';
import { entities, Invitation, MikroORM, User } from '@devmentor/db';
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
import { acceptInvitationAs, PUBLIC_WORK_URL, transition } from './fixtures/mentor';

it('TC-MENTOR-PAGE-003 refuses profile publication when no technology is selected', async () => {
  const baseUrl = inject('integrationBaseUrl');
  // Only identity uniqueness varies; the data and expected business outcomes are fixed.
  const login = `mentor-technology-${process.pid}`;
  const email = `${login}@devmentor.test`;
  const session = `devmentor-technology-${process.pid}`;
  const bio = 'I help developers build reliable TypeScript services.';
  const orm = await MikroORM.init({ entities, clientUrl: inject('integrationDatabaseUrl') });

  try {
    await orm.connect();
    // Own the account and grant its role through the real invitation flow.
    const signedIn = cookieHeader(await signInAs(session, baseUrl, login));
    await acceptInvitationAs(baseUrl, login, signedIn);
    // Accepting bumps session_version, so refresh the browser's session as a mentor.
    const mentor = cookieHeader(await signInAs(session, baseUrl, login));

    const workspace = await runAgentBrowser(session, 'snapshot');
    expect(workspace).toContain('heading "Get ready for your first session"');
    // Both navigation and header offer this link. Resolve an observed ref afresh,
    // rather than assuming the native CLI supports Playwright compound selectors.
    const editLink = /^\s*- link "Edit profile" \[ref=(e\d+)\]/m.exec(workspace);
    expect(editLink, 'the mentor workspace offers Edit profile').not.toBeNull();
    await runAgentBrowser(session, 'click', `@${editLink![1]}`);
    await runAgentBrowser(session, 'wait', '--text', 'Show mentees how you can help');
    expect((await currentUrl(session)).pathname).toBe('/mentor/profile');

    await runAgentBrowser(session, 'find', 'label', 'About your mentoring', 'fill', bio);
    await runAgentBrowser(session, 'find', 'label', 'Public work link', 'fill', PUBLIC_WORK_URL);
    const editor = await runAgentBrowser(session, 'snapshot');
    expect(editor).toContain('group "Technologies and topics"');
    expect(editor).toContain('checkbox "React"');
    expect(editor).not.toMatch(/checkbox [^\n]*\[checked\]/);
    await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Save profile', '--exact');
    await runAgentBrowser(session, 'wait', '--text', 'Profile saved.');
    await runAgentBrowser(session, 'wait', '--text', 'Complete: Describe your experience.');

    // Isolate the missing technology: all other publication prerequisites are met.
    const saved = await fetch(`${baseUrl}/api/mentors/me`, { headers: mentor });
    expect(saved.status).toBe(200);
    const { data: draft } = await saved.json();
    expect(draft).toMatchObject({ bio, publicWorkUrl: PUBLIC_WORK_URL, stackTags: [], publishedAt: null, slug: null });
    expect(draft.readiness.ready).toBe(false);
    expect(draft.readiness.items.filter((item: { met: boolean }) => !item.met).map((item: { key: string }) => item.key)).toEqual(['stackTags']);

    // When the mentor publishes from Edit profile, the server error reaches the UI.
    await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Publish profile', '--exact');
    await runAgentBrowser(session, 'wait', '--text', 'Complete the required profile fields before publishing.');
    const refused = await runAgentBrowser(session, 'snapshot');
    expect(refused).toContain('Complete: Add a link to your public work.');
    expect(refused).toContain('Complete: Describe your experience.');
    expect(refused).toContain('Required: Choose at least one stack tag.');
    expect(refused).toContain('button "Publish profile"');
    // The field-level error is in addition to the readiness checklist message.
    expect(refused.match(/Choose at least one stack tag\./g)).toHaveLength(2);
    expectAbsent(refused, { role: 'textbox', text: 'Share link' });
    expectAbsent(refused, { role: 'button', text: 'Unpublish page' });
    await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'mentor-profile-technology-refused.png'), '--full');

    // A repeated direct request cannot bypass the same business rule.
    const rejected = await transition(baseUrl, mentor, 'publish');
    expect(rejected.status).toBe(422);
    expect(rejected.body).toMatchObject({ ok: false, error: { fieldErrors: { stackTags: ['Choose at least one stack tag.'] } } });
    expect(Object.keys(rejected.body.error?.fieldErrors ?? {})).toEqual(['stackTags']);
    const after = await fetch(`${baseUrl}/api/mentors/me`, { headers: mentor });
    expect(after.status).toBe(200);
    expect((await after.json()).data).toMatchObject({ bio, publicWorkUrl: PUBLIC_WORK_URL, stackTags: [], publishedAt: null, slug: null });

    // Persisted draft state survives a reload; a transient UI error cannot hide publication.
    await runAgentBrowser(session, 'open', `${baseUrl}/mentor/profile`);
    await runAgentBrowser(session, 'wait', '--text', 'Required: Choose at least one stack tag.');
    const reloaded = await runAgentBrowser(session, 'snapshot');
    expect(reloaded).toContain('button "Publish profile"');
    expectAbsent(reloaded, { role: 'textbox', text: 'Share link' });
  } catch (error) {
    await captureBrowserFailure(session, 'mentor-profile-technology');
    throw error;
  } finally {
    await closeAgentBrowser(session);
    try {
      // Invitations reference their accepting user; deleting the user cascades its profile.
      await orm.em.fork().transactional(async (em) => {
        await em.nativeDelete(Invitation, { email });
        await em.nativeDelete(User, { email });
      });
    } finally {
      await orm.close();
    }
  }
});
