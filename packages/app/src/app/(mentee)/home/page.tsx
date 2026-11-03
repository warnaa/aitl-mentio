import { RoleChips } from '../../../components/auth/SignedInShell';
import { requirePageAccount } from '../../../lib/session';

export const dynamic = 'force-dynamic';

/** `/home`, the mentee home (`homeFor` sends a mentee-only account here). */
export default async function MenteeHomePage() {
  const { session, user } = await requirePageAccount('mentee', '/home');
  return (
    <section className="flex max-w-[65ch] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Mentee home</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are signed in with {user.email}.
        </p>
      </div>
      <RoleChips roles={session.roles} />
      <p className="text-base leading-7">
        Mentor search and session booking are not available yet.
      </p>
    </section>
  );
}
