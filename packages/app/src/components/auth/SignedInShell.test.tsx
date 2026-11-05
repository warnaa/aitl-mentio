import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { Badge } from '@devmentor/ui';
import { AppShell } from '@devmentor/ui/backend';
import { findAllByType, findByType, textOf } from '../../test/element-tree';
import { RoleChips, ROLE_LABELS, SignedInShell } from './SignedInShell';
import { SignOutButton } from './SignOutButton';
import { WorkspaceNav } from './WorkspaceNav';

const user = { displayName: 'Margaret Hamilton' };

describe('SignedInShell', () => {
  it('renders AppShell with the signed-in user, sign-out and the page', () => {
    const tree = SignedInShell({ user, roles: ['mentee'], children: <p>page</p> }) as ReactElement<
      Record<string, unknown>
    >;

    expect(tree.type).toBe(AppShell);
    expect(tree.props.user).toBe(user);
    expect((tree.props.actions as ReactElement).type).toBe(SignOutButton);
    expect(tree.props.children).toEqual(<p>page</p>);
  });

  it('passes every held role to the workspace navigation, as the nav slot', () => {
    const tree = SignedInShell({ user, roles: ['mentor', 'operator'], children: null });

    const nav = findByType(tree, WorkspaceNav);
    expect(nav.props.roles).toEqual(['mentor', 'operator']);
  });

  it('names every role', () => {
    expect(ROLE_LABELS).toEqual({ mentee: 'Mentee', mentor: 'Mentor', operator: 'Operator' });
  });
});

describe('RoleChips', () => {
  it('lists each role as a neutral chip in a labelled list', () => {
    const tree = RoleChips({ roles: ['mentee', 'mentor', 'operator'] });

    const list = findByType(tree, 'ul');
    expect(list.props['aria-label']).toBe('Your roles');
    expect(findByType(RoleChips({ roles: ['mentee'], label: 'Roles of Ada' }), 'ul').props['aria-label']).toBe('Roles of Ada');
    const chips = findAllByType(tree, Badge);
    expect(chips.map((chip) => [chip.props.variant, textOf(chip)])).toEqual([
      ['outline', 'Mentee'],
      ['outline', 'Mentor'],
      ['outline', 'Operator'],
    ]);
  });
});
