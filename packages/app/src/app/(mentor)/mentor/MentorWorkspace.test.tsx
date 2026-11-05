// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { MentorWorkspaceData } from './MentorWorkspace';
const resources = vi.hoisted(() => ({
  profile: { data: null as unknown, loading: false, error: null as string | null, reload: vi.fn() },
  slots: { data: { items: [], page: 1, pageCount: 1 }, loading: false, error: null as string | null, reload: vi.fn() },
}));
vi.mock('@devmentor/ui/backend', async original => ({
  ...await original<typeof import('@devmentor/ui/backend')>(),
  useApiResource: vi.fn((path: string) => path === '/api/mentors/me' ? resources.profile : resources.slots),
}));
vi.mock('../../../../../ui/src/backend/api/apiCall', () => ({ apiCall: vi.fn(async () => ({ ok: true, data: {} })) }));
import { MentorWorkspace } from './MentorWorkspace';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const KEYS = ['profile', 'published', 'price25', 'price50', 'availability'];
function profile(metKeys: string[], extra: Partial<MentorWorkspaceData> = {}): MentorWorkspaceData {
  return {
    slug: null, publishedAt: null, initialPublishDueAt: '2026-11-19T10:00:00Z', prices: null,
    priceBounds: { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } },
    offerReadiness: { ready: metKeys.length === KEYS.length, items: KEYS.map(key => ({ key, met: metKeys.includes(key) })) },
    ...extra,
  };
}
const steps = () => within(screen.getByRole('list')).getAllByRole('listitem');

it('guides a new mentor through the three setup steps with the publication deadline', () => {
  resources.profile.data = profile(['profile']);
  render(<MentorWorkspace />);
  expect(screen.getByRole('heading', { level: 1, name: 'Get ready for your first session' })).toBeTruthy();
  expect(screen.getByText('Publish by 19 November 2026')).toBeTruthy();
  expect(screen.getByText('0 of 3 steps complete')).toBeTruthy();
  const [profileStep, pricesStep, timeStep] = steps();
  expect(within(profileStep!).getByRole('link', { name: 'Complete profile' }).getAttribute('href')).toBe('/mentor/profile');
  expect(within(pricesStep!).getByRole('link', { name: 'Set prices' }).getAttribute('href')).toBe('#mentor-prices');
  expect(within(timeStep!).getByRole('link', { name: 'Add time' }).getAttribute('href')).toBe('#mentor-time');
  expect(screen.getByRole('heading', { name: 'Your public profile' })).toBeTruthy();
  expect(screen.getByText('Publish your profile before sharing it with mentees.')).toBeTruthy();
  expect(screen.queryByRole('link', { name: /View public profile/ })).toBeNull();
});

it('counts a step only when every server requirement behind it is met', () => {
  resources.profile.data = profile(['profile', 'published', 'price25'], { slug: 'ada', publishedAt: '2026-11-05T10:00:00Z' });
  render(<MentorWorkspace />);
  expect(screen.getByText('1 of 3 steps complete')).toBeTruthy();
  expect(within(steps()[0]!).getByRole('link', { name: 'Edit profile' })).toBeTruthy();
  expect(within(steps()[1]!).queryByText('Complete')).toBeNull();
  expect(screen.getByRole('link', { name: /View public profile/ }).getAttribute('href')).toBe('/m/ada');
});

it('becomes the everyday workspace once the offer is ready, and omits a missing deadline', () => {
  resources.profile.data = profile(KEYS, { slug: 'ada', publishedAt: '2026-11-05T10:00:00Z', initialPublishDueAt: null });
  render(<MentorWorkspace />);
  expect(screen.getByRole('heading', { level: 1, name: 'Your mentor workspace' })).toBeTruthy();
  expect(screen.getByText('3 of 3 steps complete')).toBeTruthy();
  expect(screen.queryByText(/Publish by/)).toBeNull();
  expect(screen.getByRole('heading', { name: 'Your profile is ready to share' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Session prices' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Add an available time' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Your available times' })).toBeTruthy();
});

it('refreshes readiness and the times list after a time is published', async () => {
  resources.profile.data = profile(['profile', 'published', 'price25', 'price50']);
  render(<MentorWorkspace />);
  fireEvent.change(screen.getByLabelText(/Session starts at/), { target: { value: '2099-11-06T14:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish available time' }));
  await waitFor(() => expect(resources.profile.reload).toHaveBeenCalledOnce());
  expect(resources.slots.reload).toHaveBeenCalledOnce();
});

it('keeps a page heading and recovery when the mentor profile cannot be read', () => {
  resources.profile.data = null; resources.profile.error = 'Mentor profile not found';
  render(<MentorWorkspace />);
  expect(screen.getByRole('heading', { level: 1, name: 'Mentor workspace' })).toBeTruthy();
  expect(screen.getByText('Mentor profile not found')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Edit profile' }).getAttribute('href')).toBe('/mentor/profile');
  resources.profile.error = null;
});
