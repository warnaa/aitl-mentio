import { UniqueConstraintViolationException, User, type EntityManager, type IUser } from '@devmentor/db';
import type { AppEnv } from '../../config/env';
import type { EventBus } from '../../events/event-bus';
import { requireRole, type Session } from '../../http/auth';
import { AppError, BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { Logger } from '../../logger';
import type { Clock } from '../../time/clock';
import type { GithubIdentity } from './github-identity.port';
import {
  BASELINE_ROLE,
  diffRoles,
  normalizeRoles,
  reconcileOperatorRole,
  type Role,
  type RoleSet,
} from './roles';

/**
 * Plain, JSON-safe shape a user is exposed as over the API. Services own their output
 * shape (SRP) and return DTOs rather than ORM entities, so routes never risk
 * serializing a bidirectional relation cycle. It never carries `passwordHash`,
 * `emailVerifiedAt`, `sessionVersion` or `githubId`.
 */
export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  /** The stored role set, in `ROLES` order. A stored `operator` is a cache only. */
  roles: Role[];
  githubLogin: string | null;
  avatarUrl: string | null;
  createdAt: string;
  mentorProfile: { id: string; headline: string } | null;
}

/** The only fields a caller may set when creating a user; roles are never among them. */
export interface CreateUserInput {
  email: string;
  displayName: string;
}

/** What the GitHub callback needs to issue a session and pick a home. */
export interface GithubSignIn {
  userId: string;
  sessionVersion: number;
  roles: RoleSet;
}

/** The roles `grantRole`/`revokeRole` manage. `operator` comes only from the allowlist. */
export const ASSIGNABLE_ROLES = ['mentee', 'mentor'] as const satisfies readonly Role[];

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * The GitHub email matches an existing account whose own address is not verified yet
 * (E01 edge case 4). Linking would let whoever created that row take over a GitHub
 * user's account, so nothing is linked or created. The callback maps this to the
 * sign-in screen's `unverified` reason.
 */
export class UnverifiedAccountLinkError extends AppError {
  constructor(
    message = 'An account with this email address exists, but the address is not verified yet. Open the verification link we emailed you, then sign in with GitHub again.',
  ) {
    super(message, 403, 'account_link_unverified');
  }
}

/**
 * The GitHub email matches a verified account that is already linked to a *different*
 * GitHub account. The existing link is never silently re-pointed; nothing changes.
 */
export class GithubAccountConflictError extends AppError {
  constructor(
    message = 'This email address is already linked to a different GitHub account. Sign in with that GitHub account instead.',
  ) {
    super(message, 409, 'github_account_conflict');
  }
}

/** The unique constraints two racing first sign-ins for one identity can trip. */
const IDENTITY_CONSTRAINTS: readonly string[] = ['users_email_unique', 'users_github_id_unique'];

function isIdentityRace(error: unknown): boolean {
  return (
    error instanceof UniqueConstraintViolationException &&
    IDENTITY_CONSTRAINTS.includes((error as { constraint?: string }).constraint ?? '')
  );
}

/** Escape `LIKE` metacharacters so an email matches only itself, case-insensitively. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function toUserDto(user: IUser): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: normalizeRoles(user.roles),
    githubLogin: user.githubLogin ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
    mentorProfile: user.mentorProfile
      ? { id: user.mentorProfile.id, headline: user.mentorProfile.headline }
      : null,
  };
}

/** The dependencies `UserService` takes from the request-scoped cradle. */
export interface UserServiceDeps {
  em: EntityManager;
  logger: Logger;
  eventBus: EventBus;
  clock: Clock;
  env: Pick<AppEnv, 'OPERATOR_EMAILS'>;
  /** The caller's live session (request scopes only). Read lazily — see `list`. */
  session: Promise<Session | null>;
}

/**
 * Domain service for users. Constructor-injected by awilix (PROXY mode), so it
 * receives a request-scoped `em` (a forked EntityManager) plus the shared `logger`,
 * `eventBus`, `clock` and `env`. All persistence goes through the `em` — services
 * never touch `process.env` or the ORM singleton directly, and never build an HTTP
 * response.
 */
export class UserService {
  private readonly em: EntityManager;
  private readonly logger: Logger;
  private readonly eventBus: EventBus;
  private readonly clock: Clock;
  private readonly env: Pick<AppEnv, 'OPERATOR_EMAILS'>;
  private readonly session: () => Promise<Session | null>;

  constructor(deps: UserServiceDeps) {
    this.em = deps.em;
    this.logger = deps.logger;
    this.eventBus = deps.eventBus;
    this.clock = deps.clock;
    this.env = deps.env;
    // Read on demand, not here: resolving `session` verifies the cookie and loads the
    // user, which only `list` needs, and a plain `withScope` registers no session.
    this.session = () => deps.session;
  }

  /**
   * List users with their mentor profile eagerly populated. Operators only — checked
   * here as well as on the route, so the read stays guarded whoever calls it.
   *
   * @throws UnauthorizedError when there is no live session.
   * @throws ForbiddenError when the caller is not an operator.
   */
  async list(): Promise<UserDto[]> {
    const session = await this.session();
    if (!session) {
      throw new UnauthorizedError();
    }
    requireRole(session, 'operator');
    const users = await this.em.find(
      User,
      {},
      { populate: ['mentorProfile'], orderBy: { createdAt: 'desc' } },
    );
    return users.map(toUserDto);
  }

  /**
   * The caller's own account, for signed-in screens to say who is signed in. Any role
   * may read itself. `UserDto.roles` is the *stored* set (a stored `operator` is only a
   * cache), so authorization and role display use `Session.roles` instead.
   *
   * @throws UnauthorizedError when there is no live session, or its user is gone.
   */
  async current(): Promise<UserDto> {
    const session = await this.session();
    if (!session) {
      throw new UnauthorizedError();
    }
    const user = await this.em.findOne(User, { id: session.userId }, { populate: ['mentorProfile'] });
    if (!user) {
      throw new UnauthorizedError();
    }
    return toUserDto(user);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.em.findOne(User, { email });
  }

  /**
   * Create and persist an unverified `mentee`, then emit `auth.user.created`. Only the
   * fields of `CreateUserInput` are read, so a caller can never set roles or any
   * other column through it.
   */
  async create(input: CreateUserInput): Promise<UserDto> {
    const user = this.em.create(User, {
      email: input.email,
      displayName: input.displayName,
      roles: [BASELINE_ROLE],
      sessionVersion: 0,
    });
    this.em.persist(user);
    await this.em.flush();
    this.logger.info({ userId: user.id }, 'created user');
    await this.eventBus.emit('auth.user.created', { userId: user.id, email: user.email });
    return toUserDto(user);
  }

  /**
   * Resolve a GitHub identity to a user, linking or creating as needed, and reconcile
   * the operator cache (E01 step 12). In one concept-owned transaction:
   *
   * 1. a row with this `githubId` → refresh its login and avatar;
   * 2. else a row with this email (case-insensitive) **whose own address is verified**
   *    → link the `githubId` (never rewriting `email`);
   * 3. else, a matching but unverified row → refuse, linking and creating nothing;
   * 4. else create a verified `mentee` and, after commit, emit `auth.user.created`.
   *
   * Two first sign-ins for the same identity race on the email / `github_id` unique
   * constraints. The loser's transaction fails; that violation alone is caught, the
   * winner's row is re-read and returned, so both callers sign in. Any other error
   * propagates.
   *
   * @throws UnverifiedAccountLinkError (403 `account_link_unverified`) — step 3.
   * @throws GithubAccountConflictError (409 `github_account_conflict`) — the verified
   *   row with this email is already linked to another GitHub account.
   */
  async findOrCreateFromGithub(identity: GithubIdentity): Promise<GithubSignIn> {
    let resolved: { user: IUser; created: boolean };
    try {
      resolved = await this.em.transactional((em) => this.matchOrCreate(em, identity, true));
    } catch (error) {
      if (!isIdentityRace(error)) {
        throw error;
      }
      this.logger.info({ githubId: identity.githubId }, 'concurrent GitHub sign-in; reading the winner');
      resolved = await this.em.transactional((em) => this.matchOrCreate(em, identity, false, error));
    }
    const { user, created } = resolved;
    if (created) {
      this.logger.info({ userId: user.id }, 'created user from GitHub');
      await this.eventBus.emit('auth.user.created', { userId: user.id, email: user.email });
    }
    const roles = await reconcileOperatorRole(user, {
      em: this.em,
      eventBus: this.eventBus,
      env: this.env,
    });
    return { userId: user.id, sessionVersion: user.sessionVersion, roles };
  }

  /**
   * Add `role` to the user's stored set. Bumps `sessionVersion`, which signs out every
   * session the user holds — the route that calls this must re-issue the caller's
   * cookie with the returned version. Granting a role already held changes nothing.
   *
   * @returns the user's (possibly new) `sessionVersion`.
   * @throws NotFoundError, BadRequestError (not an assignable role), ConflictError
   *   (the roles changed concurrently; retry).
   */
  async grantRole(userId: string, role: AssignableRole): Promise<number> {
    return this.changeRoles(userId, role, (roles) => [...roles, role]);
  }

  /**
   * Remove `role` from the user's stored set, with the same `sessionVersion` contract
   * as `grantRole`. Revoking the last stored role is refused rather than replaced by
   * `mentee`: an explicit administrative act should fail visibly, not quietly become a
   * different change. Revoking a role not held changes nothing.
   *
   * @returns the user's (possibly new) `sessionVersion`.
   * @throws NotFoundError, BadRequestError (not an assignable role), ConflictError
   *   (`last role`, or the roles changed concurrently).
   */
  async revokeRole(userId: string, role: AssignableRole): Promise<number> {
    return this.changeRoles(userId, role, (roles) => roles.filter((held) => held !== role));
  }

  /**
   * Sign the user out everywhere by bumping `sessionVersion`, so every session cookie
   * issued so far — including a copied one — fails its next live-session check (E01
   * edge case 11). Called by sign-out for a caller whose session is live; an unknown
   * user is a no-op.
   *
   * The bump is conditional on the version just read. If it matches nothing, a
   * concurrent sign-out or role change already bumped it, which has invalidated the
   * same cookies; there is nothing left to do.
   */
  async endAllSessions(userId: string): Promise<void> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      return;
    }
    const updated = await this.em.nativeUpdate(
      User,
      { id: user.id, sessionVersion: user.sessionVersion },
      { sessionVersion: user.sessionVersion + 1, updatedAt: this.clock.now() },
    );
    if (updated > 0) {
      this.logger.info({ userId: user.id }, 'ended all sessions');
    }
  }

  private async matchOrCreate(
    em: EntityManager,
    identity: GithubIdentity,
    allowCreate: boolean,
    raceError?: unknown,
  ): Promise<{ user: IUser; created: boolean }> {
    const linked = await em.findOne(User, { githubId: identity.githubId });
    if (linked) {
      linked.githubLogin = identity.login;
      linked.avatarUrl = identity.avatarUrl;
      await em.flush();
      return { user: linked, created: false };
    }

    const email = identity.email.trim().toLowerCase();
    const sameEmail = await em.find(
      User,
      { email: { $ilike: escapeLike(email) } },
      { orderBy: { createdAt: 'asc' } },
    );
    const verified = sameEmail.find((user) => user.emailVerifiedAt != null);
    if (verified) {
      // The same githubId here means a concurrent sign-in for this identity committed
      // between our two lookups: that is the winner, not a conflict.
      if (verified.githubId != null && verified.githubId !== identity.githubId) {
        throw new GithubAccountConflictError();
      }
      verified.githubId = identity.githubId;
      verified.githubLogin = identity.login;
      verified.avatarUrl = identity.avatarUrl;
      await em.flush();
      return { user: verified, created: false };
    }
    if (sameEmail.length > 0) {
      throw new UnverifiedAccountLinkError();
    }
    if (!allowCreate) {
      // The re-read found no winner: the violation was not the race it looked like.
      throw raceError;
    }

    const user = em.create(User, {
      email,
      displayName: identity.displayName,
      roles: [BASELINE_ROLE],
      githubId: identity.githubId,
      githubLogin: identity.login,
      avatarUrl: identity.avatarUrl,
      emailVerifiedAt: this.clock.now(),
      sessionVersion: 0,
    });
    em.persist(user);
    await em.flush();
    return { user, created: true };
  }

  private async changeRoles(
    userId: string,
    role: AssignableRole,
    change: (roles: string[]) => string[],
  ): Promise<number> {
    if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
      throw new BadRequestError(`"${String(role)}" is not a role that can be granted or revoked`);
    }
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const before = normalizeRoles(user.roles);
    const after = normalizeRoles(change(before));
    const { added, removed } = diffRoles(before, after);
    if (added.length === 0 && removed.length === 0) {
      return user.sessionVersion;
    }
    if (after.length === 0) {
      throw new ConflictError('A user must keep at least one role');
    }
    const sessionVersion = user.sessionVersion + 1;
    const updated = await this.em.nativeUpdate(
      User,
      { id: user.id, sessionVersion: user.sessionVersion },
      { roles: after, sessionVersion, updatedAt: this.clock.now() },
    );
    if (updated === 0) {
      throw new ConflictError('The user changed while their roles were being updated. Try again.');
    }
    this.logger.info({ userId: user.id, added, removed }, 'changed user roles');
    await this.eventBus.emit('auth.user.roles_changed', { userId: user.id, added, removed });
    return sessionVersion;
  }
}
