import type { MentorDirectoryItem } from '@mentio/ui/components/mentors/MentorDirectory';
import type { MentorProfileProps } from '@mentio/ui/components/mentors/MentorProfile';

// Fictional mentors shaped by the E01 DTOs (MentorListItemDto, MentorPagePublicDto). Values are
// pre-formatted as the app's F7 helpers would, in English story copy; prices in zł.
export const directoryItems: MentorDirectoryItem[] = [
  { href: '#/mentorzy/alex', displayName: 'Alex', excerpt: 'Kubernetes, ingress and cluster upgrades. I help when a deploy fails and the logs do not say why — paste the error and the manifest you changed.', priceLabel: '25 min — 120 zł', availabilityLabel: 'Next slot: Thursday, 6 November, 18:00' },
  { href: '#/mentorzy/marta', displayName: 'Marta', excerpt: 'PostgreSQL locking, slow queries and migrations that block production. Bring the query plan.', priceLabel: '25 min — 150 zł', availabilityLabel: 'Next slot: Friday, 7 November, 09:30' },
  { href: '#/mentorzy/piotr', displayName: 'Piotr', excerpt: 'React performance and accessibility reviews for component libraries.', priceLabel: '25 min — 90 zł', availabilityLabel: 'No slots to book' },
  { href: '#/mentorzy/ola', displayName: 'Ola', excerpt: 'Python packaging and CI pipelines; I speak at local meetups about testing.', priceLabel: 'No rate yet', availabilityLabel: 'No slots to book' },
];

export const longDirectoryItem: MentorDirectoryItem = {
  href: '#/mentorzy/aleksandra-wisniewska-kowalczyk', displayName: 'Aleksandra Wiśniewska-Kowalczyk',
  excerpt: 'Distributed systems on Kubernetes, ingress controllers, service meshes, observability pipelines, incident reviews and the long tail of configuration problems that appear only after an upgrade — I read your manifests and logs before the session so the 25 minutes go to the fix.',
  priceLabel: '25 min — 600 zł', availabilityLabel: 'Next slot: Wednesday, 19 November, 07:15',
};

export const profile: MentorProfileProps = {
  displayName: 'Alex',
  description: 'I help developers when a Kubernetes deploy fails and the logs do not say why.\n\nPaste the error, the manifest you changed and what you already checked. I read it before the session starts.',
  work: { heading: 'Public work', links: ['https://example.test/alex/ingress-upgrade-notes', 'https://example.test/alex/kubecon-talk-ingress'], newTabLabel: 'opens in a new tab' },
  prices: { heading: 'Prices', items: ['25 min — 120 zł', '50 min — 240 zł'], unavailableText: 'The mentor has not set a rate yet — booking is unavailable' },
  slots: {
    heading: 'Available slots',
    days: [
      { label: 'Thursday, 6 November', slots: [{ id: 's1', label: '18:00' }, { id: 's2', label: '19:30' }] },
      { label: 'Friday, 7 November', slots: [{ id: 's3', label: '09:30' }] },
    ],
    emptyText: 'No available slots right now.',
  },
  textOnlyNote: 'Sessions take place in text only.',
};
