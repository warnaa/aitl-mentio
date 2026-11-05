import { expect, it } from 'vitest';
import { mentorOfferReady, mentorPagePublishable } from './readiness';
const settings = { currency: 'PLN' as const, priceBounds: { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } } };
it('requires a complete published page, both currently bounded prices and future availability', () => {
  const offer = { publicWorkUrl: 'https://example.test', bio: 'Work', stackTags: ['react'], publishedAt: new Date(), price25Cents: 8000, price50Cents: 16000, hasFutureSlots: true, settings };
  expect(mentorOfferReady.evaluate(offer).ready).toBe(true);
  expect(mentorPagePublishable.evaluate({ publicWorkUrl: offer.publicWorkUrl, bio: offer.bio }).ready).toBe(true);
  for (const patch of [{ publicWorkUrl: null }, { bio: ' ' }, { publishedAt: null }, { price25Cents: null }, { price50Cents: null }, { price25Cents: 7999 }, { price50Cents: 120001 }, { hasFutureSlots: false }, { settings: { ...settings, priceBounds: { ...settings.priceBounds, p25: { minCents: 9000, maxCents: 60000 } } } }]) expect(mentorOfferReady.evaluate({ ...offer, ...patch }).ready).toBe(false);
});
