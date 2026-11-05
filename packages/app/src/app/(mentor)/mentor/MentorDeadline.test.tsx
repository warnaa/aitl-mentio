// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useApiResource, type ApiResource } from '@devmentor/ui/backend';
import { MentorDeadline } from './MentorDeadline';

vi.mock('@devmentor/ui/backend', async (original) => ({
  ...(await original<typeof import('@devmentor/ui/backend')>()),
  useApiResource: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function serve(resource: Partial<ApiResource<{ initialPublishDueAt: string | null }>>) {
  const reload = vi.fn();
  vi.mocked(useApiResource).mockReturnValue({ data: null, loading: false, error: null, reload, ...resource });
  return reload;
}

it('reads the durable onboarding status', () => {
  serve({ loading: true });
  render(<MentorDeadline />);
  expect(useApiResource).toHaveBeenCalledWith('/api/mentors/me/onboarding');
  expect(screen.getByRole('status').textContent).toContain('Loading your publication deadline');
});

it('asks for a bookable session by the first deadline, in the viewer time zone', () => {
  serve({ data: { initialPublishDueAt: '2026-11-18T12:00:00Z' } });
  render(<MentorDeadline />);
  expect(screen.getByText(/Publish at least one bookable session by/)).toBeTruthy();
  expect(document.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-18T12:00:00Z');
});

it('handles a mentor who was never invited, such as a seeded account', () => {
  serve({ data: { initialPublishDueAt: null } });
  render(<MentorDeadline />);
  expect(screen.getByText('Your mentor invitation has no publication deadline.')).toBeTruthy();
});

it('reports a failed read and retries on request', () => {
  const reload = serve({ error: 'Unavailable' });
  render(<MentorDeadline />);
  expect(screen.getByRole('alert').textContent).toContain('Unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reload).toHaveBeenCalledOnce();
});
