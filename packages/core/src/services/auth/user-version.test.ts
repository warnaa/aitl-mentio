import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MentorProfile, MikroORM, User, type EntityManager, type IUser } from '@devmentor/db';
import { UserService } from './user.service';
import { updateUserAtVersion } from './user-version';

/**
 * Runs against **real** MikroORM — real metadata, identity map, hydration and
 * `refresh` — with only the driver stubbed by an in-memory `users` table. A fake
 * EntityManager cannot catch this bug class: the earlier fake's `nativeUpdate` mutated
 * the very object `findOne` had returned, which is exactly what MikroORM does not do.
 * (`MikroORM.init` does not connect in v7, so no database is needed.)
 */
type UserRow = Pick<IUser, 'id' | 'email' | 'displayName' | 'roles' | 'sessionVersion'> & Record<string, unknown>;

let orm: MikroORM;
let driverFindOne: ReturnType<typeof vi.fn>;
const table = new Map<string, UserRow>();

function matches(row: UserRow, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

beforeAll(async () => {
  orm = await MikroORM.init({
    entities: [User, MentorProfile],
    clientUrl: 'postgresql://unused:unused@127.0.0.1:1/unused',
  });
  const driver = orm.em.getDriver();
  driverFindOne = vi.spyOn(driver, 'findOne').mockImplementation((async (_entity: unknown, where: Record<string, unknown>) => {
    const row = [...table.values()].find((candidate) => matches(candidate, where));
    return row ? structuredClone(row) : null;
  }) as never) as unknown as ReturnType<typeof vi.fn>;
  vi.spyOn(driver, 'nativeUpdate').mockImplementation((async (
    _entity: unknown,
    where: Record<string, unknown>,
    data: Partial<UserRow>,
  ) => {
    const row = [...table.values()].find((candidate) => matches(candidate, where));
    if (row) Object.assign(row, structuredClone(data));
    return { affectedRows: row ? 1 : 0 };
  }) as never);
});

afterAll(async () => {
  await orm.close();
});

beforeEach(() => {
  driverFindOne.mockClear();
  table.clear();
  table.set('user-1', {
    id: 'user-1',
    email: 'grace@devmentor.test',
    displayName: 'Grace Hopper',
    roles: ['mentee'],
    sessionVersion: 1,
    githubId: null,
    githubLogin: null,
    avatarUrl: null,
    passwordHash: null,
    emailVerifiedAt: new Date('2026-10-01T00:00:00.000Z'),
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  });
});

/** One request scope: a fresh fork with its own identity map. */
function scope(): EntityManager {
  return orm.em.fork() as EntityManager;
}

function service(em: EntityManager) {
  return new UserService({
    em,
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    eventBus: { emit: vi.fn(async () => undefined) },
    clock: { now: () => new Date('2026-11-03T10:00:00.000Z') },
    env: { OPERATOR_EMAILS: [] },
    session: Promise.resolve(null),
  } as never);
}

describe('updateUserAtVersion on real MikroORM', () => {
  it('the stub returns complete rows, so a repeat findOne is served from the identity map', async () => {
    // A row missing a column makes MikroORM auto-refresh on every findOne, which would
    // hide the stale-identity-map bug these tests exist for. Keep the row complete.
    const em = scope();
    const user = await em.findOne(User, { id: 'user-1' });
    await expect(em.findOne(User, { id: 'user-1' })).resolves.toBe(user);
    expect(driverFindOne).toHaveBeenCalledOnce();
  });

  it('writes, and the next findOne in the same scope sees the write', async () => {
    const em = scope();
    const user = (await em.findOne(User, { id: 'user-1' }))!;

    await expect(updateUserAtVersion(em, user, { roles: ['mentee', 'mentor'], sessionVersion: 2 })).resolves.toBe(true);

    const again = (await em.findOne(User, { id: 'user-1' }))!;
    expect(again).toBe(user);
    expect(again.roles).toEqual(['mentee', 'mentor']);
    expect(again.sessionVersion).toBe(2);
  });

  it('re-syncs the entity on a precondition miss, so a retry in the same scope can succeed', async () => {
    const em = scope();
    const user = (await em.findOne(User, { id: 'user-1' }))!;
    table.get('user-1')!.sessionVersion = 5; // another request bumped the version

    await expect(updateUserAtVersion(em, user, { sessionVersion: 2 })).resolves.toBe(false);
    expect(user.sessionVersion).toBe(5);
    await expect(updateUserAtVersion(em, user, { sessionVersion: 6 })).resolves.toBe(true);
    expect(table.get('user-1')!.sessionVersion).toBe(6);
  });

  it('leaves nothing dirty: a later flush writes nothing back', async () => {
    const em = scope();
    const user = (await em.findOne(User, { id: 'user-1' }))!;
    await updateUserAtVersion(em, user, { roles: ['mentee', 'mentor'], sessionVersion: 2 });

    em.getUnitOfWork().computeChangeSets();
    expect(em.getUnitOfWork().getChangeSets()).toEqual([]);
  });
});

describe('UserService role changes in one scope (regression)', () => {
  it('grantRole then revokeRole really removes the role', async () => {
    const users = service(scope());

    await expect(users.grantRole('user-1', 'mentor')).resolves.toBe(2);
    await expect(users.revokeRole('user-1', 'mentor')).resolves.toBe(3);

    expect(table.get('user-1')).toMatchObject({ roles: ['mentee'], sessionVersion: 3 });
  });

  it('two grants in one scope keep both roles and bump the version twice', async () => {
    const users = service(scope());
    table.get('user-1')!.roles = ['mentor'];

    await expect(users.grantRole('user-1', 'mentee')).resolves.toBe(2);
    await expect(users.grantRole('user-1', 'mentor')).resolves.toBe(2);
    await expect(users.revokeRole('user-1', 'mentee')).resolves.toBe(3);

    expect(table.get('user-1')).toMatchObject({ roles: ['mentor'], sessionVersion: 3 });
  });

  it('endAllSessions twice in one scope bumps the version twice', async () => {
    const users = service(scope());

    await users.endAllSessions('user-1');
    await users.endAllSessions('user-1');

    expect(table.get('user-1')!.sessionVersion).toBe(3);
  });
});
