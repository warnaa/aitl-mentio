import { redirect } from 'next/navigation';
import { requirePageRole } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

/** Availability lives in the mentor workspace (design s11); this route keeps the spec's deep link. */
export default async function MentorSlotsPage() {
  await requirePageRole('mentor', '/mentor/slots');
  redirect('/mentor#mentor-time');
}
