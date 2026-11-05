// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const navigation = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));

const { WorkspaceNav } = await import('./WorkspaceNav');

beforeEach(() => {
  navigation.pathname = '/';
});
afterEach(cleanup);

const linkNames = () => screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]);
const currentLinks = () =>
  screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page').map((link) => link.textContent);

describe('WorkspaceNav', () => {
  it('renders one link per surface the roles allow, in order', () => {
    render(<WorkspaceNav roles={['mentor', 'operator']} />);
    expect(linkNames()).toEqual([
      ['Operator home', '/admin'],
      ['Users', '/admin/users'],
      ['Mentor workspace', '/mentor'],
      ['Edit profile', '/mentor/profile'],
    ]);
  });

  it('marks the page the user is on, following the pathname', () => {
    navigation.pathname = '/admin/users';
    const { rerender } = render(<WorkspaceNav roles={['operator']} />);
    expect(currentLinks()).toEqual(['Users']);

    navigation.pathname = '/admin';
    rerender(<WorkspaceNav roles={['operator']} />);
    expect(currentLinks()).toEqual(['Operator home']);
  });

  it('marks nothing outside the workspace', () => {
    render(<WorkspaceNav roles={['mentee']} />);
    expect(currentLinks()).toEqual([]);
  });

  it('keeps the icons out of the accessible name', () => {
    navigation.pathname = '/home';
    const { container } = render(<WorkspaceNav roles={['mentee']} />);
    expect(screen.getByRole('link', { name: 'My sessions' }).getAttribute('aria-current')).toBe('page');
    const icon = container.querySelector('svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
