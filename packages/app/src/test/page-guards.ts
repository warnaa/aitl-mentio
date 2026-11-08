import { vi } from 'vitest';
import type { Role, RoleSet, Session, UserDto } from '@devmentor/core';

/*
 * Shared seam for guarded page and layout tests (AGENTS.md: mock `lib/session`, assert
 * the tree on the allowed path and a sentinel throw on the denied one). Each test file
 * mocks `lib/session` with these functions; `deny` makes the next guard throw the way
 * `redirect()` does.
 */
export class GuardRedirect extends Error {
  constructor(readonly location: string) {
    super(`redirect ${location}`);
  }
}

export const user: UserDto = {
  id: 'user-1',
  email: 'mock-mentee@devmentor.test',
  displayName: 'Grace Hopper',
  roles: ['mentee'],
  githubLogin: 'mock-mentee',
  avatarUrl: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  mentorProfile: null,
};

export const session = (...roles: RoleSet): Session => ({ userId: user.id, roles });

export const guards = {
  requirePageRole: vi.fn<(role: Role, returnTo: string) => Promise<Session>>(),
  requirePageAccount: vi.fn<(role: Role, returnTo: string) => Promise<{ session: Session; user: UserDto }>>(),
  requirePageSignedIn: vi.fn<(returnTo: string) => Promise<{ session: Session; user: UserDto }>>(),
  withPageScope: vi.fn<(returnTo: string, fn: (cradle: never) => Promise<object>) => Promise<object>>(),
};

/** Let both guards admit a caller holding `roles`. */
export function admit(...roles: RoleSet): Session {
  const live = session(...roles);
  guards.requirePageRole.mockReset().mockResolvedValue(live);
  guards.requirePageAccount.mockReset().mockResolvedValue({ session: live, user });
  guards.requirePageSignedIn.mockReset().mockResolvedValue({ session: live, user });
  return live;
}

/** Make both guards refuse, redirecting to `location`. */
export function deny(location: string): void {
  const refuse = async () => {
    throw new GuardRedirect(location);
  };
  guards.requirePageRole.mockReset().mockImplementation(refuse);
  guards.requirePageAccount.mockReset().mockImplementation(refuse);
  guards.requirePageSignedIn.mockReset().mockImplementation(refuse);
}
