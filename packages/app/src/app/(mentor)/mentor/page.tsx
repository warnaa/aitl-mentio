import { MentorWorkspace } from './MentorWorkspace';
import { requirePageAccount } from '../../../lib/session';
import { NotificationsPanel } from '../../../components/notifications/NotificationsPanel';
import { BookingsPanel } from '../../../components/sessions/BookingsPanel';

export const dynamic = 'force-dynamic';

/** `/mentor`, the mentor workspace (`homeFor` sends a mentor without `operator` here). */
export default async function MentorHomePage() {
  await requirePageAccount('mentor', '/mentor');
  return <><MentorWorkspace /><NotificationsPanel /><BookingsPanel persona="mentor" /></>;
}
