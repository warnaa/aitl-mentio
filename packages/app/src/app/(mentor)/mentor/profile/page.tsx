import { getEnv, StackTags } from '@devmentor/core';
import { requirePageRole } from '../../../../lib/session';
import { MentorProfileWorkspace } from './MentorProfileWorkspace';
export const dynamic = 'force-dynamic';
export default async function MentorProfilePage() {
  await requirePageRole('mentor', '/mentor/profile');
  return <MentorProfileWorkspace appUrl={getEnv().APP_URL} options={[...StackTags.options]} />;
}
