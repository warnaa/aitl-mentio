// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiCall } from '@devmentor/ui/backend';
import { MentorProfileEditor } from './MentorProfileEditor';
vi.mock('@devmentor/ui/backend', async (original) => {
  const actual = await original<typeof import('@devmentor/ui/backend')>();
  return { ...actual };
});
vi.mock('../../../../../../ui/src/backend/api/apiCall', () => ({ apiCall: vi.fn() }));
const profile = {
  id: 'p1',
  slug: null,
  displayName: 'Ada',
  avatarUrl: null,
  publicWorkUrl: null,
  bio: null,
  stackTags: [],
  publishedAt: null,
  readiness: { ready: false, items: [{ key: 'publicWorkUrl', label: 'Public work', met: false }] },
};
const options = [{ value: 'react', label: 'React' }];
afterEach(cleanup);
beforeEach(() => {
  vi.mocked(apiCall).mockReset();
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: profile });
});
it('saves incomplete drafts and offers publication only after the save request settles', async () => {
  render(<MentorProfileEditor appUrl="https://mentor.test" options={options} />);
  await screen.findByRole('heading', { name: 'Your mentor profile' });
  fireEvent.change(screen.getByLabelText('About your experience'), {
    target: { value: 'I build reliable systems' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await waitFor(() =>
    expect(apiCall).toHaveBeenCalledWith(
      '/api/mentors/me',
      expect.objectContaining({
        method: 'PUT',
        body: { publicWorkUrl: undefined, bio: 'I build reliable systems', stackTags: [] },
      }),
    ),
  );
  await screen.findByRole('button', { name: 'Publish page' });
  fireEvent.click(screen.getByRole('button', { name: 'Publish page' }));
  await waitFor(() => expect(apiCall).toHaveBeenCalledWith('/api/mentors/me/publish', { method: 'POST' }));
});
it('names refused readiness fields and retains inputs; handles unexpected transition failures', async () => {
  vi.mocked(apiCall).mockImplementation(async (path) =>
    path === '/api/mentors/me'
      ? { ok: true, data: profile }
      : {
          ok: false,
          error: {
            code: 'validation_failed',
            message: 'Complete your page',
            fieldErrors: { publicWorkUrl: ['Add public work'] },
          },
        },
  );
  render(<MentorProfileEditor appUrl="https://mentor.test" options={options} />);
  await screen.findByRole('button', { name: 'Publish page' });
  fireEvent.click(screen.getByRole('button', { name: 'Publish page' }));
  await screen.findByText('Add public work');
  expect(screen.getByText('Complete your page')).toBeTruthy();
  vi.mocked(apiCall).mockRejectedValueOnce(new Error('down'));
  fireEvent.click(screen.getByRole('button', { name: 'Publish page' }));
  await screen.findByText('We could not save this change. Please try again.');
  vi.mocked(apiCall).mockResolvedValueOnce({ ok: false, error: { code: 'down', message: 'Retry later' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish page' }));
  await screen.findByText('Retry later');
});
it('copies a stable share link, explains clipboard failure and unpublishes', async () => {
  vi.mocked(apiCall).mockResolvedValue({
    ok: true,
    data: {
      ...profile,
      slug: 'ada',
      publishedAt: '2026-11-04T12:00:00Z',
      bio: 'Hello',
      publicWorkUrl: 'https://github.com/ada',
    },
  });
  const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<MentorProfileEditor appUrl="https://mentor.test" options={options} />);
  await screen.findByRole('button', { name: 'Copy share link' });
  fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));
  await screen.findByText('Share link copied.');
  expect(writeText).toHaveBeenCalledWith('https://mentor.test/m/ada');
  fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));
  await screen.findByText('Could not copy the link. Select and copy the link above.');
  fireEvent.click(screen.getByRole('button', { name: 'Unpublish page' }));
  await waitFor(() => expect(apiCall).toHaveBeenCalledWith('/api/mentors/me/unpublish', { method: 'POST' }));
});
it('previews stack tags by their labels, keeping an unknown tag readable', async () => {
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { ...profile, stackTags: ['react', 'cobol'] } });
  render(<MentorProfileEditor appUrl="https://mentor.test" options={options} />);
  const preview = await screen.findByRole('region', { name: 'Profile preview' });
  const chips = preview.querySelectorAll('li');
  expect([...chips].map((chip) => chip.textContent)).toEqual(['React', 'cobol']);
});
