import type { ReactNode } from "react";
import { SignedInShell } from "../../components/auth/SignedInShell";
import { requirePageAccount } from "../../lib/session";

// Reads the session cookie and the database on every request.
export const dynamic = "force-dynamic";

/**
 * The admin surface. Pages under `/admin` use shadcn-ui components from
 * `@devmentor/ui`, inside the same signed-in shell as the mentee and mentor surfaces,
 * so a combined mentor/operator keeps one navigation across both.
 *
 * Operators only: it guards before rendering anything, and every page under it guards
 * again, because a layout does not re-run on client-side navigation (edge case 21).
 * The layout cannot see the path: a signed-out visitor returns to the page they asked
 * for via the path `proxy.ts` forwards, or to `/admin` when it forwarded none.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { session, user } = await requirePageAccount("operator", "/admin");
  return (
    <SignedInShell user={user} roles={session.roles}>
      {children}
    </SignedInShell>
  );
}
