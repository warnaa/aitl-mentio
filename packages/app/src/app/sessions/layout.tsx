import type { ReactNode } from 'react';
import { SignedInShell } from '../../components/auth/SignedInShell';
import { requirePageSignedIn } from '../../lib/session';

// Reads the session cookie and the database on every request.
export const dynamic = 'force-dynamic';

/**
 * The text session surface. Any signed-in user passes: who may open a given session is
 * decided per booking by the service (a party, else 404), never by role. Each page
 * guards again because a layout does not re-run on client-side navigation.
 */
export default async function SessionsLayout({ children }: { children: ReactNode }) {
  const { session, user } = await requirePageSignedIn('/home');
  return (
    <SignedInShell user={user} roles={session.roles}>
      {children}
    </SignedInShell>
  );
}
