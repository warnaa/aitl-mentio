import { getEnv, StackTags } from '@devmentor/core';
import { requirePageRole } from '../../../../lib/session';
import { MentorProfileEditor } from './MentorProfileEditor';
export const dynamic = 'force-dynamic';
export default async function MentorProfilePage() {
  await requirePageRole('mentor', '/mentor/profile');
  return <MentorProfileEditor appUrl={getEnv().APP_URL} options={[...StackTags.options]} />;
}
