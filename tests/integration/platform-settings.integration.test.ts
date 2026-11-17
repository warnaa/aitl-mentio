import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { Booking, MentorProfile, PlatformSettings, User } from '@devmentor/db';
import { captureBrowserFailure, closeAgentBrowser, expectFitsMobile, integrationArtifactsDirectory, runAgentBrowser, signInAs } from './agent-browser';
import { bookingPersona, postBooking, withBookingFixture } from './fixtures/booking';

const ENV_BOUNDS = { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } };
const form = (patch: Record<string, unknown> = {}) => ({ price25Min: '80.00', price25Max: '600.00', price50Min: '160.00', price50Max: '1200.00', feePercent: 20, version: 0, ...patch });

it('SETTINGS-001 the operator sets bounds and fee; out-of-bounds prices are flagged, not changed, and later saves are held to them', async () => {
  await withBookingFixture('settings', async fixture => {
    const endpoint = `${fixture.base}/api/operator/settings`;
    const browser = `settings-ui-${process.pid}`;
    // The row is global to the suite's app: start from (and always return to) "never saved".
    await fixture.em.nativeDelete(PlatformSettings, {});
    // A mentor with no price yet must never be flagged (SQL NULL comparisons), only priced ones.
    const unpricedEmail = `settings-unpriced-${process.pid}@devmentor.test`;
    const unpricedUser = fixture.em.create(User, { email: unpricedEmail, displayName: 'Unpriced settings mentor', roles: ['mentor'] });
    const unpriced = fixture.em.create(MentorProfile, { user: unpricedUser, headline: 'Unpriced', slug: `settings-unpriced-${process.pid}` });
    await fixture.em.flush();
    try {
      const put = (headers: Record<string, string>, body: unknown) => fetch(endpoint, { method: 'PUT', headers, body: JSON.stringify(body) });
      expect((await fetch(endpoint)).status).toBe(401);
      expect((await fetch(endpoint, { headers: fixture.first })).status).toBe(403);
      expect((await put(fixture.mentor, form({ feePercent: 30 }))).status).toBe(403);

      const operator = await bookingPersona(fixture.base, 'mock-operator');
      const read = async () => {
        const response = await fetch(endpoint, { headers: operator });
        expect(response.status).toBe(200);
        return (await response.json()).data;
      };
      // Nothing saved: exactly the env bounds and the 20 % default, so the deploy changes nothing.
      expect((await read()).settings).toEqual({ currency: 'PLN', priceBounds: ENV_BOUNDS, feePercent: 20, version: 0, updatedAt: null, updatedBy: null });

      // Refused saves change nothing.
      for (const [body, field] of [[form({ feePercent: 101 }), 'feePercent'], [form({ price25Min: '700' }), 'price25Max'], [form({ price50Max: '0' }), 'price50Max']] as const) {
        const refused = await put(operator, body);
        expect(refused.status).toBe(422);
        expect((await refused.json()).error.fieldErrors).toHaveProperty(field);
      }
      expect((await put({ ...operator, 'x-devmentor-request': '' }, form())).status).toBe(403);
      expect(await fixture.em.count(PlatformSettings, {})).toBe(0);

      // Two founders save the first row at once: one wins, the other is told to reload — never a 500.
      const tighter = form({ price25Min: '100.00', feePercent: 15 });
      const raced = await Promise.all([put(operator, tighter), put(operator, form({ price50Max: '1000.00' }))]);
      expect(raced.map(response => response.status).sort()).toEqual([200, 409]);
      if (raced[0]!.status !== 200) expect((await put(operator, { ...tighter, version: 1 })).status).toBe(200);

      const saved = await read();
      expect(saved.settings).toMatchObject({ priceBounds: { p25: { minCents: 10000, maxCents: 60000 } }, feePercent: 15, updatedBy: { displayName: expect.any(String) } });
      // The fixture mentor's 80.00 is now below the minimum: listed, unchanged, not bookable.
      expect(saved.outOfBounds.mentors.map((mentor: { mentorProfileId: string }) => mentor.mentorProfileId)).not.toContain(unpriced.id);
      expect(saved.outOfBounds.total).toBe(saved.outOfBounds.mentors.length);
      expect(saved.outOfBounds.mentors).toContainEqual(expect.objectContaining({ mentorProfileId: fixture.profileId, price25Cents: 8000, price50Cents: 16000, breaches: ['price25'] }));
      expect((await fixture.em.findOneOrFail(MentorProfile, { id: fixture.profileId }, { refresh: true })).price25Cents).toBe(8000);
      const page = (await (await fetch(`${fixture.base}/api/mentors/${fixture.slug}`)).json()).data;
      expect(page.prices).toBeNull();
      expect(page.offerReady).toBe(false);
      expect((await postBooking(fixture)).status).toBeGreaterThanOrEqual(400);
      expect(await fixture.em.count(Booking, { mentorProfile: fixture.profileId })).toBe(0);

      // The mentor is held to the new bounds on their next save.
      const savePrices = (price25: string) => fetch(`${fixture.base}/api/mentors/me/prices`, { method: 'PUT', headers: fixture.mentor, body: JSON.stringify({ price25, price50: '160' }) });
      const below = await savePrices('90.00');
      expect(below.status).toBe(422);
      expect((await below.json()).error.fieldErrors.price25).toEqual(['Enter PLN 100.00–600.00.']);
      expect((await savePrices('100.00')).status).toBe(200);
      expect((await read()).outOfBounds.mentors.map((mentor: { mentorProfileId: string }) => mentor.mentorProfileId)).not.toContain(fixture.profileId);

      // A form loaded before the last save is refused instead of overwriting it.
      const stale = await put(operator, form({ version: saved.settings.version - 1 }));
      expect(stale.status).toBe(409);
      expect((await read()).settings).toMatchObject({ feePercent: 15, version: saved.settings.version });

      // The operator screen renders the saved values and the empty flagged list.
      await signInAs(browser, fixture.base, 'mock-operator');
      await runAgentBrowser(browser, 'open', `${fixture.base}/admin/settings`);
      await runAgentBrowser(browser, 'wait', '--text', 'Prices outside the bounds');
      const tree = await runAgentBrowser(browser, 'snapshot');
      for (const text of ['heading "Platform settings"', '25-minute minimum (PLN)', 'Platform fee (%)', 'Save settings', 'link "Settings"']) expect(tree).toContain(text);
      await runAgentBrowser(browser, 'screenshot', resolve(integrationArtifactsDirectory, 'operator-settings.png'), '--full');
      await expectFitsMobile(browser, 'operator-settings');
    } catch (error) {
      await captureBrowserFailure(browser, 'platform-settings');
      throw error;
    } finally {
      await closeAgentBrowser(browser);
      await fixture.em.nativeDelete(PlatformSettings, {});
      await fixture.em.nativeDelete(MentorProfile, { id: unpriced.id });
      await fixture.em.nativeDelete(User, { email: unpricedEmail });
    }
  });
});
