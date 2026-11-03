import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../../http/auth';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../http/errors';

const db = vi.hoisted(() => {
  class User {}
  class UniqueConstraintViolationException extends Error {
    constructor(readonly constraint: string) {
      super(`duplicate key value violates unique constraint "${constraint}"`);
    }
  }
  return { User, UniqueConstraintViolationException };
});
vi.mock('@devmentor/db', () => db);

const { getEnv } = await import('../../config/env');
const { GithubAccountConflictError, UnverifiedAccountLinkError, UserService } = await import('./user.service');

const NOW = new Date('2026-11-02T10:00:00.000Z');
const CREATED = new Date('2026-10-01T00:00:00.000Z');
const FOUNDER = 'founder@devmentor.test';

interface Row {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  githubId: string | null;
  githubLogin: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  sessionVersion: number;
  createdAt: Date;
  mentorProfile: { id: string; headline: string } | null;
  passwordHash?: string;
}

let nextId = 0;

function row(overrides: Partial<Row> = {}): Row {
  nextId += 1;
  return {
    id: `user-${nextId}`,
    email: `user-${nextId}@devmentor.test`,
    displayName: `User ${nextId}`,
    roles: ['mentee'],
    githubId: null,
    githubLogin: null,
    avatarUrl: null,
    emailVerifiedAt: CREATED,
    sessionVersion: 3,
    createdAt: CREATED,
    mentorProfile: null,
    ...overrides,
  };
}

/** Undo `escapeLike` so the fake can evaluate an `$ilike` pattern as a plain equality. */
const unescapeLike = (pattern: string) => pattern.replace(/\\(.)/g, '$1');

/**
 * An in-memory stand-in for the slice of the EntityManager `UserService` uses. `rows`
 * is the "database": shared between ems so two callers can race on it, with the email
 * and github_id unique constraints enforced at flush like PostgreSQL would.
 */
function fakeEm(rows: Row[], options: { beforeFind?: () => Promise<void> } = {}) {
  let pending: Row[] = [];
  const em = {
    findOne: vi.fn(async (_entity: unknown, where: Partial<Row>) => {
      const [key, value] = Object.entries(where)[0]!;
      return rows.find((candidate) => candidate[key as keyof Row] === value) ?? null;
    }),
    find: vi.fn(async (_entity: unknown, where: { email?: { $ilike: string } }) => {
      await options.beforeFind?.();
      if (!where.email) {
        return [...rows];
      }
      const email = unescapeLike(where.email.$ilike).toLowerCase();
      return rows.filter((candidate) => candidate.email.toLowerCase() === email);
    }),
    create: vi.fn((_entity: unknown, data: Partial<Row>) =>
      row({ id: `created-${nextId + 1}`, createdAt: NOW, githubId: null, ...data }),
    ),
    persist: vi.fn((entity: Row) => {
      pending.push(entity);
    }),
    flush: vi.fn(async () => {
      const inserts = pending;
      pending = [];
      for (const entity of inserts) {
        if (rows.some((existing) => existing.email === entity.email)) {
          throw new db.UniqueConstraintViolationException('users_email_unique');
        }
        if (rows.some((existing) => existing.githubId === entity.githubId)) {
          throw new db.UniqueConstraintViolationException('users_github_id_unique');
        }
        rows.push(entity);
      }
    }),
    nativeUpdate: vi.fn(async (_entity: unknown, where: { id: string; sessionVersion: number }, data: Partial<Row>) => {
      const target = rows.find((candidate) => candidate.id === where.id && candidate.sessionVersion === where.sessionVersion);
      if (!target) {
        return 0;
      }
      Object.assign(target, data);
      return 1;
    }),
    // Rows are the "entities" here, so there is nothing to re-sync; the identity-map
    // behaviour this stands in for is pinned on real MikroORM in user-version.test.ts.
    refresh: vi.fn(async <T>(entity: T) => entity),
    transactional: vi.fn(async <T>(cb: (inner: unknown) => Promise<T>) => {
      pending = [];
      return cb(em);
    }),
  };
  return em;
}

type FakeEm = ReturnType<typeof fakeEm>;

const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
const eventBus = { emit: vi.fn(async () => undefined) };

function service(
  em: FakeEm,
  { session = Promise.resolve(null), operatorEmails = [] }: { session?: Promise<Session | null>; operatorEmails?: readonly string[] } = {},
) {
  return new UserService({
    em,
    logger,
    eventBus,
    clock: { now: () => NOW },
    env: { OPERATOR_EMAILS: operatorEmails },
    session,
  } as never);
}

const identity = (overrides: Partial<{ githubId: string; login: string; displayName: string; avatarUrl: string | null; email: string }> = {}) => ({
  githubId: '1001',
  login: 'octo',
  displayName: 'Octo Cat',
  avatarUrl: 'https://avatars.example/octo.png',
  email: 'octo@devmentor.test',
  ...overrides,
});

const eventsNamed = (name: string) => eventBus.emit.mock.calls.filter((call) => (call as unknown[])[0] === name);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UserService.findOrCreateFromGithub', () => {
  it('matches by githubId first, refreshing login and avatar but never the email', async () => {
    const linked = row({ email: 'old-address@devmentor.test', githubId: '1001', githubLogin: 'old', roles: ['mentor'] });
    const other = row({ email: 'octo@devmentor.test' });
    const em = fakeEm([linked, other]);

    const result = await service(em).findOrCreateFromGithub(identity());

    expect(result).toEqual({ userId: linked.id, sessionVersion: 3, roles: ['mentor'] });
    expect(linked).toMatchObject({
      email: 'old-address@devmentor.test',
      githubLogin: 'octo',
      avatarUrl: 'https://avatars.example/octo.png',
    });
    expect(other.githubId).toBeNull();
    expect(em.find).not.toHaveBeenCalled();
    expect(em.create).not.toHaveBeenCalled();
    expect(eventsNamed('auth.user.created')).toHaveLength(0);
  });

  it('links a locally verified row matched by email, case-insensitively, without rewriting its email', async () => {
    const existing = row({ email: 'Octo@DevMentor.test', roles: ['mentee', 'mentor'] });
    const em = fakeEm([existing]);

    const result = await service(em).findOrCreateFromGithub(identity({ email: 'OCTO@devmentor.TEST' }));

    expect(result).toEqual({ userId: existing.id, sessionVersion: 3, roles: ['mentee', 'mentor'] });
    expect(existing).toMatchObject({
      email: 'Octo@DevMentor.test',
      githubId: '1001',
      githubLogin: 'octo',
      avatarUrl: 'https://avatars.example/octo.png',
    });
    expect(em.flush).toHaveBeenCalled();
    expect(em.create).not.toHaveBeenCalled();
    expect(eventsNamed('auth.user.created')).toHaveLength(0);
  });

  it('escapes LIKE metacharacters so an email matches only itself', async () => {
    const em = fakeEm([row({ email: 'aXb@devmentor.test' })]);

    await service(em).findOrCreateFromGithub(identity({ email: 'a_b%c\\d@devmentor.test' }));

    expect(em.find).toHaveBeenCalledWith(
      db.User,
      { email: { $ilike: 'a\\_b\\%c\\\\d@devmentor.test' } },
      { orderBy: { createdAt: 'asc' } },
    );
    expect(em.create).toHaveBeenCalled();
  });

  it('refuses an email match whose row is unverified, linking and creating nothing', async () => {
    const unverified = row({ email: 'octo@devmentor.test', emailVerifiedAt: null });
    const rows = [unverified];
    const em = fakeEm(rows);

    const failure = service(em).findOrCreateFromGithub(identity());

    await expect(failure).rejects.toBeInstanceOf(UnverifiedAccountLinkError);
    await expect(failure).rejects.toMatchObject({ status: 403, code: 'account_link_unverified' });
    expect(unverified.githubId).toBeNull();
    expect(rows).toHaveLength(1);
    expect(em.flush).not.toHaveBeenCalled();
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('links the verified row when an unverified case-variant of the same email also exists', async () => {
    const unverified = row({ email: 'OCTO@devmentor.test', emailVerifiedAt: null });
    const verified = row({ email: 'octo@devmentor.test' });
    const em = fakeEm([unverified, verified]);

    await expect(service(em).findOrCreateFromGithub(identity())).resolves.toMatchObject({ userId: verified.id });
    expect(verified.githubId).toBe('1001');
    expect(unverified.githubId).toBeNull();
  });

  it('refuses to re-point a verified row already linked to another GitHub account', async () => {
    const linkedElsewhere = row({ email: 'octo@devmentor.test', githubId: '999', githubLogin: 'someone' });
    const em = fakeEm([linkedElsewhere]);

    const failure = service(em).findOrCreateFromGithub(identity());

    await expect(failure).rejects.toBeInstanceOf(GithubAccountConflictError);
    await expect(failure).rejects.toMatchObject({ status: 409, code: 'github_account_conflict' });
    expect(linkedElsewhere).toMatchObject({ githubId: '999', githubLogin: 'someone' });
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('treats a row that gained this githubId between the two lookups as the winner, not a conflict', async () => {
    // A concurrent sign-in for the same identity commits after our githubId lookup
    // missed but before the email lookup ran (found against real PostgreSQL).
    const winner = row({ email: 'octo@devmentor.test', githubId: '1001', githubLogin: 'octo' });
    const em = fakeEm([winner]);
    em.findOne.mockResolvedValueOnce(null);

    await expect(service(em).findOrCreateFromGithub(identity())).resolves.toMatchObject({ userId: winner.id });
    expect(em.create).not.toHaveBeenCalled();
    expect(eventsNamed('auth.user.created')).toHaveLength(0);
  });

  it('creates a verified mentee with a lower-cased email and emits auth.user.created', async () => {
    const rows: Row[] = [];
    const em = fakeEm(rows);

    const result = await service(em).findOrCreateFromGithub(identity({ email: ' Octo@DevMentor.TEST ' }));

    expect(em.create).toHaveBeenCalledWith(db.User, {
      email: 'octo@devmentor.test',
      displayName: 'Octo Cat',
      roles: ['mentee'],
      githubId: '1001',
      githubLogin: 'octo',
      avatarUrl: 'https://avatars.example/octo.png',
      emailVerifiedAt: NOW,
      sessionVersion: 0,
    });
    expect(rows).toHaveLength(1);
    expect(result).toEqual({ userId: rows[0]!.id, sessionVersion: 0, roles: ['mentee'] });
    expect(eventBus.emit).toHaveBeenCalledTimes(1);
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.created', {
      userId: rows[0]!.id,
      email: 'octo@devmentor.test',
    });
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('promotes a new founder against a trimmed, case-insensitive allowlist, without bumping sessionVersion', async () => {
    const env = getEnv({ NODE_ENV: 'test', OPERATOR_EMAILS: '  Founder@DevMentor.TEST , ' });
    expect(env.OPERATOR_EMAILS).toEqual([FOUNDER]);
    const rows: Row[] = [];
    const em = fakeEm(rows);

    const result = await service(em, { operatorEmails: env.OPERATOR_EMAILS }).findOrCreateFromGithub(
      identity({ email: 'Founder@devmentor.test' }),
    );

    expect(result).toEqual({ userId: rows[0]!.id, sessionVersion: 0, roles: ['mentee', 'operator'] });
    expect(rows[0]).toMatchObject({ roles: ['mentee', 'operator'], sessionVersion: 0 });
    expect(eventBus.emit.mock.calls.map((call) => (call as unknown[])[0])).toEqual([
      'auth.user.created',
      'auth.user.roles_changed',
    ]);
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: rows[0]!.id,
      added: ['operator'],
      removed: [],
    });
  });

  it('demotes a de-listed operator at sign-in, keeping mentor and sessionVersion', async () => {
    const founder = row({ email: FOUNDER, githubId: '1001', roles: ['mentor', 'operator'] });
    const em = fakeEm([founder]);

    const result = await service(em).findOrCreateFromGithub(identity());

    expect(result).toEqual({ userId: founder.id, sessionVersion: 3, roles: ['mentor'] });
    expect(founder).toMatchObject({ roles: ['mentor'], sessionVersion: 3 });
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: founder.id,
      added: [],
      removed: ['operator'],
    });
  });

  it('promotes an allowlisted linked mentor at sign-in, keeping mentor', async () => {
    const founder = row({ email: FOUNDER, githubId: '1001', roles: ['mentor'] });
    const em = fakeEm([founder]);

    const result = await service(em, { operatorEmails: [FOUNDER] }).findOrCreateFromGithub(identity());

    expect(result.roles).toEqual(['mentor', 'operator']);
    expect(founder.roles).toEqual(['mentor', 'operator']);
    expect(founder.sessionVersion).toBe(3);
  });

  it('never promotes an allowlisted email on an unverified row', async () => {
    const em = fakeEm([row({ email: FOUNDER, emailVerifiedAt: null })]);

    await expect(
      service(em, { operatorEmails: [FOUNDER] }).findOrCreateFromGithub(identity({ email: FOUNDER })),
    ).rejects.toBeInstanceOf(UnverifiedAccountLinkError);
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('resolves two concurrent first sign-ins to one row, and both callers succeed', async () => {
    const rows: Row[] = [];
    // Hold both callers at the lookup until each has looked, so both decide to create.
    let arrived = 0;
    let release!: () => void;
    const bothLooked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const barrier = async () => {
      arrived += 1;
      if (arrived === 2) release();
      await bothLooked;
    };
    const emA = fakeEm(rows, { beforeFind: barrier });
    const emB = fakeEm(rows, { beforeFind: barrier });

    const [a, b] = await Promise.all([
      service(emA).findOrCreateFromGithub(identity()),
      service(emB).findOrCreateFromGithub(identity()),
    ]);

    expect(rows).toHaveLength(1);
    expect(a.userId).toBe(rows[0]!.id);
    expect(b).toEqual(a);
    expect(eventsNamed('auth.user.created')).toHaveLength(1);
    expect(emA.transactional.mock.calls.length + emB.transactional.mock.calls.length).toBe(3);
    expect(logger.info).toHaveBeenCalledWith({ githubId: '1001' }, 'concurrent GitHub sign-in; reading the winner');
  });

  it('recovers from the github_id constraint as well, re-reading the winner by githubId', async () => {
    const winner = row({ email: 'renamed@devmentor.test', githubId: '1001' });
    const rows: Row[] = [];
    const em = fakeEm(rows);
    em.flush.mockImplementationOnce(async () => {
      rows.push(winner);
      throw new db.UniqueConstraintViolationException('users_github_id_unique');
    });

    await expect(service(em).findOrCreateFromGithub(identity())).resolves.toMatchObject({ userId: winner.id });
    expect(eventsNamed('auth.user.created')).toHaveLength(0);
  });

  it('rethrows an identity violation when the re-read finds no winner', async () => {
    const em = fakeEm([]);
    const violation = new db.UniqueConstraintViolationException('users_email_unique');
    em.flush.mockRejectedValueOnce(violation);

    await expect(service(em).findOrCreateFromGithub(identity())).rejects.toBe(violation);
    expect(em.transactional).toHaveBeenCalledTimes(2);
  });

  it('rethrows an unrelated unique violation without retrying', async () => {
    const em = fakeEm([]);
    const violation = new db.UniqueConstraintViolationException('users_pkey');
    em.flush.mockRejectedValueOnce(violation);

    await expect(service(em).findOrCreateFromGithub(identity())).rejects.toBe(violation);
    expect(em.transactional).toHaveBeenCalledTimes(1);
  });

  it('rethrows a violation that carries no constraint name, and any other error', async () => {
    const em = fakeEm([]);
    const anonymous = Object.assign(new db.UniqueConstraintViolationException('x'), { constraint: undefined });
    em.flush.mockRejectedValueOnce(anonymous);
    await expect(service(em).findOrCreateFromGithub(identity())).rejects.toBe(anonymous);

    const down = new Error('connection terminated');
    em.flush.mockRejectedValueOnce(down);
    await expect(service(em).findOrCreateFromGithub(identity())).rejects.toBe(down);
    expect(em.transactional).toHaveBeenCalledTimes(2);
  });
});

describe('UserService.list', () => {
  const session = (roles: Session['roles']): Promise<Session> => Promise.resolve({ userId: 'caller', roles });

  it('throws 401 for an anonymous caller without reading users', async () => {
    const em = fakeEm([row()]);

    await expect(service(em).list()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(em.find).not.toHaveBeenCalled();
  });

  it.each([
    ['mentee', ['mentee'] as const],
    ['mentor', ['mentor'] as const],
    ['mentee and mentor', ['mentee', 'mentor'] as const],
  ])('throws 403 for a %s caller without reading users', async (_label, roles) => {
    const em = fakeEm([row()]);

    await expect(service(em, { session: session(roles) }).list()).rejects.toBeInstanceOf(ForbiddenError);
    expect(em.find).not.toHaveBeenCalled();
  });

  it('returns DTOs for an operator, exposing roles, login and avatar but no sensitive fields', async () => {
    const mentor = row({
      email: 'ada@devmentor.test',
      displayName: 'Ada',
      roles: ['operator', 'mentor', 'mentor'],
      githubId: '42',
      githubLogin: 'ada',
      avatarUrl: 'https://avatars.example/ada.png',
      passwordHash: 'scrypt$secret',
      mentorProfile: { id: 'mp-1', headline: 'Systems' },
    });
    const plain = row({ id: 'plain', email: 'plain@devmentor.test', displayName: 'Plain' });
    const em = fakeEm([mentor, plain]);

    const users = await service(em, { session: session(['mentor', 'operator']) }).list();

    expect(em.find).toHaveBeenCalledWith(db.User, {}, { populate: ['mentorProfile'], orderBy: { createdAt: 'desc' } });
    expect(users).toEqual([
      {
        id: mentor.id,
        email: 'ada@devmentor.test',
        displayName: 'Ada',
        roles: ['mentor', 'operator'],
        githubLogin: 'ada',
        avatarUrl: 'https://avatars.example/ada.png',
        createdAt: CREATED.toISOString(),
        mentorProfile: { id: 'mp-1', headline: 'Systems' },
      },
      {
        id: 'plain',
        email: 'plain@devmentor.test',
        displayName: 'Plain',
        roles: ['mentee'],
        githubLogin: null,
        avatarUrl: null,
        createdAt: CREATED.toISOString(),
        mentorProfile: null,
      },
    ]);
  });

  it('maps absent optional columns to null', async () => {
    const sparse = { ...row(), githubLogin: undefined, avatarUrl: undefined } as unknown as Row;
    const em = fakeEm([sparse]);

    const [dto] = await service(em, { session: session(['operator']) }).list();

    expect(dto).toMatchObject({ githubLogin: null, avatarUrl: null });
  });

  it('does not resolve the session for any other method', async () => {
    const em = fakeEm([]);
    const deps = {
      em,
      logger,
      eventBus,
      clock: { now: () => NOW },
      env: { OPERATOR_EMAILS: [] },
      get session(): Promise<Session | null> {
        throw new Error('session resolved');
      },
    };

    const users = new UserService(deps as never);

    await expect(users.findByEmail('x@devmentor.test')).resolves.toBeNull();
    await expect(users.list()).rejects.toThrow('session resolved');
  });
});

describe('UserService.current', () => {
  it('throws 401 for an anonymous caller without reading users', async () => {
    const em = fakeEm([row()]);

    await expect(service(em).current()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it("returns any signed-in caller's own DTO, with the mentor profile populated", async () => {
    const own = row({ id: 'caller', displayName: 'Grace', mentorProfile: { id: 'mp-2', headline: 'Compilers' } });
    const em = fakeEm([row(), own]);
    const session = Promise.resolve<Session>({ userId: 'caller', roles: ['mentee'] });

    const dto = await service(em, { session }).current();

    expect(em.findOne).toHaveBeenCalledWith(db.User, { id: 'caller' }, { populate: ['mentorProfile'] });
    expect(dto).toMatchObject({ id: 'caller', displayName: 'Grace', mentorProfile: { id: 'mp-2', headline: 'Compilers' } });
    expect(dto).not.toHaveProperty('passwordHash');
  });

  it('throws 401 when the session user no longer exists', async () => {
    const em = fakeEm([row()]);
    const session = Promise.resolve<Session>({ userId: 'deleted', roles: ['mentee'] });

    await expect(service(em, { session }).current()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('UserService.findByEmail', () => {
  it('looks a user up by exact email', async () => {
    const existing = row({ email: 'grace@devmentor.test' });
    const em = fakeEm([existing]);

    await expect(service(em).findByEmail('grace@devmentor.test')).resolves.toBe(existing);
    expect(em.findOne).toHaveBeenCalledWith(db.User, { email: 'grace@devmentor.test' });
  });
});

describe('UserService.create', () => {
  it('creates an unverified mentee from the typed input only; roles cannot be set', async () => {
    const rows: Row[] = [];
    const em = fakeEm(rows);

    const dto = await service(em).create({
      email: 'new@devmentor.test',
      displayName: 'New Person',
      roles: ['operator'],
      emailVerifiedAt: NOW,
      sessionVersion: 99,
    } as never);

    expect(em.create).toHaveBeenCalledWith(db.User, {
      email: 'new@devmentor.test',
      displayName: 'New Person',
      roles: ['mentee'],
      sessionVersion: 0,
    });
    expect(dto).toMatchObject({ email: 'new@devmentor.test', roles: ['mentee'] });
    expect(rows).toHaveLength(1);
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.created', { userId: dto.id, email: 'new@devmentor.test' });
    expect(logger.info).toHaveBeenCalledWith({ userId: dto.id }, 'created user');
  });
});

describe('UserService.grantRole / revokeRole', () => {
  it('grantRole adds the role, normalized, bumps sessionVersion and emits auth.user.roles_changed', async () => {
    const user = row({ roles: ['operator', 'mentee'], sessionVersion: 3 });
    const em = fakeEm([user]);

    await expect(service(em).grantRole(user.id, 'mentor')).resolves.toBe(4);

    expect(em.nativeUpdate).toHaveBeenCalledWith(
      db.User,
      { id: user.id, sessionVersion: 3 },
      { roles: ['mentee', 'mentor', 'operator'], sessionVersion: 4, updatedAt: NOW },
    );
    expect(user).toMatchObject({ roles: ['mentee', 'mentor', 'operator'], sessionVersion: 4 });
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: user.id,
      added: ['mentor'],
      removed: [],
    });
  });

  it('grantRole of a role already held changes nothing and keeps sessionVersion', async () => {
    const user = row({ roles: ['mentee', 'mentor', 'mentor'] });
    const em = fakeEm([user]);

    await expect(service(em).grantRole(user.id, 'mentor')).resolves.toBe(3);
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('revokeRole removes the role, preserving the others, and bumps sessionVersion', async () => {
    const user = row({ roles: ['mentee', 'mentor'], sessionVersion: 7 });
    const em = fakeEm([user]);

    await expect(service(em).revokeRole(user.id, 'mentee')).resolves.toBe(8);

    expect(user).toMatchObject({ roles: ['mentor'], sessionVersion: 8 });
    expect(eventBus.emit).toHaveBeenCalledWith('auth.user.roles_changed', {
      userId: user.id,
      added: [],
      removed: ['mentee'],
    });
  });

  it('revokeRole of a role not held changes nothing', async () => {
    const user = row({ roles: ['mentee'] });
    const em = fakeEm([user]);

    await expect(service(em).revokeRole(user.id, 'mentor')).resolves.toBe(3);
    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('revokeRole refuses to remove the last stored role', async () => {
    const user = row({ roles: ['mentor'] });
    const em = fakeEm([user]);

    await expect(service(em).revokeRole(user.id, 'mentor')).rejects.toBeInstanceOf(ConflictError);
    expect(user.roles).toEqual(['mentor']);
    expect(em.nativeUpdate).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('revokeRole may leave only the operator cache, which reconciliation keeps non-empty', async () => {
    const user = row({ email: FOUNDER, roles: ['mentee', 'operator'] });
    const em = fakeEm([user]);

    await expect(service(em).revokeRole(user.id, 'mentee')).resolves.toBe(4);
    expect(user.roles).toEqual(['operator']);
  });

  it('refuses operator, which only the allowlist confers', async () => {
    const user = row();
    const em = fakeEm([user]);

    await expect(service(em).grantRole(user.id, 'operator' as never)).rejects.toBeInstanceOf(BadRequestError);
    await expect(service(em).revokeRole(user.id, 'operator' as never)).rejects.toBeInstanceOf(BadRequestError);
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('throws 404 for an unknown user', async () => {
    await expect(service(fakeEm([])).grantRole('missing', 'mentor')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws a retryable conflict when sessionVersion moved concurrently', async () => {
    const user = row();
    const em = fakeEm([user]);
    em.nativeUpdate.mockResolvedValueOnce(0);

    await expect(service(em).grantRole(user.id, 'mentor')).rejects.toBeInstanceOf(ConflictError);
    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});

describe('UserService.endAllSessions', () => {
  it('bumps sessionVersion conditionally on the version it read', async () => {
    const user = row({ sessionVersion: 3 });
    const em = fakeEm([user]);

    await expect(service(em).endAllSessions(user.id)).resolves.toBeUndefined();

    expect(em.nativeUpdate).toHaveBeenCalledWith(
      db.User,
      { id: user.id, sessionVersion: 3 },
      { sessionVersion: 4, updatedAt: NOW },
    );
    expect(user.sessionVersion).toBe(4);
    expect(logger.info).toHaveBeenCalledWith({ userId: user.id }, 'ended all sessions');
  });

  it('is a no-op for an unknown user', async () => {
    const em = fakeEm([]);

    await service(em).endAllSessions('missing');

    expect(em.nativeUpdate).not.toHaveBeenCalled();
  });

  it('accepts a concurrent bump as already done', async () => {
    const user = row({ sessionVersion: 3 });
    const em = fakeEm([user]);
    em.nativeUpdate.mockResolvedValueOnce(0);
    logger.info.mockClear();

    await expect(service(em).endAllSessions(user.id)).resolves.toBeUndefined();
    expect(logger.info).not.toHaveBeenCalled();
  });
});
