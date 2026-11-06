import { BookingsPanel } from '../../../components/sessions/BookingsPanel';
import { requirePageAccount } from '../../../lib/session';

export const dynamic = 'force-dynamic';

/**
 * `/home`, the mentee workspace (`homeFor` sends a mentee-only account here), composed as
 * the prototype's s6 "My sessions" screen. Only the authenticated booking projection
 * determines payment state, including when returning from Stripe.
 */
export default async function MenteeHomePage() {
  await requirePageAccount('mentee', '/home');
  return (
    <div className="dm-product-stack">
      <h1 className="dm-product-heading">My sessions</h1>
      <BookingsPanel persona="mentee" />
    </div>
  );
}
