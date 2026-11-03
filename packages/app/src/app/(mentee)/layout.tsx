import type { ReactNode } from 'react';
import { SignedInShell } from '../../components/auth/SignedInShell';
import { requirePageAccount } from '../../lib/session';

// Reads the session cookie and the database on every request.
export const dynamic = 'force-dynamic';

/**
 * The mentee surface. Guards before rendering anything of the user's; each page under
 * it guards again, because a layout does not re-run on client-side navigation. The
 * layout cannot see the path, so a signed-out visitor returns to `/home`.
 */
export default async function MenteeLayout({ children }: { children: ReactNode }) {
  const { session, user } = await requirePageAccount('mentee', '/home');
  return (
    <SignedInShell user={user} roles={session.roles} current="mentee">
      {children}
    </SignedInShell>
  );
}
