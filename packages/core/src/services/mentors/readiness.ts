import { defineReadiness } from '../../domain/readiness';
import { withinBounds } from '../../money/money';
import type { PricePolicy } from '../operator/platform-settings.service';

export interface PublishableProfile {
  publicWorkUrl?: string | null;
  bio?: string | null;
  stackTags: readonly string[];
}
export const mentorPagePublishable = defineReadiness<PublishableProfile>([
  { key: 'publicWorkUrl', label: 'Add a link to your public work.', test: (p) => !!p.publicWorkUrl },
  { key: 'bio', label: 'Describe your experience.', test: (p) => !!p.bio?.trim() },
  { key: 'stackTags', label: 'Choose at least one stack tag.', test: (p) => p.stackTags.length > 0 },
]);

export interface MentorOffer extends PublishableProfile {
  publishedAt?: Date | null;
  price25Cents?: number | null;
  price50Cents?: number | null;
  hasFutureSlots: boolean;
  settings: PricePolicy;
}
export const mentorOfferReady = defineReadiness<MentorOffer>([
  { key: 'profile', label: 'Complete your mentor profile.', test: p => mentorPagePublishable.evaluate(p).ready },
  { key: 'published', label: 'Publish your mentor page.', test: p => !!p.publishedAt },
  { key: 'price25', label: 'Set a valid 25-minute price.', test: p => p.price25Cents != null && withinBounds(p.price25Cents, p.settings.priceBounds.p25) },
  { key: 'price50', label: 'Set a valid 50-minute price.', test: p => p.price50Cents != null && withinBounds(p.price50Cents, p.settings.priceBounds.p50) },
  { key: 'availability', label: 'Publish at least one future time.', test: p => p.hasFutureSlots },
]);
