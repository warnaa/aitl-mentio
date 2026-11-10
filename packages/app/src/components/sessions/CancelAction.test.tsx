// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiCall } from '@devmentor/ui/backend';
import { CancelAction, expectsRefund } from './CancelAction';

vi.mock('@devmentor/ui/backend', async original => ({ ...await original<typeof import('@devmentor/ui/backend')>(), apiCall: vi.fn() }));
const call = vi.mocked(apiCall);
const onCancelled = vi.fn();
const future = { id: 'b1', priceCents: 24000, currency: 'PLN', freeCancellationUntil: '2099-01-01T12:00:00Z' };
const soon = { ...future, freeCancellationUntil: '2000-01-01T12:00:00Z' };
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

const open = (booking = future) => {
  render(<CancelAction booking={booking} onCancelled={onCancelled} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
};

it('decides the expected outcome on the inclusive 24-hour line', () => {
  expect(expectsRefund({ freeCancellationUntil: '2026-11-10T12:00:00.000Z' }, new Date('2026-11-10T12:00:00.000Z'))).toBe(true);
  expect(expectsRefund({ freeCancellationUntil: '2026-11-10T12:00:00.000Z' }, new Date('2026-11-10T12:00:00.001Z'))).toBe(false);
});

it('states the full refund before confirming, sends that outcome and reloads on success', async () => {
  call.mockResolvedValueOnce({ ok: true, data: { booking: { refundStatus: 'refunded' } } } as never);
  open();
  expect(screen.getByText(/you get a full refund of/)).toBeTruthy();
  expect(screen.getByText(/The mentor's time becomes free for others/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel and refund' }));
  await waitFor(() => expect(onCancelled).toHaveBeenCalledOnce());
  expect(call).toHaveBeenCalledWith('/api/bookings/b1/cancel', { method: 'POST', body: { expectRefund: true } });
});

it('states that no refund is made inside 24 hours before confirming', async () => {
  call.mockResolvedValueOnce({ ok: true, data: { booking: { refundStatus: 'none' } } } as never);
  open(soon);
  expect(screen.getByText(/you will not get a refund/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel without refund' }));
  await waitFor(() => expect(onCancelled).toHaveBeenCalledOnce());
  expect(call).toHaveBeenCalledWith('/api/bookings/b1/cancel', { method: 'POST', body: { expectRefund: false } });
});

it('re-states the changed outcome when the window closed while the dialog was open, without cancelling', async () => {
  call.mockResolvedValueOnce({ ok: false, error: { code: 'refund_window_changed', message: 'The free cancellation window has just closed. Nothing was cancelled; review the outcome and confirm again.' } } as never);
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel and refund' }));
  await screen.findByText(/The free cancellation window has just closed/);
  expect(screen.getByText(/you will not get a refund/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Cancel without refund' })).toBeTruthy();
  expect(onCancelled).not.toHaveBeenCalled();
});

it('points to a quality dispute once the session started and offers no confirm', async () => {
  call.mockResolvedValueOnce({ ok: false, error: { code: 'session_started', message: 'This session has already started. To report a problem with it, contact DevMentor support about a quality dispute.' } } as never);
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel and refund' }));
  await screen.findByText(/quality dispute/);
  expect(screen.queryByRole('button', { name: /^Cancel (and|without)/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
});

it('keeps the dialog open with a readable error on failure, and ignores double submits', async () => {
  let resolve: (value: unknown) => void = () => undefined;
  call.mockImplementationOnce(() => new Promise(r => { resolve = r; }) as never);
  open();
  const confirm = screen.getByRole('button', { name: 'Cancel and refund' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(call).toHaveBeenCalledTimes(1);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Cancelling…' }).disabled).toBe(true);
  resolve({ ok: false, error: { code: 'service_unavailable', message: 'Payments are not configured' } });
  await screen.findByText('Payments are not configured');
  call.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel and refund' }));
  await screen.findByText(/could not be sent/);
  expect(onCancelled).not.toHaveBeenCalled();
});
