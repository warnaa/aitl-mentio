// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useApiResource } from '@devmentor/ui/backend';
import { BookingsPanel, type ParticipantBooking } from './BookingsPanel';

const resource = vi.hoisted(() => ({ data: null as unknown, loading: false, error: null as string | null, reload: vi.fn() }));
vi.mock('@devmentor/ui/backend', async original => ({ ...await original<typeof import('@devmentor/ui/backend')>(), useApiResource: vi.fn(() => resource) }));
vi.mock('./CheckoutAction', () => ({ CheckoutAction: ({ bookingId }: { bookingId: string }) => <button>Checkout {bookingId}</button> }));
const booking: ParticipantBooking = { id: 'booking', mentorName: 'Ada', menteeName: 'Grace', lengthMinutes: 25, priceCents: 9000, currency: 'PLN', startsAt: '2099-01-01T12:00:00Z', status: 'pending', expiresAt: '2099-01-01T11:00:00Z', paidAt: null, paymentStatus: 'open' };
beforeEach(() => { vi.clearAllMocks(); resource.data = []; resource.loading = false; resource.error = null; });
afterEach(cleanup);

it('shows first use without inventing sessions and allows an explicit status refresh', () => {
  render(<BookingsPanel persona="mentee" />);
  expect(screen.getByText('No sessions yet')).toBeTruthy();
  expect(useApiResource).toHaveBeenCalledWith('/api/bookings?role=mentee');
  fireEvent.click(screen.getByRole('button', { name: 'Check payment status' }));
  expect(resource.reload).toHaveBeenCalledOnce();
  expect(screen.getByText(/Sessions are text/)).toBeTruthy();
});

it('shows loading and readable error recovery without presenting a confirmed booking', () => {
  resource.data = null; resource.loading = true;
  const { rerender } = render(<BookingsPanel persona="mentee" />);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Check payment status' }).disabled).toBe(true);
  expect(screen.getByRole('status')).toBeTruthy();
  resource.loading = false; resource.error = 'Cannot read bookings';
  rerender(<BookingsPanel persona="mentee" />);
  expect(screen.getByRole('alert').textContent).toContain('Cannot read bookings');
});

it('shows pending payment and the authoritative window with a mentee checkout action', () => {
  resource.data = [booking];
  render(<BookingsPanel persona="mentee" />);
  expect(screen.getByRole('heading', { name: 'Session with Ada' })).toBeTruthy();
  expect(screen.getByText('Pending')).toBeTruthy();
  expect(screen.getByText(/Returning from Checkout does not confirm/)).toBeTruthy();
  expect(screen.getByText(/The time stays reserved while payment is checked/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Checkout booking' })).toBeTruthy();
  expect(screen.getByText(/PLN\s90/)).toBeTruthy();
});

it('uses the counterpart for mentors, hides their payment action and permits missing expiry', () => {
  resource.data = [{ ...booking, expiresAt: null }];
  render(<BookingsPanel persona="mentor" />);
  expect(useApiResource).toHaveBeenCalledWith('/api/bookings?role=mentor');
  expect(screen.getByRole('heading', { name: 'Session with Grace' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Checkout booking' })).toBeNull();
  expect(screen.queryByText(/Payment window:/)).toBeNull();
});

it('reports confirmed state only from the stored projection and isolates review from retry', () => {
  resource.data = [{ ...booking, id: 'confirmed', status: 'confirmed', paymentStatus: 'confirmed' }, { ...booking, id: 'review', paymentStatus: 'review' }];
  render(<BookingsPanel persona="mentee" />);
  expect(screen.getByText('Confirmed')).toBeTruthy();
  expect(screen.getByText('Payment verified. Your session is confirmed.')).toBeTruthy();
  expect(screen.getByText(/Your payment needs review/).textContent).toContain('review');
  expect(screen.queryByRole('button', { name: /Checkout/ })).toBeNull();
});

it.each(['expired', 'cancelled'])('renders historical %s reservations without payment actions', status => {
  resource.data = [{ ...booking, status, paymentStatus: 'expired' }];
  render(<BookingsPanel persona="mentee" />);
  expect(screen.getByText(status === 'expired' ? 'Expired' : 'Cancelled')).toBeTruthy();
  expect(screen.getByText(/This reservation is no longer active/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Checkout/ })).toBeNull();
});
