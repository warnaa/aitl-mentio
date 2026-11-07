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

it.each(['mentee', 'mentor'] as const)('links a confirmed booking to its text session for the %s, and no other booking', persona => {
  resource.data = [
    { ...booking, id: 'confirmed', status: 'confirmed', paymentStatus: 'confirmed' },
    { ...booking, id: 'pending' },
    { ...booking, id: 'review', paymentStatus: 'review' },
    { ...booking, id: 'expired', status: 'expired' },
    { ...booking, id: 'cancelled', status: 'cancelled' },
  ];
  render(<BookingsPanel persona={persona} />);
  const links = screen.getAllByRole('link', { name: 'Open text session' });
  expect(links.map(link => link.getAttribute('href'))).toEqual(['/sessions/confirmed']);
});

it.each(['expired', 'cancelled'])('renders historical %s reservations without payment actions', status => {
  resource.data = [{ ...booking, status, paymentStatus: 'expired' }];
  render(<BookingsPanel persona="mentee" />);
  expect(screen.getByText(status === 'expired' ? 'Expired' : 'Cancelled')).toBeTruthy();
  expect(screen.getByText(/This reservation is no longer active/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Checkout/ })).toBeNull();
});

it('separates upcoming sessions from past ones, soonest upcoming first and latest past first', () => {
  resource.data = [
    { ...booking, id: 'past-old', mentorName: 'Old', status: 'confirmed', startsAt: '2020-01-01T12:00:00Z' },
    { ...booking, id: 'later', mentorName: 'Later', status: 'confirmed', startsAt: '2099-02-01T12:00:00Z' },
    { ...booking, id: 'soon', mentorName: 'Soon', status: 'confirmed', startsAt: '2099-01-01T12:00:00Z' },
    { ...booking, id: 'past-new', mentorName: 'Recent', status: 'expired', startsAt: '2099-03-01T12:00:00Z' },
  ];
  render(<BookingsPanel persona="mentee" />);
  const upcoming = screen.getByRole('region', { name: 'Upcoming sessions' });
  const past = screen.getByRole('region', { name: 'Past sessions' });
  expect(Array.from(upcoming.querySelectorAll('h4')).map(heading => heading.textContent)).toEqual(['Session with Soon', 'Session with Later']);
  expect(Array.from(past.querySelectorAll('h4')).map(heading => heading.textContent)).toEqual(['Session with Recent', 'Session with Old']);
});

it('says so when a section is empty while the other has sessions', () => {
  resource.data = [booking];
  const { rerender } = render(<BookingsPanel persona="mentor" />);
  expect(screen.getByText('No past sessions.')).toBeTruthy();
  resource.data = [{ ...booking, status: 'cancelled' }];
  rerender(<BookingsPanel persona="mentor" />);
  expect(screen.getByText('No upcoming sessions.')).toBeTruthy();
});

it('marks only the booking a Checkout return named, without claiming confirmation', () => {
  resource.data = [booking, { ...booking, id: 'other', mentorName: 'Other' }];
  render(<BookingsPanel persona="mentee" returnedId="booking" />);
  expect(screen.getAllByText(/You returned from Checkout for this session/)).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Session with Ada' }).closest('[aria-current="true"]')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Session with Other' }).closest('[aria-current]')).toBeNull();
  expect(screen.queryByText('Payment verified. Your session is confirmed.')).toBeNull();
});
