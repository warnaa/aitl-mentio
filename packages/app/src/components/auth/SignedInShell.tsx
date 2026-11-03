import type { ReactNode } from 'react';
import { AppShell } from '@devmentor/ui/backend';
import { Badge } from '@devmentor/ui';
import type { Role, Session } from '@devmentor/core';
import { SignOutButton } from './SignOutButton';
import { WorkspaceNav } from './WorkspaceNav';

/** How each role is named on screen. */
export const ROLE_LABELS = {
  mentee: 'Mentee',
  mentor: 'Mentor',
  operator: 'Operator',
} as const satisfies Record<Role, string>;

export interface SignedInShellProps {
  user: { displayName: string };
  roles: Session['roles'];
  children: ReactNode;
}

/**
 * The chrome of every signed-in surface — `(mentee)`, `(mentor)` and `/admin` (the
 * `app` and `admin` surfaces of AGENTS.md's taxonomy): the design system's `AppShell`
 * with who is signed in, the navigation for the union of their roles
 * (`WorkspaceNav`, from `lib/nav.ts`) and sign-out.
 *
 * Presentational only: the calling layout has already run `requirePageAccount`, and
 * hiding a link is not enforcement — every page guards itself.
 */
export function SignedInShell({ user, roles, children }: SignedInShellProps) {
  return (
    <AppShell nav={<WorkspaceNav roles={roles} />} user={user} actions={<SignOutButton />}>
      {children}
    </AppShell>
  );
}

/** The roles a session holds, one neutral, noninteractive chip each. */
export function RoleChips({ roles }: { roles: Session['roles'] }) {
  return (
    <ul aria-label="Your roles" className="m-0 flex list-none flex-wrap gap-2 p-0">
      {roles.map((role) => (
        <li key={role}>
          <Badge variant="outline">{ROLE_LABELS[role]}</Badge>
        </li>
      ))}
    </ul>
  );
}
