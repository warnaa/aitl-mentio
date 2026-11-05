// @vitest-environment jsdom
import { renderToString } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ data: null as null | { items: { id: string; startsAt: string }[]; page: number; pageCount: number }, loading: false, error: null as string | null, reload: vi.fn() }));
vi.mock('@devmentor/ui/backend', async original => ({ ...await original<typeof import('@devmentor/ui/backend')>(), useApiResource: vi.fn(() => state) }));
vi.mock('../../../../../ui/src/backend/api/apiCall', () => ({ apiCall: vi.fn() }));
import { apiCall, useApiResource } from '@devmentor/ui/backend';
import { AddTimeCard, TimesCard, useMentorSlots } from './MentorAvailability';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function Harness({ onChange = vi.fn() }: { onChange?: () => void }) {
  const slots = useMentorSlots();
  return <><AddTimeCard onPublished={onChange} /><TimesCard slots={slots} onRemoved={onChange} /></>;
}
const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

it('requests server-side future/past pages and labels each start against the two-hour notice', () => {
  state.data = { items: [{ id: 'open', startsAt: inHours(48) }, { id: 'soon', startsAt: inHours(1) }], page: 1, pageCount: 2 }; state.error = null;
  render(<Harness />);
  expect(screen.getByText('Open')).toBeTruthy();
  expect(screen.getByText('Less than two hours away')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Remove time' })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(useApiResource).toHaveBeenLastCalledWith('/api/availability/slots?past=false&page=2');
  fireEvent.click(screen.getByRole('button', { name: 'Show past times' }));
  expect(useApiResource).toHaveBeenLastCalledWith('/api/availability/slots?past=true&page=1');
  expect(screen.getAllByText('Past')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Remove time' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Hide past times' }));
  expect(useApiResource).toHaveBeenLastCalledWith('/api/availability/slots?past=false&page=1');
});

it('publishes a time and removes one only after confirmation', async () => {
  state.data = { items: [{ id: 'future', startsAt: inHours(48) }], page: 1, pageCount: 1 }; state.error = null;
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: {} });
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  fireEvent.change(screen.getByLabelText(/Session starts at/), { target: { value: '2099-11-06T14:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish available time' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Your time is published.'));

  fireEvent.click(screen.getByRole('button', { name: 'Remove time' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Keep time' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(apiCall).not.toHaveBeenCalledWith('/api/availability/slots/future', expect.anything());

  fireEvent.click(screen.getByRole('button', { name: 'Remove time' }));
  const dialog = screen.getByRole('alertdialog');
  expect(within(dialog).getByText(/will disappear from your public profile/)).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove time' }));
  await waitFor(() => expect(screen.getByText('Your time was removed.')).toBeTruthy());
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(apiCall).toHaveBeenCalledWith('/api/availability/slots/future', { method: 'DELETE', body: undefined });
  expect(onChange).toHaveBeenCalledTimes(2);
});

it('shows load/error/empty recovery without inventing rows', () => {
  state.data = null; state.error = null; state.loading = true;
  const { rerender } = render(<Harness />);
  state.loading = false; state.error = 'Unavailable'; rerender(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(state.reload).toHaveBeenCalledOnce();
  state.error = null; state.data = { items: [], page: 1, pageCount: 1 }; rerender(<Harness />);
  expect(screen.getByText('No published times yet.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Show past times' }));
  expect(screen.getByText('No past times.')).toBeTruthy();
});

it('renders a stable UTC shell and refreshes server availability while mounted', () => {
  state.data = { items: [], page: 1, pageCount: 1 }; state.loading = false; state.error = null;
  expect(renderToString(<Harness />)).toContain('UTC');
  vi.useFakeTimers();
  try { render(<Harness />); act(() => vi.advanceTimersByTime(60_000)); expect(state.reload).toHaveBeenCalledOnce(); }
  finally { cleanup(); vi.useRealTimers(); }
});
