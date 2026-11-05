// @vitest-environment jsdom
import { renderToString } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ data: null as null | { id: string; startsAt: string }[], loading: false, error: null as string | null, reload: vi.fn() }));
vi.mock('@devmentor/ui/backend', async original => ({ ...await original<typeof import('@devmentor/ui/backend')>(), useApiResource: () => state }));
vi.mock('../../../../../../ui/src/backend/api/apiCall', () => ({ apiCall: vi.fn() }));
import { apiCall } from '@devmentor/ui/backend';
import { MentorSlots } from './MentorSlots';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('shows future times by default, toggles past, publishes and removes through shared actions', async () => {
  state.data = [{ id: 'future', startsAt: '2099-11-05T14:30:00Z' }, { id: 'past', startsAt: '2000-01-01T12:00:00Z' }]; state.error = null;
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: {} });
  render(<MentorSlots />);
  expect(screen.getAllByRole('button', { name: 'Remove time' })).toHaveLength(1);
  expect(screen.getByText(/Enter your local time in/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Show past times' }));
  expect(screen.getAllByRole('button', { name: 'Remove time' })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Hide past times' }));
  fireEvent.change(screen.getByLabelText(/Start time/), { target: { value: '2099-11-06T14:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish time' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Your time is published.'));
  fireEvent.click(screen.getByRole('button', { name: 'Remove time' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Your time was removed.'));
  expect(apiCall).toHaveBeenCalledWith('/api/availability/slots/future', { method: 'DELETE', body: undefined });
  expect(state.reload).toHaveBeenCalledTimes(2);
});
it('shows load/error/empty recovery without inventing rows', () => {
  state.data = null; state.error = null; state.loading = true;
  const { rerender } = render(<MentorSlots />);
  state.loading = false; state.error = 'Unavailable'; rerender(<MentorSlots />);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(state.reload).toHaveBeenCalledOnce();
  state.error = null; rerender(<MentorSlots />); expect(screen.getByText('No published times yet.')).toBeTruthy();
});



it('renders a stable UTC server shell and refreshes elapsed times while mounted', () => {
  state.data = []; state.loading = false; state.error = null;
  expect(renderToString(<MentorSlots />)).toContain('UTC');
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
    state.data = [{ id: 'soon', startsAt: '2026-11-05T12:00:30Z' }];
    render(<MentorSlots />);
    expect(screen.getByRole('button', { name: 'Remove time' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('No published times yet.')).toBeTruthy();
  } finally { cleanup(); vi.useRealTimers(); }
});
