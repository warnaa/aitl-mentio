// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiCall, type ApiResult } from '@devmentor/ui/backend';
import { CheckoutAction } from './CheckoutAction';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@devmentor/ui/backend', async original => ({ ...await original<typeof import('@devmentor/ui/backend')>(), apiCall: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it('opens only the server-supplied Checkout URL without sending client money fields', async () => {
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { bookingId: 'a/b', url: 'https://checkout.stripe.com/test', expiresAt: '2099-01-01' } });
  render(<CheckoutAction bookingId="a/b" />);
  fireEvent.click(screen.getByRole('button', { name: 'Pay with Stripe' }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('https://checkout.stripe.com/test'));
  expect(apiCall).toHaveBeenCalledWith('/api/bookings/a%2Fb/checkout', { method: 'POST', body: {} });
});

it('prevents duplicate in-flight calls and re-enables retry after a provider failure', async () => {
  let finish!: (value: ApiResult<unknown>) => void;
  vi.mocked(apiCall).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<CheckoutAction bookingId="booking" />);
  const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Pay with Stripe' });
  act(() => { button.click(); button.click(); });
  expect(button.disabled).toBe(true);
  expect(screen.getByRole('status').textContent).toBe('Opening secure checkout…');
  fireEvent.click(button);
  expect(apiCall).toHaveBeenCalledOnce();
  finish({ ok: false, error: { code: 'unavailable', message: 'Try again later.' } });
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Try again later.'));
  expect(button.disabled).toBe(false);
  expect(router.push).not.toHaveBeenCalled();
});

it('reports an unexpected transport failure without implying payment failed', async () => {
  vi.mocked(apiCall).mockRejectedValue(new Error('offline'));
  render(<CheckoutAction bookingId="booking" />);
  fireEvent.click(screen.getByRole('button', { name: 'Pay with Stripe' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Check your payment status before trying again.'));
});
