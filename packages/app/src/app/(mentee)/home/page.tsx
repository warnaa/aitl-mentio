import { NotificationsPanel } from '../../../components/notifications/NotificationsPanel';
import { BookingsPanel } from '../../../components/sessions/BookingsPanel';
import { requirePageAccount } from '../../../lib/session';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `/home`, the mentee workspace (`homeFor` sends a mentee-only account here), composed as
 * the prototype's s6 "My sessions" screen. Only the authenticated booking projection
 * determines payment state, including when returning from Stripe: `?booked=<id>` merely
 * marks that booking, and anything that is not a uuid is ignored.
 */
export default async function MenteeHomePage({ searchParams }: { searchParams?: Promise<{ booked?: string | string[] }> } = {}) {
  await requirePageAccount('mentee', '/home');
  const booked = (await searchParams)?.booked;
  return (
    <div className="dm-product-stack">
      <h1 className="dm-product-heading">My sessions</h1>
      <NotificationsPanel />
      <BookingsPanel persona="mentee" returnedId={typeof booked === 'string' && UUID.test(booked) ? booked : undefined} />
    </div>
  );
}
