import { closeOrm } from '@devmentor/db';
import { withPaymentScope } from './scope';

/** CLI-owned process only: closes its pool even when provider/database recovery fails. */
export async function reconcilePayments() {
  try { return await withPaymentScope(cradle => cradle.paymentService.reconcile()); }
  finally { await closeOrm(); }
}
