// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MentorPageView } from './MentorPageView';
afterEach(cleanup);
it('renders only public work and description with technologies, never private or score fields', () => {
  const profile = {
    slug: 'ada',
    displayName: 'Ada',
    avatarUrl: null,
    publicWorkUrl: 'https://github.com/ada',
    bio: 'Builds reliable systems',
    stackTags: ['TypeScript'],
  };
  const { rerender } = render(<MentorPageView profile={profile} />);
  expect(screen.getByRole('heading', { name: 'Ada' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'See public work' }).getAttribute('href')).toBe(
    profile.publicWorkUrl,
  );
  expect(screen.getByText(profile.bio)).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/rating|score|review|ranking/i);
  rerender(<MentorPageView profile={{ ...profile, publicWorkUrl: null }} />);
  expect(screen.queryByRole('link')).toBeNull();
});

it('shows public start instants with both lead-time states and empty availability', () => {
  const profile = { slug: 'ada', displayName: 'Ada', avatarUrl: null, publicWorkUrl: null, bio: 'Work', stackTags: [], slots: [{ id: 'a', startsAt: '2099-11-05T14:30:00Z', meetsLeadTime: true }, { id: 'b', startsAt: '2099-11-05T13:00:00Z', meetsLeadTime: false }] };
  const { rerender } = render(<MentorPageView profile={profile} />);
  expect(screen.getByText('Meets the two-hour notice period.')).toBeTruthy();
  expect(screen.getByText('Unavailable: less than two hours before the start.')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  rerender(<MentorPageView profile={{ ...profile, slots: [] }} />);
  expect(screen.getByText('No published times yet. Check back later.')).toBeTruthy();
});

it('shows both integer-minor-unit prices and the offer state without booking actions', () => {
  const profile = { slug: 'ada', displayName: 'Ada', avatarUrl: null, publicWorkUrl: null, bio: 'Work', stackTags: [], prices: { price25Cents: 8000, price50Cents: 16000, currency: 'PLN' }, offerReady: true, offerReadiness: { ready: true, items: [{ key: 'price25', label: 'Set a valid 25-minute price.', met: true }] } };
  const { rerender } = render(<MentorPageView profile={profile} />);
  expect(screen.getByText('25 min: PLN 80.00')).toBeTruthy(); expect(screen.getByText('50 min: PLN 160.00')).toBeTruthy();
  expect(screen.getByText('This mentor has published their profile, prices and availability.')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  rerender(<MentorPageView profile={{ ...profile, prices: null, offerReady: false, offerReadiness: { ready: false, items: [{ key: 'price25', label: 'Set a valid 25-minute price.', met: false }] } }} />);
  expect(screen.getByText('Not bookable yet')).toBeTruthy();
  // Visitors never see the mentor's setup to-do list.
  expect(screen.queryByText('Set a valid 25-minute price.')).toBeNull();
});


it('uses the owner readiness gate and leaves unprovided availability out of the profile preview', () => {
  render(<MentorPageView profile={{ slug: 'ada', displayName: 'Ada', avatarUrl: null, publicWorkUrl: null, bio: 'Work', stackTags: [], offerReady: false, offerReadiness: { ready: true, items: [{ key: 'availability', label: 'Publish at least one future time.', met: true }] } }} />);
  expect(screen.queryByText(/Not bookable yet/)).toBeNull();
  expect(screen.queryByText(/No published times yet/)).toBeNull();
  expect(screen.queryByRole('region', { name: 'Published times' })).toBeNull();
  expect(screen.getByText('This mentor has published their profile, prices and availability.')).toBeTruthy();
});
