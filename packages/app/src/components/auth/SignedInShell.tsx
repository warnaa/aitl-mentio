import type { ReactNode } from 'react';
import Link from 'next/link';
import { AppShell } from '@devmentor/ui/backend';
import { Badge } from '@devmentor/ui';
import { ROLE_HOMES, type Role, type Session } from '@devmentor/core';
import { SignOutButton } from './SignOutButton';

/** How each role is named on screen. */
export const ROLE_LABELS = {
  mentee: 'Mentee',
  mentor: 'Mentor',
  operator: 'Operator',
} as const satisfies Record<Role, string>;

/** The navigation label for each role's home surface. */
export const ROLE_HOME_LABELS = {
  mentee: 'Mentee home',
  mentor: 'Mentor home',
  operator: 'Admin',
} as const satisfies Record<Role, string>;

export interface SignedInShellProps {
  user: { displayName: string };
  roles: Session['roles'];
  /** The surface this layout serves; its link is marked as the current page. */
  current: Role;
  children: ReactNode;
}

/**
 * The minimal signed-in chrome for the `(mentee)` and `(mentor)` surfaces (E01 Slice 2):
 * the design system's `AppShell` with who is signed in, a link to the home of every
 * role held (so a combined role set can reach each surface) and sign-out. Slice 3
 * replaces the inline links with `lib/nav.ts` and ports `/admin` onto the same shell.
 *
 * Presentational only: the calling layout has already run `requirePageAccount`.
 */
export function SignedInShell({ user, roles, current, children }: SignedInShellProps) {
  const nav = roles.map((role) => (
    <Link key={role} href={ROLE_HOMES[role]} aria-current={role === current ? 'page' : undefined}>
      {ROLE_HOME_LABELS[role]}
    </Link>
  ));
  return (
    <AppShell nav={nav} user={user} actions={<SignOutButton />}>
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
