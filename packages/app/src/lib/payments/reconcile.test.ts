import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ close: vi.fn(), reconcile: vi.fn(), reconcileRefunds: vi.fn() }));
vi.mock('@devmentor/db', () => ({ closeOrm: state.close }));
vi.mock('./scope', () => ({ withPaymentScope: (fn: (c: unknown) => unknown) => fn({ paymentService: state, bookingCancellationService: state }) }));
import { reconcileAll, reconcilePayments } from './reconcile';

const cradle = { paymentService: state, bookingCancellationService: state } as never;
beforeEach(() => { vi.clearAllMocks(); state.reconcileRefunds.mockResolvedValue({ processed: 2, failed: 0 }); });

it('closes the CLI pool on success and failure', async () => {
  state.reconcile.mockResolvedValueOnce({ processed: 1, failed: 0 });
  expect(await reconcilePayments()).toEqual({ processed: 1, failed: 0, refunds: { processed: 2, failed: 0 } });
  state.reconcile.mockRejectedValueOnce(new Error('DB unavailable'));
  await expect(reconcilePayments()).rejects.toThrow('DB unavailable');
  expect(state.close).toHaveBeenCalledTimes(2);
});

it('runs the refund pass even when the payment pass fails, and reports a failed refund pass', async () => {
  state.reconcile.mockRejectedValueOnce(new Error('provider down'));
  await expect(reconcileAll(cradle)).rejects.toThrow('provider down');
  expect(state.reconcileRefunds).toHaveBeenCalledTimes(1);
  state.reconcile.mockResolvedValueOnce({ processed: 0, failed: 0 });
  state.reconcileRefunds.mockRejectedValueOnce(new Error('refunds down'));
  expect(await reconcileAll(cradle)).toEqual({ processed: 0, failed: 0, refunds: { processed: 0, failed: 0, unavailable: true } });
});
