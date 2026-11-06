// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PaidSessionsReport } from './PaidSessionsReport';
const resource = vi.hoisted(() => ({ data: null as unknown, loading: false, error: null as string | null, reload: vi.fn() }));
vi.mock('@devmentor/ui/backend', async original => ({ ...await original<typeof import('@devmentor/ui/backend')>(), useApiResource: vi.fn(() => resource) }));
const empty = { timezone: 'Europe/Warsaw', cohortStart: '2026-08-17', cohortEnd: '2026-11-06T12:00:00Z', paidSessionCount: 0, timingSampleCount: 0, medianBookingToStartMinutes: null, bookingWeeks: [], sessionStartWeeks: [] };
beforeEach(() => { vi.clearAllMocks(); resource.data = empty; resource.loading = false; resource.error = null; });
afterEach(cleanup);
it('shows honest empty, loading and denied/error states and refreshes the report', () => {
  const { rerender } = render(<PaidSessionsReport />);
  expect(screen.getByText('No recorded payments yet')).toBeTruthy(); expect(screen.getByText('Not available')).toBeTruthy();
  expect(screen.getAllByText('No recorded paid sessions in this view.')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh paid session report' })); expect(resource.reload).toHaveBeenCalledOnce();
  resource.loading = true; resource.data = null; rerender(<PaidSessionsReport />);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Refresh paid session report' }).disabled).toBe(true);
  resource.loading = false; resource.error = 'Operator session required'; rerender(<PaidSessionsReport />);
  expect(screen.getByRole('alert').textContent).toContain('Operator session required');
});
it('keeps both weekly definitions distinct and labels cohort, timing and future-week semantics', () => {
  resource.data = { ...empty, paidSessionCount: 3, timingSampleCount: 2, medianBookingToStartMinutes: 180.25, bookingWeeks: [{ week: '2026-11-02', count: 3 }], sessionStartWeeks: [{ week: '2026-11-09', count: 1 }, { week: '2026-11-16', count: 2 }] };
  render(<PaidSessionsReport />);
  const bookings = within(screen.getByRole('table', { name: 'By booking week' }));
  const starts = within(screen.getByRole('table', { name: 'By session-start week' }));
  expect(bookings.getByRole('cell', { name: '3' })).toBeTruthy(); expect(bookings.getByRole('rowheader', { name: '2026-11-02' })).toBeTruthy();
  expect(starts.getByRole('rowheader', { name: '2026-11-16' })).toBeTruthy();
  expect(screen.getByText('180.3 minutes')).toBeTruthy(); expect(screen.queryByText('No recorded payments yet')).toBeNull();
  expect(screen.getByText(/Both views use the same recorded payments/)).toBeTruthy();
});
