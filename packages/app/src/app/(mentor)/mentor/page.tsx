import { MentorWorkspace } from './MentorWorkspace';
import { requirePageAccount } from '../../../lib/session';

export const dynamic = 'force-dynamic';

/** `/mentor`, the mentor workspace (`homeFor` sends a mentor without `operator` here). */
export default async function MentorHomePage() {
  await requirePageAccount('mentor', '/mentor');
  return <MentorWorkspace />;
}
