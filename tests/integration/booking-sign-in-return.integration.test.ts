import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { Booking } from '@devmentor/db';
import { captureBrowserFailure, closeAgentBrowser, currentUrl, expectFitsMobile, integrationArtifactsDirectory, runAgentBrowser } from './agent-browser';
import { withBookingFixture } from './fixtures/booking';

/** Resolve only fresh semantic snapshot references; dates and whitespace are browser-local. */
async function clickObservedRadio(session: string, predicate: (line: string) => boolean) {
  const snapshot = await runAgentBrowser(session, 'snapshot');
  const line = snapshot.split('\n').find(value => value.includes('radio "') && predicate(value));
  const ref = line?.match(/ref=(e\d+)/)?.[1];
  if (!ref) throw new Error(`No selectable radio matched the observed booking snapshot`);
  await runAgentBrowser(session, 'click', `@${ref}`);
}

it('BOOKING-012 restores the signed-out slot and duration then shows an unpaid reservation', async () => {
  const session = `booking-return-${process.pid}`;
  try {
    await withBookingFixture('012', async fixture => {
      const html = await (await fetch(`${fixture.base}/m/${fixture.slug}`)).text();
      expect(html).toContain('Reserve a session');
      expect(html).toContain('Sessions are text. DevMentor makes no promise about how soon an answer arrives.');
      await runAgentBrowser(session, 'open', `${fixture.base}/m/${fixture.slug}`);
      const initial = await runAgentBrowser(session, 'snapshot');
      expect(initial).toContain('Session start'); expect(initial).toContain('Session duration');
      const timing = await runAgentBrowser(session, 'eval', 'JSON.stringify(performance.getEntriesByType("navigation").map(entry => ({responseStart: entry.responseStart, domContentLoadedEventEnd: entry.domContentLoadedEventEnd})))');
      await writeFile(resolve(integrationArtifactsDirectory, 'booking-cold-navigation.json'), timing);
      await clickObservedRadio(session, line => line.includes('2099') && !line.includes('disabled'));
      await clickObservedRadio(session, line => line.includes('radio "50 minutes:'));
      await runAgentBrowser(session, 'find', 'role', 'link', 'click', '--name', 'Sign in to reserve');
      const signIn = await currentUrl(session);
      expect(signIn.pathname).toBe('/sign-in');
      const returnTo = signIn.searchParams.get('returnTo');
      expect(returnTo).toBe(`/m/${fixture.slug}?slot=${fixture.slot.id}&length=50`);
      expect(await runAgentBrowser(session, 'snapshot')).toContain('button "Continue with GitHub"');
      await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'booking-sign-in.png'), '--full');
      // The real observed OAuth start carries a test-adapter identity hint, keeping this case's user isolated.
      const oauth = new URL('/api/auth/github', fixture.base);
      oauth.searchParams.set('returnTo', returnTo!);
      oauth.searchParams.set('login', `booking-012-${process.pid}-first`);
      await runAgentBrowser(session, 'open', oauth.toString());
      const returned = await currentUrl(session);
      expect(returned.pathname).toBe(`/m/${fixture.slug}`);
      expect(returned.searchParams.get('slot')).toBe(fixture.slot.id);
      expect(returned.searchParams.get('length')).toBe('50');
      const restored = await runAgentBrowser(session, 'snapshot');
      expect(restored.split('\n').some(line => line.includes('radio "50 minutes:') && line.includes('checked=true'))).toBe(true);
      expect(restored.split('\n').some(line => line.includes('radio "') && line.includes('2099') && line.includes('checked=true'))).toBe(true);
      expect(await fixture.em.count(Booking, { mentorProfile: fixture.profileId })).toBe(0);
      await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'booking-selection.png'), '--full');
      await expectFitsMobile(session, 'booking-selection');
      await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Reserve this time');
      await runAgentBrowser(session, 'wait', '--text', 'Pending reservation');
      const pending = await runAgentBrowser(session, 'snapshot');
      expect(pending).toContain('This reservation is unpaid and is not confirmed.');
      expect(pending).toContain('50 minutes:'); expect(pending).toContain('Held until:');
      await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'booking-pending.png'), '--full');
      await expectFitsMobile(session, 'booking-pending');
      expect(await fixture.em.count(Booking, { mentorProfile: fixture.profileId, mentee: fixture.firstId, lengthMinutes: 50, status: 'pending' })).toBe(1);
    });
  } catch (error) { await captureBrowserFailure(session, 'booking-return'); throw error; }
  finally { await closeAgentBrowser(session); }
});
