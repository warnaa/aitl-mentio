import { requirePageRole } from '../../../../lib/session';
import { MentorSlots } from './MentorSlots';
export const dynamic = 'force-dynamic';
export default async function MentorSlotsPage() {
  await requirePageRole('mentor', '/mentor/slots');
  return <MentorSlots />;
}
