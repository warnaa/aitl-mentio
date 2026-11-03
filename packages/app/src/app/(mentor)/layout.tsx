import type { ReactNode } from 'react';
import { SignedInShell } from '../../components/auth/SignedInShell';
import { requirePageAccount } from '../../lib/session';

// Reads the session cookie and the database on every request.
export const dynamic = 'force-dynamic';

/**
 * The mentor surface. Guards before rendering anything of the user's; each page under
 * it guards again, because a layout does not re-run on client-side navigation. The
 * layout cannot see the path: a signed-out visitor returns to the page they asked for
 * via the path `proxy.ts` forwards, or to `/mentor` when it forwarded none.
 */
export default async function MentorLayout({ children }: { children: ReactNode }) {
  const { session, user } = await requirePageAccount('mentor', '/mentor');
  return (
    <SignedInShell user={user} roles={session.roles}>
      {children}
    </SignedInShell>
  );
}
