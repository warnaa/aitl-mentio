import { describe, expect, it } from 'vitest';
import { ROLE_HOMES, homeFor, type Role, type RoleSet } from '@devmentor/core';
import { currentHref, navFor } from './nav';

const links = (roles: RoleSet) => navFor(roles).map(({ href, label }) => [href, label]);

const OPERATOR = [
  ['/admin', 'Operator home'],
  ['/admin/users', 'Users'],
  ['/admin/sessions', 'Note declines'],
  ['/admin/settings', 'Settings'],
];
const MENTEE = [['/home', 'My sessions']];
const MENTOR = [['/mentor', 'Mentor workspace'], ['/mentor/profile', 'Edit profile']];

const ROLE_SETS: RoleSet[] = [
  ['mentee'],
  ['mentor'],
  ['operator'],
  ['mentee', 'mentor'],
  ['mentee', 'operator'],
  ['mentor', 'operator'],
  ['mentee', 'mentor', 'operator'],
];

describe('navFor', () => {
  it('gives each single role its own surfaces only', () => {
    expect(links(['mentee'])).toEqual(MENTEE);
    expect(links(['mentor'])).toEqual(MENTOR);
    expect(links(['operator'])).toEqual(OPERATOR);
  });

  it('gives a combined role set the union, operator then mentee then mentor', () => {
    expect(links(['mentee', 'mentor'])).toEqual([...MENTEE, ...MENTOR]);
    expect(links(['mentor', 'operator'])).toEqual([...OPERATOR, ...MENTOR]);
    expect(links(['mentee', 'mentor', 'operator'])).toEqual([...OPERATOR, ...MENTEE, ...MENTOR]);
  });

  it('does not depend on the order the roles are held in', () => {
    expect(links(['operator', 'mentor', 'mentee'])).toEqual(links(['mentee', 'mentor', 'operator']));
  });

  it.each(ROLE_SETS)('always includes the default home of %j, so the landing page is reachable', (...roles) => {
    expect(navFor(roles as unknown as RoleSet).map((item) => item.href)).toContain(homeFor(roles as unknown as RoleSet));
  });

  it("lists each held role's home first in its section, matching ROLE_HOMES", () => {
    for (const role of Object.keys(ROLE_HOMES) as Role[]) {
      expect(navFor([role])[0]!.href).toBe(ROLE_HOMES[role]);
    }
  });

  it.each(ROLE_SETS)('offers no way to gain a role for %j (R07)', (...roles) => {
    for (const { href, label } of navFor(roles as unknown as RoleSet)) {
      expect(label).not.toMatch(/become|apply|join|upgrade|invite/i);
      expect(['/admin', '/admin/users', '/admin/sessions', '/admin/settings', '/home', '/mentor', '/mentor/profile']).toContain(href);
    }
  });

  it('gives every link a decorative icon', () => {
    for (const { icon } of navFor(['mentee', 'mentor', 'operator'])) {
      expect(icon).toBeTruthy();
    }
  });
});

describe('currentHref', () => {
  const items = navFor(['mentee', 'mentor', 'operator']);

  it.each([
    ['/admin', '/admin'],
    ['/admin/users', '/admin/users'],
    ['/admin/users/42', '/admin/users'],
    ['/admin/settings', '/admin/settings'],
    ['/admin/payments', '/admin'],
    ['/home', '/home'],
    ['/mentor', '/mentor'],
    ['/mentor/slots', '/mentor'],
  ])('marks %s as %s', (pathname, expected) => {
    expect(currentHref(items, pathname)).toBe(expected);
  });

  it.each(['/', '/mentors', '/administrator', '/homepage'])('marks nothing for %s', (pathname) => {
    expect(currentHref(items, pathname)).toBeUndefined();
  });

  it('prefers the deepest match whatever the item order', () => {
    expect(currentHref([...items].reverse(), '/admin/users')).toBe('/admin/users');
  });
});
