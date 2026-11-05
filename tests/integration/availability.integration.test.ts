import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, inject, it } from 'vitest';
import { captureBrowserFailure, closeAgentBrowser, cookieHeader, expectFitsMobile, integrationArtifactsDirectory, runAgentBrowser, sessionCookie, signInAs } from './agent-browser';
import { acceptInvitationAs, CSRF_HEADERS, seedPublishedMentorProfile, seedPendingInvitation } from './fixtures/mentor';

it('TC-AVAILABILITY-001 scopes writes, serializes duplicates and preserves removed history', async () => {
  const base = inject('integrationBaseUrl');
  const session = `slots-api-${process.pid}`;
  try {
    const login = `slots-owner-${process.pid}`;
    const initial = cookieHeader(await signInAs(session, base, login));
    const mentor = await acceptInvitationAs(base, login, initial);
    const slug = await seedPublishedMentorProfile(base, mentor);
    const path = `${base}/api/availability/slots`;
    const headers = { ...mentor, ...CSRF_HEADERS, 'content-type': 'application/json' };
    const startsAt = new Date(Date.now() + 24 * 3600000).toISOString();
    expect((await fetch(path)).status).toBe(401);
    expect((await fetch(path, { method: 'POST', headers: mentor, body: JSON.stringify({ startsAt }) })).status).toBe(403);
    expect((await fetch(path, { method: 'POST', headers, body: JSON.stringify({ startsAt: '2000-01-01T00:00:00Z' }) })).status).toBe(422);
    const parallel = await Promise.all([1, 2].map(() => fetch(path, { method: 'POST', headers, body: JSON.stringify({ startsAt, mentorProfileId: crypto.randomUUID() }) })));
    expect(parallel.map(r => r.status).sort()).toEqual([200, 409]);
    const created = (await parallel.find(r => r.status === 200)!.json()).data as { id: string };
    const publicSlots = (await (await fetch(`${base}/api/mentors/${slug}`)).json()).data.slots;
    expect(publicSlots).toEqual([{ id: created.id, startsAt, meetsLeadTime: true }]);
    const foreignLogin = `slots-other-${process.pid}`;
    const foreignInitial = cookieHeader(await signInAs(session, base, foreignLogin));
    expect((await fetch(path, { headers: foreignInitial })).status).toBe(403);
    const foreign = await acceptInvitationAs(base, foreignLogin, foreignInitial);
    const foreignHeaders = { ...foreign, ...CSRF_HEADERS };
    const denied = await fetch(`${path}/${created.id}`, { method: 'DELETE', headers: foreignHeaders });
    const absent = await fetch(`${path}/${crypto.randomUUID()}`, { method: 'DELETE', headers: foreignHeaders });
    expect(denied.status).toBe(404); expect(await denied.json()).toEqual(await absent.json());
    expect((await fetch(`${path}/${created.id}`, { method: 'DELETE', headers: mentor })).status).toBe(403);
    expect((await fetch(`${path}/${created.id}`, { method: 'DELETE', headers })).status).toBe(200);
    expect((await (await fetch(`${base}/api/mentors/${slug}`)).json()).data.slots).toEqual([]);
    const republished = await fetch(path, { method: 'POST', headers, body: JSON.stringify({ startsAt }) });
    expect(republished.status).toBe(200); expect((await republished.json()).data.id).not.toBe(created.id);
    expect((await fetch(`${path}/invalid`, { method: 'DELETE', headers })).status).toBe(422);
    const additional = await Promise.all(Array.from({ length: 51 }, (_, index) => fetch(path, { method: 'POST', headers, body: JSON.stringify({ startsAt: new Date(Date.UTC(2099, 10, 6, 12, index)).toISOString() }) })));
    expect(additional.every(response => response.ok)).toBe(true);
    const secondPage = (await (await fetch(`${path}?page=2`, { headers: mentor })).json()).data;
    expect(secondPage.items).toHaveLength(25); expect(secondPage).toMatchObject({ page: 2, pageCount: 3 });
    expect((await (await fetch(`${path}?past=true`, { headers: mentor })).json()).data.items).toEqual([]);
    expect((await fetch(`${path}?page=-1`, { headers: mentor })).status).toBe(422);
    expect((await (await fetch(`${base}/api/mentors/${slug}`)).json()).data.slots).toHaveLength(50);
  } finally { await closeAgentBrowser(session); }
});

it('TC-AVAILABILITY-002 publishes locally entered time and shows it signed out', async () => {
  const base = inject('integrationBaseUrl');
  const session = `slots-browser-${process.pid}`;
  const visitor = `${session}-visitor`;
  try {
    const login = `slots-ui-${process.pid}`;
    await signInAs(session, base, login);
    await runAgentBrowser(session, 'open', await seedPendingInvitation(`${login}@devmentor.test`));
    await runAgentBrowser(session, 'wait', '--text', 'Your mentor invitation');
    await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Accept invitation');
    await runAgentBrowser(session, 'wait', '--text', 'Publish at least one bookable session by');
    const cookies = cookieHeader((await sessionCookie(session))!);
    const slug = await seedPublishedMentorProfile(base, cookies);
    await runAgentBrowser(session, 'open', `${base}/mentor/slots`);
    await runAgentBrowser(session, 'wait', '--text', 'Publish time');
    const tree = await runAgentBrowser(session, 'snapshot');
    expect(tree).toContain('Start time'); expect(tree).toContain('Publish time');
    // Native date controls expose locale-dependent spinbuttons; use their observed label's control.
    const filled = await runAgentBrowser(session, 'eval', `(() => { const field = Array.from(document.querySelectorAll('label')).find(label => label.textContent.startsWith('Start time')).control; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, '2099-11-06T14:30'); field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true })); return field.value; })()`);
    expect(filled).toContain('2099-11-06T14:30');
    await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Publish time');
    await runAgentBrowser(session, 'wait', '--text', 'Your time is published.');
    const timing = await runAgentBrowser(session, 'eval', `JSON.stringify({ domContentLoadedMs: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd, responseStartMs: performance.getEntriesByType('navigation')[0].responseStart })`);
    await writeFile(resolve(integrationArtifactsDirectory, 'availability-navigation.json'), timing);
    await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'mentor-slots.png'), '--full');
    await expectFitsMobile(session, 'mentor-slots');
    await runAgentBrowser(visitor, 'open', `${base}/m/${slug}`);
    await runAgentBrowser(visitor, 'wait', '--text', 'Meets the two-hour notice period.');
    expect(await runAgentBrowser(visitor, 'snapshot')).not.toMatch(/rating|ranking|review|score/i);
    await runAgentBrowser(visitor, 'screenshot', resolve(integrationArtifactsDirectory, 'public-slots.png'), '--full');
    await expectFitsMobile(visitor, 'public-slots');
    await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Remove time');
    await runAgentBrowser(session, 'wait', '--text', 'Your time was removed.');
  } catch (error) { await captureBrowserFailure(session, 'slots'); throw error; }
  finally { await closeAgentBrowser(session); await closeAgentBrowser(visitor); }
});




