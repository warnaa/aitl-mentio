// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiCall, type ApiResult } from '@devmentor/ui/backend';
import { SlotPicker, type SlotPickerProps } from './SlotPicker';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@devmentor/ui/backend', async original => ({
  ...(await original<typeof import('@devmentor/ui/backend')>()), apiCall: vi.fn(),
}));
const slots: SlotPickerProps['slots'] = [
  { id: 'near', startsAt: '2099-01-01T13:00:00Z', meetsLeadTime: false, viableLengths: [25, 50] },
  { id: 'taken', startsAt: '2099-01-01T14:00:00Z', meetsLeadTime: true, viableLengths: [] },
  { id: 'both', startsAt: '2099-01-01T15:00:00Z', meetsLeadTime: true, viableLengths: [25, 50] },
  { id: 'short', startsAt: '2099-01-01T16:00:00Z', meetsLeadTime: true, viableLengths: [25] },
  { id: 'long', startsAt: '2099-01-01T17:00:00Z', meetsLeadTime: true, viableLengths: [50] },
];
const props: SlotPickerProps = { slug: 'ada', slots, prices: { price25Cents: 8000, price50Cents: 16000, currency: 'PLN' }, viewer: 'mentee', initialSlotId: '', initialLength: 25 };
const booking = { id: 'booking', priceCents: 9000, currency: 'PLN', lengthMinutes: 25, startsAt: slots[2]!.startsAt, expiresAt: '2099-01-01T12:30:00Z' };
const slotRadio = (id: string) => document.querySelector<HTMLInputElement>(`input[name="slotId"][value="${id}"]`)!;
const duration = (length: number) => screen.getByRole<HTMLInputElement>('radio', { name: new RegExp(`^${length} minutes:`) });
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it('explains unavailable starts, prices, hold semantics and blocks an unselected submission', () => {
  render(<SlotPicker {...props} />);
  expect(slotRadio('near').disabled).toBe(true);
  expect(slotRadio('taken').disabled).toBe(true);
  expect(screen.getByText('Unavailable: less than two hours before the start.')).toBeTruthy();
  expect(screen.getByText('Unavailable: overlaps a reserved session.')).toBeTruthy();
  expect(screen.getByText(/A reservation holds this time for 30 minutes/)).toBeTruthy();
  expect(duration(25).textContent).toBe('');
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Reserve this time' }).disabled).toBe(true);
  fireEvent.submit(screen.getByRole('form', { name: 'Reserve selected time' }));
  expect(apiCall).not.toHaveBeenCalled();
});

it('restores the original slot and length after sign-in without making a request', () => {
  render(<SlotPicker {...props} initialSlotId="both" initialLength={50} />);
  expect(slotRadio('both').checked).toBe(true);
  expect(duration(50).checked).toBe(true);
  expect(apiCall).not.toHaveBeenCalled();
});

it('discards unavailable, vanished or unviable restored selections', () => {
  for (const [id, length] of [['missing', 25], ['near', 25], ['taken', 25], ['short', 50]] as const) {
    const { unmount } = render(<SlotPicker {...props} initialSlotId={id} initialLength={length} />);
    expect(document.querySelector('input[name="slotId"]:checked')).toBeNull();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Reserve this time' }).disabled).toBe(true);
    unmount();
  }
});

it('changes duration only when the chosen start cannot support the current selection', async () => {
  const user = userEvent.setup();
  render(<SlotPicker {...props} initialSlotId="both" initialLength={50} />);
  await user.click(slotRadio('short'));
  expect(duration(25).checked).toBe(true);
  expect(duration(50).disabled).toBe(true);
  expect(screen.getByText('Unavailable for this start time.')).toBeTruthy();
  await user.click(slotRadio('both'));
  await user.click(duration(50));
  expect(duration(50).checked).toBe(true);
  await user.click(slotRadio('long'));
  expect(duration(25).disabled).toBe(true);
  expect(duration(50).checked).toBe(true);
  await user.click(slotRadio('short'));
  expect(duration(25).checked).toBe(true);
});

it('preserves slot and length in the signed-out return URL and refuses a form bypass', async () => {
  const user = userEvent.setup();
  render(<SlotPicker {...props} viewer="signed-out" />);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Choose a time to sign in' }).disabled).toBe(true);
  await user.click(slotRadio('both'));
  await user.click(duration(50));
  const link = screen.getByRole('link', { name: 'Sign in to reserve' });
  const url = new URL(link.getAttribute('href')!, 'https://example.test');
  expect(url.pathname).toBe('/sign-in');
  expect(url.searchParams.get('returnTo')).toBe('/m/ada?slot=both&length=50');
  fireEvent.submit(screen.getByRole('form', { name: 'Reserve selected time' }));
  expect(apiCall).not.toHaveBeenCalled();
});

it('requires a mentee account for mentor-only viewers', () => {
  render(<SlotPicker {...props} viewer="other" initialSlotId="both" />);
  expect(screen.getByText('A mentee account is required to reserve a session.')).toBeTruthy();
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Reserve this time' }).disabled).toBe(true);
  fireEvent.submit(screen.getByRole('form', { name: 'Reserve selected time' }));
  expect(apiCall).not.toHaveBeenCalled();
});

it('prevents concurrent submits and shows only the authoritative unpaid hold after success', async () => {
  let finish!: (value: ApiResult<unknown>) => void;
  vi.mocked(apiCall).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<SlotPicker {...props} initialSlotId="both" />);
  const form = screen.getByRole('form', { name: 'Reserve selected time' });
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(apiCall).toHaveBeenCalledExactlyOnceWith('/api/bookings', { method: 'POST', body: { slotId: 'both', lengthMinutes: 25 } });
  expect(screen.getByRole('status').textContent).toBe('Reserving this time…');
  expect(slotRadio('both').closest('fieldset')!.disabled).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Reserve this time' }).disabled).toBe(true);
  finish({ ok: true, data: booking });
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Pending reservation' })).toBeTruthy());
  const result = screen.getByRole('status');
  expect(result.textContent).toContain('This reservation is unpaid and is not confirmed.');
  expect(result.textContent).toContain('25 minutes: PLN 90');
  expect(result.querySelectorAll('time')).toHaveLength(2);
  expect(screen.queryByRole('form')).toBeNull();
});

it('retains selection after conflict and supports a successful retry', async () => {
  const user = userEvent.setup();
  vi.mocked(apiCall).mockResolvedValueOnce({ ok: false, error: { code: 'conflict', message: 'Choose another time.' } }).mockResolvedValueOnce({ ok: true, data: booking });
  render(<SlotPicker {...props} initialSlotId="both" />);
  await user.click(screen.getByRole('button', { name: 'Reserve this time' }));
  expect(screen.getByRole('alert').textContent).toBe('Choose another time.');
  expect(slotRadio('both').checked).toBe(true);
  await user.click(slotRadio('short'));
  expect(screen.queryByRole('alert')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Reserve this time' }));
  expect(screen.getByRole('heading', { name: 'Pending reservation' })).toBeTruthy();
});

it('offers sign-in recovery with the same selection when the session has expired', async () => {
  const user = userEvent.setup();
  vi.mocked(apiCall).mockResolvedValue({ ok: false, error: { code: 'unauthorized', message: 'Authentication required' } });
  render(<SlotPicker {...props} initialSlotId="both" initialLength={50} />);
  await user.click(screen.getByRole('button', { name: 'Reserve this time' }));
  const link = screen.getByRole('link', { name: 'Sign in again with this selection' });
  expect(new URL(link.getAttribute('href')!, 'https://example.test').searchParams.get('returnTo')).toBe('/m/ada?slot=both&length=50');
});

it('reports an unexpected transport failure and re-enables recovery', async () => {
  const user = userEvent.setup();
  vi.mocked(apiCall).mockRejectedValue(new Error('offline'));
  render(<SlotPicker {...props} initialSlotId="both" />);
  await user.click(screen.getByRole('button', { name: 'Reserve this time' }));
  expect(screen.getByRole('alert').textContent).toContain('Try again to recover a pending hold.');
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Reserve this time' }).disabled).toBe(false);
});
