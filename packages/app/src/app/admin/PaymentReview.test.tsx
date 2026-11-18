// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiCall, type ApiResult } from '@devmentor/ui/backend';
import { PaymentReview, type PaymentReviewAttempt } from './PaymentReview';

const resource = vi.hoisted(() => ({ data: null as unknown, loading: false, error: null as string | null, reload: vi.fn() }));
vi.mock('@devmentor/ui/backend', async original => ({ ...await original<typeof import('@devmentor/ui/backend')>(), apiCall: vi.fn(), useApiResource: vi.fn(() => resource) }));
const attempt: PaymentReviewAttempt = { attemptId: 'attempt/id', bookingId: 'booking', sessionId: null, status: 'review', reason: 'amount_mismatch', createdAt: '2099-01-01T12:00:00Z', nextReconciliationAt: '2099-01-01T12:05:00Z' };
beforeEach(() => { vi.clearAllMocks(); resource.data = []; resource.loading = false; resource.error = null; });
afterEach(cleanup);

it('reports no exceptions honestly and refreshes the operator projection', () => {
  render(<PaymentReview />);
  expect(screen.getByText('No payments need review')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh payment review' }));
  expect(resource.reload).toHaveBeenCalledOnce();
});

it('shows loading/error states and an overdue case without a diagnostic reason', () => {
  resource.data = null; resource.loading = true;
  const { rerender } = render(<PaymentReview />);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Refresh payment review' }).disabled).toBe(true);
  resource.loading = false; resource.error = 'Operator session expired';
  rerender(<PaymentReview />);
  expect(screen.getByRole('alert').textContent).toContain('Operator session expired');
  resource.error = null; resource.data = [{ ...attempt, reason: null }];
  rerender(<PaymentReview />);
  expect(screen.getByText('Provider reconciliation is overdue.')).toBeTruthy();
});

it('requires a reason, posts only the chosen outcome and reason, then refreshes after success', async () => {
  resource.data = [attempt];
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { status: 'expired' } });
  render(<PaymentReview />);
  expect(screen.getByText('amount_mismatch')).toBeTruthy();
  const form = screen.getByRole('form', { name: 'Resolve payment for booking' });
  fireEvent.submit(form);
  expect(apiCall).not.toHaveBeenCalled();
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Verify and record outcome' }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Verified outcome'), { target: { value: 'release' } });
  fireEvent.change(screen.getByLabelText('Resolution reason'), { target: { value: '  Confirmed terminal unpaid session  ' } });
  fireEvent.submit(form);
  await waitFor(() => expect(resource.reload).toHaveBeenCalledOnce());
  expect(apiCall).toHaveBeenCalledWith('/api/payments/review/attempt%2Fid', { method: 'POST', body: { action: 'release', reason: 'Confirmed terminal unpaid session' } });
  expect(screen.getByRole('status').textContent).toContain('verified outcome was recorded');
});

it('prevents concurrent resolution and retains the reason on an evidence refusal', async () => {
  let finish!: (value: ApiResult<unknown>) => void;
  vi.mocked(apiCall).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  resource.data = [attempt];
  render(<PaymentReview />);
  fireEvent.change(screen.getByLabelText('Resolution reason'), { target: { value: 'Provider paid' } });
  const form = screen.getByRole('form');
  fireEvent.submit(form); fireEvent.submit(form);
  expect(apiCall).toHaveBeenCalledOnce();
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Checking provider evidence…' }).disabled).toBe(true);
  finish({ ok: false, error: { code: 'conflict', message: 'Payment evidence does not match.' } });
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Payment evidence does not match.'));
  expect((screen.getByLabelText('Resolution reason') as HTMLTextAreaElement).value).toBe('Provider paid');
  expect(resource.reload).not.toHaveBeenCalled();
});

it('does not claim a resolution after an unexpected transport error', async () => {
  resource.data = [attempt]; vi.mocked(apiCall).mockRejectedValue(new Error('offline'));
  render(<PaymentReview />);
  fireEvent.change(screen.getByLabelText('Resolution reason'), { target: { value: 'Provider paid' } });
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No resolution has been confirmed.'));
});

it('requires manual reconciliation for an unmatched provider payment', () => {
  resource.data = [{ ...attempt, attemptId: null, bookingId: null, sessionId: 'cs_unknown' }];
  render(<PaymentReview />);
  expect(screen.getByRole('heading', { name: 'Payment without a matching booking' })).toBeTruthy();
  expect(screen.getByText('cs_unknown')).toBeTruthy();
  expect(screen.getByText(/This payment needs manual reconciliation/)).toBeTruthy();
  expect(screen.queryByRole('form')).toBeNull();
});

it('sends an optional provider reference for server-verified recovery of ambiguous creation', async () => {
  resource.data = [attempt]; vi.mocked(apiCall).mockResolvedValue({ ok: true, data: {} });
  render(<PaymentReview />);
  fireEvent.change(screen.getByLabelText('Resolution reason'), { target: { value: 'Found in Stripe' } });
  fireEvent.change(screen.getByLabelText(/Stripe Checkout reference \(optional\)/), { target: { value: ' cs_recovered ' } });
  fireEvent.submit(screen.getByRole('form'));
  await waitFor(() => expect(apiCall).toHaveBeenCalledWith('/api/payments/review/attempt%2Fid', { method: 'POST', body: { action: 'confirm', reason: 'Found in Stripe', sessionId: 'cs_recovered' } }));
});

it('asks the operator to refund a failed cancellation refund by hand, without a resolution form', () => {
  resource.data = [{ ...attempt, attemptId: null, status: 'refund_failed', reason: 'refund_failed' }, { ...attempt, attemptId: null, bookingId: 'other', status: 'refund_pending', reason: 'refund_overdue' }];
  render(<PaymentReview />);
  expect(screen.getByText(/Stripe refused the automatic refund: refund it by hand in Stripe and log it \(R18\)\./)).toBeTruthy();
  expect(screen.getByText(/The automatic refund has not settled yet/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Verify and record outcome' })).toBeNull();
});
