'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { RoleSet } from '@devmentor/core';
import { currentHref, navFor } from '../../lib/nav';

/**
 * The workspace links for a role set (`lib/nav.ts`), rendered into `AppShell`'s `nav`
 * slot. A client component because the current page must follow client-side
 * navigation: a layout does not re-render between `/admin` and `/admin/users`, so an
 * `aria-current` computed there would go stale.
 */
export function WorkspaceNav({ roles }: { roles: RoleSet }) {
  const items = navFor(roles);
  const current = currentHref(items, usePathname());
  return items.map(({ href, label, icon: Icon }) => (
    <Link key={href} href={href} aria-current={href === current ? 'page' : undefined}>
      <Icon aria-hidden="true" />
      {label}
    </Link>
  ));
}
