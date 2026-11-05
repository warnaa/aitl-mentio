import { defineReadiness } from '../../domain/readiness';

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
