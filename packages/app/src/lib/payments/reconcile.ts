import { closeOrm } from '@devmentor/db';
import type { Cradle } from '@devmentor/core';
import { withPaymentScope } from './scope';

type Pass<T> = { ok: true; value: T } | { ok: false; error: unknown };
const settle = async <T>(run: () => Promise<T>): Promise<Pass<T>> => {
  try { return { ok: true, value: await run() }; } catch (error) { return { ok: false, error }; }
};

/**
 * The one reconciliation entry point for the CLI and the operator route: the payment
 * pass and the refund pass run in turn and in isolation, so a failure in one never
 * strands the other's work. A failed payment pass still fails the call (after refunds
 * ran), as it did before refunds existed; a failed refund pass is reported in `refunds`.
 */
export async function reconcileAll(cradle: Pick<Cradle, 'paymentService' | 'bookingCancellationService'>) {
  const payments = await settle(() => cradle.paymentService.reconcile());
  const refunds = await settle(() => cradle.bookingCancellationService.reconcileRefunds());
  if (!payments.ok) throw payments.error;
  return { ...payments.value, refunds: refunds.ok ? refunds.value : { processed: 0, failed: 0, unavailable: true } };
}

/** CLI-owned process only: closes its pool even when provider/database recovery fails. */
export async function reconcilePayments() {
  try { return await withPaymentScope(reconcileAll); }
  finally { await closeOrm(); }
}
