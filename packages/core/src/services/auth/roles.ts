import type { EntityManager } from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { updateUserAtVersion } from './user-version';

/**
 * The fixed role vocabulary and the operator-cache reconciliation (E01). A leaf module:
 * `http/auth.ts` (the live session) and `UserService` (sign-in, grant, revoke) both
 * build on it, so neither has to import the other.
 *
 * `users.roles` is the persisted assignment set. `mentee` and `mentor` are
 * authoritative as stored; a stored `operator` is only a queryability cache, because
 * operator authority comes live from `OPERATOR_EMAILS`.
 */
export const ROLES = ['mentee', 'mentor', 'operator'] as const;

export type Role = (typeof ROLES)[number];

/** A non-empty role set in `ROLES` order: what `Session.roles` holds. */
export type RoleSet = readonly [Role, ...Role[]];

/**
 * The role every account receives at creation, and the floor a role set falls back to
 * when de-listing an operator would otherwise leave it empty.
 */
export const BASELINE_ROLE = 'mentee' satisfies Role;

/** Each role's default landing page. */
export const ROLE_HOMES = {
  operator: '/admin',
  mentor: '/mentor',
  mentee: '/home',
} as const satisfies Record<Role, string>;

/**
 * The single place the default landing for a signed-in user is decided: `operator` →
 * `/admin`, else `mentor` → `/mentor`, else `/home`. A combined mentor/operator lands on
 * `/admin`; navigation still exposes every surface the role set permits. Pure, and free
 * of `next`, so route handlers and pages share it.
 */
export function homeFor(roles: RoleSet): string {
  if (roles.includes('operator')) {
    return ROLE_HOMES.operator;
  }
  return roles.includes('mentor') ? ROLE_HOMES.mentor : ROLE_HOMES.mentee;
}

/** The row fields role resolution reads. */
export interface RoleSource {
  email: string;
  emailVerifiedAt?: Date | null;
  roles: readonly string[];
}

/** `roles` restricted to the `Role` union, in `ROLES` order and without duplicates. */
export function normalizeRoles(roles: readonly string[]): Role[] {
  return ROLES.filter((role) => roles.includes(role));
}

/**
 * The effective role set for a user row, in `ROLES` order and without duplicates.
 * Stored `mentee`/`mentor` are authoritative. Stored `operator` is only a cache and is
 * ignored: `operator` is granted exactly when the row's own email, lower-cased, is in
 * `operatorEmails` (already trimmed and lower-cased by the env schema) **and** the row
 * is verified. Pure; may return `[]` — see `effectiveRoles` for the consumer rule.
 */
export function resolveRoles(user: RoleSource, operatorEmails: readonly string[]): Role[] {
  const operator =
    user.emailVerifiedAt != null && operatorEmails.includes(user.email.toLowerCase());
  return ROLES.filter((role) =>
    role === 'operator' ? operator : user.roles.includes(role),
  );
}

function isNonEmpty<T>(items: T[]): items is [T, ...T[]] {
  return items.length > 0;
}

/**
 * `resolveRoles` with the never-empty rule. A role set never becomes empty: when the
 * only role a row held was the `operator` cache and the allowlist no longer backs it,
 * the account falls back to `mentee`, the baseline every account receives — a de-listed
 * founder keeps an ordinary account rather than hitting a 500.
 *
 * `null` means the stored set holds no valid role at all (empty, or only values outside
 * the union) and no live `operator` either. The `users_roles_check` constraint makes
 * that unreachable, so it is corrupt data, and the caller surfaces it as an internal
 * error rather than silently granting `mentee` to a row nobody assigned anything.
 */
export function effectiveRoles(user: RoleSource, operatorEmails: readonly string[]): RoleSet | null {
  const resolved = resolveRoles(user, operatorEmails);
  if (isNonEmpty(resolved)) {
    return resolved;
  }
  return user.roles.includes('operator') ? [BASELINE_ROLE] : null;
}

/** Whether `stored` is exactly `roles`, element by element. */
export function sameRoles(stored: readonly string[], roles: readonly Role[]): boolean {
  return stored.length === roles.length && stored.every((role, index) => role === roles[index]);
}

/** Membership differences between two role lists, each in `ROLES` order. */
export function diffRoles(
  before: readonly string[],
  after: readonly string[],
): { added: Role[]; removed: Role[] } {
  return {
    added: ROLES.filter((role) => after.includes(role) && !before.includes(role)),
    removed: ROLES.filter((role) => before.includes(role) && !after.includes(role)),
  };
}

/** The user-row fields reconciliation reads. */
export interface ReconcilableUser extends RoleSource {
  id: string;
  sessionVersion: number;
}

/** What reconciliation needs: a narrow write, the event bus, and the allowlist. */
export interface ReconcileDeps {
  em: Pick<EntityManager, 'nativeUpdate' | 'refresh'>;
  eventBus: Pick<EventBus, 'emit'>;
  env: { OPERATOR_EMAILS: readonly string[] };
}

/**
 * Reconcile the stored role set with the live answer and return the effective roles.
 * The one helper behind both sign-in and the opportunistic check in `loadSession`.
 *
 * When the stored set already equals the effective set — the normal case — nothing is
 * written. Otherwise the stored set is rewritten to it (operator added or removed,
 * other roles preserved, normalized), and `auth.user.roles_changed` is emitted when
 * membership actually changed (a mere reordering or de-duplication writes silently).
 *
 * `sessionVersion` is **never** bumped: the stored operator carries no authority, so a
 * stale cache is harmless and correcting it must not sign anyone out. It is used
 * instead as the write's precondition — `grantRole`/`revokeRole` (and sign-out) bump
 * it, so a reconciliation computed from a row read before a concurrent grant matches
 * nothing and cannot overwrite the grant. A skipped write is harmless: the next request
 * reconciles again from the fresh row.
 *
 * The write goes through `updateUserAtVersion`: a targeted `nativeUpdate`, not a
 * `flush`, so a session resolved midway through a service never flushes that service's
 * pending unit of work, followed by a refresh so the scope's identity map holds the
 * written roles. `user` must therefore be an entity managed by `em`.
 *
 * @throws Error when the stored set holds no valid role (see `effectiveRoles`).
 */
export async function reconcileOperatorRole(
  user: ReconcilableUser,
  { em, eventBus, env }: ReconcileDeps,
): Promise<RoleSet> {
  const roles = effectiveRoles(user, env.OPERATOR_EMAILS);
  if (!roles) {
    throw new Error(`User ${user.id} has no effective role (stored roles: [${user.roles.join(', ')}])`);
  }
  if (sameRoles(user.roles, roles)) {
    return roles;
  }
  // Diff before writing: the write must not be able to change what it is compared with.
  const { added, removed } = diffRoles(user.roles, roles);
  const updated = await updateUserAtVersion(em, user, { roles: [...roles] });
  if (updated && (added.length > 0 || removed.length > 0)) {
    await eventBus.emit('auth.user.roles_changed', { userId: user.id, added, removed });
  }
  return roles;
}
