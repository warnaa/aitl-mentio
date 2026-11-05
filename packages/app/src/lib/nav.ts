import { House, ShieldCheck, SlidersHorizontal, UserRound, Users, type LucideIcon } from 'lucide-react';
import type { Role, RoleSet } from '@devmentor/core';

/** One workspace navigation link. The icon is decorative; the label names the page. */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The signed-in surfaces each role may open, first entry being that role's home
 * (`ROLE_HOMES`). Only pages that exist are listed: a link to a page a later epic
 * builds would be a dead end. No entry grants a role — mentors join by invitation and
 * operators by configuration (R07), so there is deliberately no "become a mentor" link.
 */
const NAV_BY_ROLE: Record<Role, readonly NavItem[]> = {
  operator: [
    { href: '/admin', label: 'Admin dashboard', icon: ShieldCheck },
    { href: '/admin/users', label: 'Users', icon: Users },
  ],
  mentee: [{ href: '/home', label: 'Mentee home', icon: House }],
  mentor: [
    { href: '/mentor', label: 'Mentor home', icon: SlidersHorizontal },
    { href: '/mentor/profile', label: 'Mentor profile', icon: UserRound },
  ],
};

/** The order sections appear in, matching the design prototype's workspace menu. */
const NAV_ORDER: readonly Role[] = ['operator', 'mentee', 'mentor'];

/**
 * The navigation for a role set: the union of every held role's surfaces, in a fixed
 * order, so a combined mentor/operator reaches both workspaces from either. The order
 * does not depend on the order of `roles`.
 */
export function navFor(roles: RoleSet): NavItem[] {
  return NAV_ORDER.filter((role) => roles.includes(role)).flatMap((role) => NAV_BY_ROLE[role]);
}

/**
 * The `href` of the item `pathname` is on: an exact match, or the deepest item whose
 * section contains it, so `/admin/users/42` marks Users rather than the dashboard.
 * `undefined` when no item matches.
 */
export function currentHref(items: readonly NavItem[], pathname: string): string | undefined {
  let current: string | undefined;
  for (const { href } of items) {
    const inside = pathname === href || pathname.startsWith(`${href}/`);
    if (inside && (current === undefined || href.length > current.length)) {
      current = href;
    }
  }
  return current;
}
