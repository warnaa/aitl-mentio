import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ close: vi.fn(), reconcile: vi.fn() }));
vi.mock('@devmentor/db', () => ({ closeOrm: state.close }));
vi.mock('./scope', () => ({ withPaymentScope: (fn: (c: unknown) => unknown) => fn({ paymentService: state }) }));
import { reconcilePayments } from './reconcile';
it('closes the CLI pool on success and failure', async () => {
  state.reconcile.mockResolvedValueOnce({ processed: 1, failed: 0 });
  expect(await reconcilePayments()).toEqual({ processed: 1, failed: 0 });
  state.reconcile.mockRejectedValueOnce(new Error('DB unavailable'));
  await expect(reconcilePayments()).rejects.toThrow('DB unavailable');
  expect(state.close).toHaveBeenCalledTimes(2);
});
