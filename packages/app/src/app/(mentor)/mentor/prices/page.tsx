import { redirect } from 'next/navigation';
import { requirePageRole } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

/** Session prices live in the mentor workspace (design s11); this route keeps the spec's deep link. */
export default async function MentorPricesPage() {
  await requirePageRole('mentor', '/mentor/prices');
  redirect('/mentor#mentor-prices');
}
