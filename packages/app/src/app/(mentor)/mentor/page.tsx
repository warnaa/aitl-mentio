import { MentorDeadline } from './MentorDeadline';
import { MentorOfferStatus } from './MentorOfferStatus';
import { RoleChips } from '../../../components/auth/SignedInShell';
import { requirePageAccount } from '../../../lib/session';

export const dynamic = 'force-dynamic';

/** `/mentor`, the mentor home (`homeFor` sends a mentor without `operator` here). */
export default async function MentorHomePage() {
  const { session, user } = await requirePageAccount('mentor', '/mentor');
  return (
    <section className="flex max-w-[65ch] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Mentor home</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are signed in with {user.email}.
        </p>
      </div>
      <RoleChips roles={session.roles} />
      <MentorDeadline />
      <MentorOfferStatus />
    </section>
  );
}
