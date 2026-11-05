import { resolve } from 'node:path';
import { expect, inject, it } from 'vitest';
import { captureBrowserFailure, closeAgentBrowser, cookieHeader, expectFitsMobile, integrationArtifactsDirectory, runAgentBrowser, sessionCookie, signInAs } from './agent-browser';
import { acceptInvitationAs, CSRF_HEADERS, seedOfferReadyMentor, seedMentorWithSlots, seedPendingInvitation } from './fixtures/mentor';

it('TC-PRICES-001 enforces exact bounds, atomic two-price updates and live ownership', async () => {
  const base = inject('integrationBaseUrl'); const session = `prices-api-${process.pid}`;
  try {
    const login = `prices-owner-${process.pid}`;
    const signedIn = cookieHeader(await signInAs(session, base, login));
    const endpoint = `${base}/api/mentors/me/prices`;
    const send = (headers: Record<string, string>, input: unknown) => fetch(endpoint, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(input) });
    expect((await send(CSRF_HEADERS, {})).status).toBe(401);
    expect((await send({ ...signedIn, ...CSRF_HEADERS }, {})).status).toBe(403);
    const mentor = await acceptInvitationAs(base, login, signedIn);
    const headers = { ...mentor, ...CSRF_HEADERS };
    const { slug } = await seedMentorWithSlots(base, mentor);
    const unpriced = (await (await fetch(`${base}/api/mentors/${slug}`)).json()).data;
    expect(unpriced.prices).toBeNull(); expect(unpriced.offerReady).toBe(false);
    expect(unpriced.offerReadiness.items).toContainEqual({ key: 'price25', label: 'Set a valid 25-minute price.', met: false });
    expect((await send(mentor, { price25: '80', price50: '160' })).status).toBe(403);
    for (const input of [{ price25: '80', price50: '160' }, { price25: '600.00', price50: '1200.00' }]) expect((await send(headers, input)).status).toBe(200);
    for (const input of [{ price25: '79.99', price50: '160' }, { price25: '600.01', price50: '160' }, { price25: '80', price50: '159.99' }, { price25: '80', price50: '1200.01' }, { price25: '80.001', price50: '160' }, { price25: '80' }, { price25: '1e2', price50: '160' }]) {
      expect((await send(headers, input)).status).toBe(422);
      const owner = (await (await fetch(`${base}/api/mentors/me`, { headers: mentor })).json()).data;
      expect(owner.prices).toEqual({ price25Cents: 60000, price50Cents: 120000, currency: 'PLN' });
    }
    expect((await send(headers, { price25: '80', price50: '160', currency: 'USD', priceBounds: {}, price25Cents: 1, userId: crypto.randomUUID() })).status).toBe(200);
    const publicData = (await (await fetch(`${base}/api/mentors/${slug}`)).json()).data;
    expect(publicData.prices).toEqual({ price25Cents: 8000, price50Cents: 16000, currency: 'PLN' }); expect(publicData.offerReady).toBe(true);
    expect(Object.keys(publicData).sort()).toEqual(['avatarUrl', 'bio', 'displayName', 'offerReadiness', 'offerReady', 'prices', 'publicWorkUrl', 'slots', 'slug', 'stackTags']);
    const otherLogin = `prices-other-${process.pid}`;
    const other = await acceptInvitationAs(base, otherLogin, cookieHeader(await signInAs(session, base, otherLogin)));
    const own = await send({ ...other, ...CSRF_HEADERS }, { price25: '100', price50: '200', mentorProfileId: slug });
    expect(own.status).toBe(200);
    expect((await (await fetch(`${base}/api/mentors/${slug}`)).json()).data.prices.price25Cents).toBe(8000);
  } finally { await closeAgentBrowser(session); }
});

it('TC-PRICES-002 edits raw decimals, shows readiness and exposes prices signed out', async () => {
  const base = inject('integrationBaseUrl'); const session = `prices-ui-${process.pid}`; const visitor = `${session}-visitor`;
  try {
    const login = `prices-ui-owner-${process.pid}`; await signInAs(session, base, login);
    await runAgentBrowser(session, 'open', await seedPendingInvitation(`${login}@devmentor.test`));
    await runAgentBrowser(session, 'wait', '--text', 'Your mentor invitation');
    await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Accept invitation');
    await runAgentBrowser(session, 'wait', '--text', 'Get ready for your first session');
    const { slug } = await seedOfferReadyMentor(base, cookieHeader((await sessionCookie(session))!));
    await runAgentBrowser(session, 'open', `${base}/mentor`);
    await runAgentBrowser(session, 'wait', '--text', 'Save prices');
    const tree = await runAgentBrowser(session, 'snapshot'); expect(tree).toContain('25-minute price'); expect(tree).toContain('50-minute price'); expect(tree).toContain('25 min: PLN 80–600'); expect(tree).toContain('50 min: PLN 160–1,200');
    await runAgentBrowser(session, 'find', 'label', '25-minute price', 'fill', '80.001');
    await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Save prices');
    await runAgentBrowser(session, 'wait', '--text', 'Enter an amount with at most two decimal places.');
    await runAgentBrowser(session, 'find', 'label', '25-minute price', 'fill', '80.00');
    await runAgentBrowser(session, 'find', 'label', '50-minute price', 'fill', '160.00');
    await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Save prices');
    await runAgentBrowser(session, 'wait', '--text', 'Both session prices were saved.');
    await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'mentor-prices.png'), '--full'); await expectFitsMobile(session, 'mentor-prices');
    await runAgentBrowser(session, 'wait', '--text', 'Your profile is ready to share'); expect(await runAgentBrowser(session, 'snapshot')).toContain('heading "Your mentor workspace"');
    await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'mentor-ready.png'), '--full');
    await runAgentBrowser(visitor, 'open', `${base}/m/${slug}`); await runAgentBrowser(visitor, 'wait', '--text', '25 min: PLN 80.00');
    await runAgentBrowser(visitor, 'wait', '--text', '50 min: PLN 160.00');
    const publicTree = await runAgentBrowser(visitor, 'snapshot'); expect(publicTree).toContain('50 min: '); expect(publicTree).not.toMatch(/button.*(book|pay)|rating|score|ranking|review/i);
    await runAgentBrowser(visitor, 'screenshot', resolve(integrationArtifactsDirectory, 'public-priced-offer.png'), '--full'); await expectFitsMobile(visitor, 'public-priced-offer');
  } catch (error) { await captureBrowserFailure(session, 'prices'); throw error; }
  finally { await closeAgentBrowser(session); await closeAgentBrowser(visitor); }
});
