// @vitest-environment jsdom
import { renderToString } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ data: null as null | { items: { id: string; startsAt: string }[]; page: number; pageCount: number }, loading: false, error: null as string | null, reload: vi.fn() }));
vi.mock('@devmentor/ui/backend', async original => ({ ...await original<typeof import('@devmentor/ui/backend')>(), useApiResource: vi.fn(() => state) }));
vi.mock('../../../../../../ui/src/backend/api/apiCall', () => ({ apiCall: vi.fn() }));
import { apiCall, useApiResource } from '@devmentor/ui/backend';
import { MentorSlots } from './MentorSlots';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('requests server-side future/past pages and publishes/removes through shared actions', async () => {
  state.data = { items: [{ id: 'future', startsAt: '2099-11-05T14:30:00Z' }], page: 1, pageCount: 2 }; state.error = null;
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: {} });
  render(<MentorSlots />);
  expect(screen.getAllByRole('button', { name: 'Remove time' })).toHaveLength(1);
  expect(screen.getByText(/Enter your local time in/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(useApiResource).toHaveBeenLastCalledWith('/api/availability/slots?past=false&page=2');
  fireEvent.click(screen.getByRole('button', { name: 'Show past times' }));
  expect(useApiResource).toHaveBeenLastCalledWith('/api/availability/slots?past=true&page=1');
  fireEvent.click(screen.getByRole('button', { name: 'Hide past times' }));
  expect(useApiResource).toHaveBeenLastCalledWith('/api/availability/slots?past=false&page=1');
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
it('renders a stable UTC shell and refreshes server availability while mounted', () => {
  state.data = { items: [], page: 1, pageCount: 1 }; state.loading = false; state.error = null;
  expect(renderToString(<MentorSlots />)).toContain('UTC');
  vi.useFakeTimers();
  try { render(<MentorSlots />); act(() => vi.advanceTimersByTime(60_000)); expect(state.reload).toHaveBeenCalledOnce(); }
  finally { cleanup(); vi.useRealTimers(); }
});
