import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { Badge } from '@devmentor/ui';
import { AppShell } from '@devmentor/ui/backend';
import { findAllByType, findByType, textOf } from '../../test/element-tree';
import { RoleChips, ROLE_HOME_LABELS, ROLE_LABELS, SignedInShell } from './SignedInShell';
import { SignOutButton } from './SignOutButton';

const user = { displayName: 'Margaret Hamilton' };

describe('SignedInShell', () => {
  it('renders AppShell with the signed-in user, sign-out and the page', () => {
    const tree = SignedInShell({ user, roles: ['mentee'], current: 'mentee', children: <p>page</p> }) as ReactElement<
      Record<string, unknown>
    >;

    expect(tree.type).toBe(AppShell);
    expect(tree.props.user).toBe(user);
    expect((tree.props.actions as ReactElement).type).toBe(SignOutButton);
    expect(tree.props.children).toEqual(<p>page</p>);
  });

  it('links the home of every role held, marking the current surface', () => {
    const tree = SignedInShell({ user, roles: ['mentor', 'operator'], current: 'mentor', children: null });

    const links = findAllByType(tree, Link);
    expect(links.map((link) => [link.props.href, textOf(link), link.props['aria-current']])).toEqual([
      ['/mentor', 'Mentor home', 'page'],
      ['/admin', 'Admin', undefined],
    ]);
  });

  it('names every role and its home', () => {
    expect(ROLE_LABELS).toEqual({ mentee: 'Mentee', mentor: 'Mentor', operator: 'Operator' });
    expect(ROLE_HOME_LABELS).toEqual({ mentee: 'Mentee home', mentor: 'Mentor home', operator: 'Admin' });
  });
});

describe('RoleChips', () => {
  it('lists each role as a neutral chip in a labelled list', () => {
    const tree = RoleChips({ roles: ['mentee', 'mentor', 'operator'] });

    const list = findByType(tree, 'ul');
    expect(list.props['aria-label']).toBe('Your roles');
    const chips = findAllByType(tree, Badge);
    expect(chips.map((chip) => [chip.props.variant, textOf(chip)])).toEqual([
      ['outline', 'Mentee'],
      ['outline', 'Mentor'],
      ['outline', 'Operator'],
    ]);
  });
});
