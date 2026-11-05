import { EmptyState } from '@devmentor/ui/backend';
import { requirePageAccount } from '../../../lib/session';

export const dynamic = 'force-dynamic';

/**
 * `/home`, the mentee workspace (`homeFor` sends a mentee-only account here), composed as
 * the prototype's s6 "My sessions" screen in its first-use state. Booking is not built
 * yet, so there are no sessions to list and the empty state offers no catalogue link
 * (spec A13).
 */
export default async function MenteeHomePage() {
  await requirePageAccount('mentee', '/home');
  return (
    <div className="dm-product-stack">
      <h1 className="dm-product-heading">My sessions</h1>
      <EmptyState
        title="No sessions yet"
        description="Sessions you book will appear here, with their written answers and private notes."
      />
    </div>
  );
}
