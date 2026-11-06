// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { formatPrice, MentorPageView, type MentorPageData } from './MentorPageView';
afterEach(cleanup);

const base: MentorPageData = { slug: 'ada', displayName: 'Ada Lovelace', avatarUrl: null, publicWorkUrl: null, bio: 'Work', stackTags: [] };
const prices = { price25Cents: 8000, price50Cents: 16050, currency: 'PLN' };
const readiness = (ready: boolean) => ({ ready, items: [{ key: 'price25', label: 'Set a valid 25-minute price.', met: ready }] });

it('composes the s1 header, public work and about sections, never private or score fields', () => {
  const profile = { ...base, publicWorkUrl: 'https://github.com/ada', bio: 'Builds reliable systems.\n\nAlso mentors teams.', stackTags: ['TypeScript', 'React'] };
  const { rerender } = render(<MentorPageView profile={profile} />);
  expect(screen.getByRole('heading', { level: 1, name: 'Ada Lovelace' })).toBeTruthy();
  expect(screen.getByText('AL').getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByText('TypeScript / React')).toBeTruthy();
  expect(screen.getByText('Builds reliable systems.', { selector: '.dm-mentor-profile-intro' })).toBeTruthy();
  const work = screen.getByRole('region', { name: 'Public work' });
  expect(within(work).getByRole('link', { name: 'View public work' }).getAttribute('href')).toBe(profile.publicWorkUrl);
  expect(within(screen.getByRole('region', { name: 'About me' })).getByText(/Also mentors teams\./)).toBeTruthy();
  expect(screen.getByRole('list', { name: 'Included with your session' }).children).toHaveLength(3);
  expect(document.body.textContent).not.toMatch(/rating|score|review|ranking/i);
  rerender(<MentorPageView profile={{ ...base, bio: null }} />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.queryByRole('region', { name: 'About me' })).toBeNull();
  expect(document.querySelector('.dm-mentor-profile-intro')).toBeNull();
  expect(document.querySelector('.dm-mentor-profile-role')).toBeNull();
});

it('lists every published time with its notice state and the empty state', () => {
  const profile = { ...base, slots: [{ id: 'a', startsAt: '2099-11-05T14:30:00Z', meetsLeadTime: true }, { id: 'b', startsAt: '2099-11-05T13:00:00Z', meetsLeadTime: false }] };
  const { rerender } = render(<MentorPageView profile={profile} />);
  const times = screen.getByRole('region', { name: 'Available times' });
  expect(within(times).getByText('Meets the two-hour notice period.')).toBeTruthy();
  expect(within(times).getByText('Unavailable: less than two hours before the start.').closest('li')!.dataset.eligible).toBe('false');
  expect(screen.queryByRole('button')).toBeNull();
  rerender(<MentorPageView profile={{ ...profile, slots: [] }} />);
  expect(screen.getByText('No published times yet. Check back later.')).toBeTruthy();
});

it('shows both prices and the published days when ready, without booking actions', () => {
  const profile = { ...base, prices, offerReady: true, offerReadiness: readiness(true), slots: [{ id: 'a', startsAt: '2099-11-05T14:30:00Z', meetsLeadTime: true }, { id: 'b', startsAt: '2099-11-04T14:30:00Z', meetsLeadTime: false }] };
  render(<MentorPageView profile={profile} />);
  const sessions = screen.getByRole('complementary', { name: 'Session prices' });
  expect(within(sessions).getByText('PLN 80')).toBeTruthy();
  expect(within(sessions).getByText('PLN 160.50')).toBeTruthy();
  // Only times that can still be chosen count as published availability.
  expect(within(screen.getByRole('group', { name: 'Days with published sessions' })).getAllByText(/day$/)).toHaveLength(1);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByText('Not bookable yet')).toBeNull();
});

it('shows the s2 empty state when no published time meets the notice period', () => {
  render(<MentorPageView profile={{ ...base, prices, offerReady: true, slots: [{ id: 'b', startsAt: '2099-11-04T14:30:00Z', meetsLeadTime: false }] }} />);
  expect(screen.getByText('No times available right now')).toBeTruthy();
  expect(screen.queryByRole('group', { name: 'Days with published sessions' })).toBeNull();
});

it('does not advertise occupied days and preserves durations that remain viable', () => {
  const { rerender } = render(<MentorPageView profile={{ ...base, prices, offerReady: true, slots: [{ id: 'taken', startsAt: '2099-11-04T14:30:00Z', meetsLeadTime: true, viableLengths: [] }] }} />);
  expect(screen.queryByRole('group', { name: 'Days with published sessions' })).toBeNull();
  expect(screen.getByText('No times available right now')).toBeTruthy();
  expect(screen.getByText('Unavailable: overlaps a reserved session.').closest('li')!.dataset.eligible).toBe('false');
  rerender(<MentorPageView profile={{ ...base, offerReady: true, slots: [{ id: 'free', startsAt: '2099-11-04T14:30:00Z', meetsLeadTime: true, viableLengths: [25] }] }} />);
  expect(screen.getByRole('group', { name: 'Days with published sessions' })).toBeTruthy();
});

it('shows visitors "Not bookable yet" without the mentor setup checklist', () => {
  render(<MentorPageView profile={{ ...base, prices: null, offerReady: false, offerReadiness: readiness(false) }} />);
  expect(screen.getByText('Not bookable yet')).toBeTruthy();
  expect(screen.queryByText('25 minutes')).toBeNull();
  expect(screen.queryByText('Set a valid 25-minute price.')).toBeNull();
});

it('uses the owner readiness gate and leaves unprovided availability out of the preview', () => {
  render(<MentorPageView profile={{ ...base, offerReady: false, offerReadiness: readiness(true) }} />);
  expect(screen.queryByText(/Not bookable yet/)).toBeNull();
  expect(screen.queryByText(/No times available/)).toBeNull();
  expect(screen.queryByRole('region', { name: 'Available times' })).toBeNull();
});

it('formats minor units, dropping decimals only for whole amounts', () => {
  // A non-breaking space keeps the currency with its amount.
  expect(formatPrice(60000, 'PLN')).toBe('PLN 600');
  expect(formatPrice(8005, 'PLN')).toBe('PLN 80.05');
});

it('accepts public booking controls in the existing card while retaining the shared session notice', () => {
  render(<MentorPageView profile={{ ...base, offerReady: true }} booking={<button>Reserve a session</button>} />);
  const card = screen.getByRole('complementary', { name: 'Session prices' });
  expect(within(card).getByRole('button', { name: 'Reserve a session' })).toBeTruthy();
  expect(within(card).getByText('Sessions are text. DevMentor makes no promise about how soon an answer arrives.')).toBeTruthy();
});
