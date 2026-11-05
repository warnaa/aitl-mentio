// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { apiCall } from '@devmentor/ui/backend';
import { navigation } from '../../../../lib/navigation';
import { draftSchema, MentorProfileWorkspace } from './MentorProfileWorkspace';
vi.mock('../../../../../../ui/src/backend/api/apiCall', () => ({ apiCall: vi.fn() }));
vi.mock('../../../../lib/navigation', () => ({ navigation: { assign: vi.fn() } }));

const draft = {
  id: 'p1',
  slug: null as string | null,
  displayName: 'Ada',
  avatarUrl: null,
  publicWorkUrl: null as string | null,
  bio: null as string | null,
  stackTags: ['react'],
  publishedAt: null as string | null,
  readiness: {
    ready: false,
    items: [
      { key: 'publicWorkUrl', label: 'Add a link to your public work.', met: false },
      { key: 'stackTags', label: 'Choose at least one technology.', met: true },
    ],
  },
};
const published = { ...draft, slug: 'ada', publishedAt: '2026-11-05T10:00:00Z', publicWorkUrl: 'https://github.com/ada', bio: 'Builds systems' };
const options = [
  { value: 'react', label: 'React' },
  { value: 'python', label: 'Python' },
];
let profile: typeof draft = draft;
let transition: Awaited<ReturnType<typeof apiCall>> = { ok: true, data: {} };
const api = vi.mocked(apiCall);
const show = () => render(<MentorProfileWorkspace appUrl="https://mentor.test" options={options} />);

beforeEach(() => {
  profile = draft;
  transition = { ok: true, data: {} };
  api.mockReset();
  api.mockImplementation(async (path, init) => {
    if (path === '/api/mentors/me') return { ok: true, data: init?.method === 'PUT' ? init.body : profile };
    return transition;
  });
  vi.mocked(navigation.assign).mockReset();
});
afterEach(cleanup);

it('composes the s27 heading, editor and draft aside with the unmet readiness items', async () => {
  show();
  expect(await screen.findByRole('heading', { level: 1, name: 'Show mentees how you can help' })).toBeTruthy();
  expect(screen.getByText('Draft')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Publish when you are ready' })).toBeTruthy();
  const checklist = screen.getByRole('list', { name: 'Before you publish' });
  expect(within(checklist).getByText(/Required: Add a link to your public work\./)).toBeTruthy();
  expect(within(checklist).getByText(/Complete: Choose at least one technology\./)).toBeTruthy();
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'React' }).checked).toBe(true);
  expect(screen.queryByRole('textbox', { name: 'Display name' })).toBeNull();
  expect(screen.getByText('Session prices and availability are managed from your mentor workspace.')).toBeTruthy();
});

it('saves a partial draft, leaving empty fields out, and blocks publishing while edits are unsaved', async () => {
  show();
  fireEvent.change(await screen.findByRole('textbox', { name: 'About your mentoring' }), { target: { value: 'I build reliable systems' } });
  expect(screen.getByText('Save your changes before publishing or previewing the saved page.')).toBeTruthy();
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Publish profile' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await screen.findByText('Profile saved. Publish it when you are ready.');
  expect(api).toHaveBeenCalledWith('/api/mentors/me', expect.objectContaining({ method: 'PUT', body: { bio: 'I build reliable systems', stackTags: ['react'] } }));
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Publish profile' }).disabled).toBe(false);
});

it('names a refused publish on its field and recovers from an unexpected failure', async () => {
  transition = { ok: false, error: { code: 'validation_failed', message: 'Complete the required profile fields before publishing.', fieldErrors: { publicWorkUrl: ['Add a link to your public work.'] } } };
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Publish profile' }));
  await screen.findByText('Complete the required profile fields before publishing.');
  const url = screen.getByRole('textbox', { name: 'Public work link' });
  expect(document.getElementById(url.getAttribute('aria-describedby')!.split(' ').find((id) => id.endsWith('errors'))!)?.textContent).toContain('Add a link to your public work.');
  api.mockImplementation(async (path) => {
    if (path === '/api/mentors/me') return { ok: true, data: profile };
    throw new Error('offline');
  });
  fireEvent.click(screen.getByRole('button', { name: 'Publish profile' }));
  await screen.findByText('We could not save this change. Please try again.');
});

it('publishes, then reloads into the share state with the draft preview closed', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Preview public page' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Publish profile' }));
  profile = published;
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/mentors/me/publish', { method: 'POST' }));
  expect(await screen.findByRole('heading', { name: 'Share your profile' })).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Preview of your public page' })).toBeNull();
});

it('previews a draft inline with the stack labels, keeping unknown stored tags', async () => {
  profile = { ...draft, stackTags: ['react', 'legacy'] };
  show();
  const toggle = await screen.findByRole('button', { name: 'Preview public page' });
  fireEvent.click(toggle);
  const preview = screen.getByRole('region', { name: 'Preview of your public page' });
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(within(preview).getByRole('heading', { level: 1, name: 'Ada' })).toBeTruthy();
  expect(within(preview).getByText('React / legacy', { selector: '.dm-mentor-profile-role' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Hide preview' }));
  expect(screen.queryByRole('region', { name: 'Preview of your public page' })).toBeNull();
});

it('shares a published page, copies its link, reports a failed copy and unpublishes', async () => {
  profile = published;
  const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  show();
  expect(await screen.findByText('Published')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Preview public page' }).getAttribute('href')).toBe('/m/ada');
  const link = screen.getByRole<HTMLInputElement>('textbox', { name: 'Share link' });
  expect(link.value).toBe('https://mentor.test/m/ada');
  fireEvent.focus(link);
  expect(link.selectionStart).toBe(0);
  expect(screen.getByText('Your share link stays the same if you change your name or unpublish and republish.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Copy profile link' }));
  await screen.findByText('Link copied.');
  fireEvent.click(screen.getByRole('button', { name: 'Copy profile link' }));
  await screen.findByText('The link could not be copied. Select the link above and copy it manually.');
  fireEvent.change(screen.getByRole('textbox', { name: 'About your mentoring' }), { target: { value: 'Updated' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await screen.findByText('Profile saved. Your public page is updated.');
  transition = { ok: false, error: { code: 'unavailable', message: 'Try again in a minute.' } };
  fireEvent.click(screen.getByRole('button', { name: 'Unpublish page' }));
  await screen.findByText('Try again in a minute.');
  expect(api).toHaveBeenCalledWith('/api/mentors/me/unpublish', { method: 'POST' });
});

it('returns to the mentor workspace on cancel', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
  expect(navigation.assign).toHaveBeenCalledWith('/mentor');
});

it('validates filled draft fields with the designed messages and passes the API schema', () => {
  expect(draftSchema.safeParse({ publicWorkUrl: ' ', bio: '', stackTags: [] }).data).toEqual({ stackTags: [] });
  expect(draftSchema.safeParse({ publicWorkUrl: 'ftp://x.test', bio: '', stackTags: [] }).error?.issues[0]?.message).toBe(
    'Add a full public link starting with https:// or http://.',
  );
  expect(draftSchema.safeParse({ publicWorkUrl: '', bio: 'A'.repeat(2001), stackTags: [] }).error?.issues[0]?.message).toBe(
    'Keep your description within 2,000 characters.',
  );
  expect(draftSchema.safeParse({ publicWorkUrl: '', bio: '', stackTags: ['cobol'] }).success).toBe(false);
});
