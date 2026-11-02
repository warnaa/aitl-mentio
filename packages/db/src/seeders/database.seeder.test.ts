import type { EntityManager } from '@mikro-orm/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../entities/auth/user.entity';
import { MentorProfile } from '../entities/mentors/mentor-profile.entity';
import {
  DatabaseSeeder,
  LEGACY_SEED_MENTOR_EMAIL,
  SEED_MENTEE_EMAIL,
  SEED_MENTOR_EMAIL,
  SEED_OPERATOR_EMAIL,
} from './database.seeder';

const NOW = new Date('2026-11-02T12:00:00.000Z');

type FakeEntityManager = {
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

/** `findOne` answers from `rows`, keyed by email; `create` echoes its data back. */
function fakeEntityManager(rows: Record<string, object> = {}): FakeEntityManager {
  return {
    findOne: vi.fn(async (_entity: unknown, where: { email: string }) => rows[where.email] ?? null),
    create: vi.fn((_entity: unknown, data: unknown) => data),
  };
}

async function seed(em: FakeEntityManager): Promise<void> {
  await new DatabaseSeeder().run(em as unknown as EntityManager);
}

const ada = {
  email: SEED_MENTOR_EMAIL,
  displayName: 'Ada Lovelace',
  roles: ['mentor'],
  emailVerifiedAt: NOW,
};
const adaProfile = {
  user: ada,
  headline: 'Systems & algorithms mentor',
  bio: 'Helping engineers reason about complexity.',
  yearsOfExperience: 12,
};
const mentee = {
  email: SEED_MENTEE_EMAIL,
  displayName: 'Grace Hopper',
  roles: ['mentee'],
  emailVerifiedAt: NOW,
};
const operator = {
  email: SEED_OPERATOR_EMAIL,
  displayName: 'Margaret Hamilton',
  roles: ['mentor', 'operator'],
  emailVerifiedAt: NOW,
};

describe('DatabaseSeeder', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses <login>@devmentor.test addresses so mock sign-ins link to the seeded rows', () => {
    expect(SEED_MENTOR_EMAIL).toBe('mock-mentor@devmentor.test');
    expect(SEED_MENTEE_EMAIL).toBe('mock-mentee@devmentor.test');
    expect(SEED_OPERATOR_EMAIL).toBe('mock-operator@devmentor.test');
  });

  it('creates the mentor with her profile, a mentee and an operator on an empty database', async () => {
    const em = fakeEntityManager();

    await seed(em);

    expect(em.findOne).toHaveBeenCalledWith(User, { email: SEED_MENTOR_EMAIL });
    expect(em.findOne).toHaveBeenCalledWith(User, { email: LEGACY_SEED_MENTOR_EMAIL });
    expect(em.create).toHaveBeenCalledTimes(4);
    expect(em.create).toHaveBeenNthCalledWith(1, User, ada);
    // The fake `create` echoes its data back, so the profile must reference the very
    // object the user creation returned — that link is what makes the 1:1 relation work.
    expect(em.create).toHaveBeenNthCalledWith(2, MentorProfile, adaProfile);
    expect(em.create).toHaveBeenNthCalledWith(3, User, mentee);
    expect(em.create).toHaveBeenNthCalledWith(4, User, operator);
  });

  it('marks every seeded account verified and gives each a non-empty role set', async () => {
    const em = fakeEntityManager();

    await seed(em);

    const users = em.create.mock.calls
      .filter(([entity]) => entity === User)
      .map(([, data]) => data as { roles: string[]; emailVerifiedAt: Date });

    expect(users).toHaveLength(3);
    for (const user of users) {
      expect(user.emailVerifiedAt).toEqual(NOW);
      expect(user.roles.length).toBeGreaterThan(0);
    }
  });

  it('gives the operator its own copy of the roles, not the shared fixture array', async () => {
    const first = fakeEntityManager();
    await seed(first);
    const created = first.create.mock.calls[3]?.[1] as { roles: string[] };
    created.roles.push('mentee');

    const second = fakeEntityManager();
    await seed(second);

    expect(second.create).toHaveBeenNthCalledWith(4, User, operator);
  });

  it('is idempotent: seeding an already-seeded database creates nothing', async () => {
    // Regression guard for the unique violation on `users.email` that made a second
    // `npm run db:seed` — and therefore a second `npm run setup` — fail outright.
    const em = fakeEntityManager({
      [SEED_MENTOR_EMAIL]: { id: 1, email: SEED_MENTOR_EMAIL },
      [SEED_MENTEE_EMAIL]: { id: 2, email: SEED_MENTEE_EMAIL },
      [SEED_OPERATOR_EMAIL]: { id: 3, email: SEED_OPERATOR_EMAIL },
    });

    await seed(em);

    expect(em.findOne).not.toHaveBeenCalledWith(User, { email: LEGACY_SEED_MENTOR_EMAIL });
    expect(em.create).not.toHaveBeenCalled();
  });

  it('adds only the missing accounts to a partly seeded database', async () => {
    const em = fakeEntityManager({
      [SEED_MENTOR_EMAIL]: { id: 1, email: SEED_MENTOR_EMAIL },
      [SEED_MENTEE_EMAIL]: { id: 2, email: SEED_MENTEE_EMAIL },
    });

    await seed(em);

    expect(em.create).toHaveBeenCalledTimes(1);
    expect(em.create).toHaveBeenCalledWith(User, operator);
  });

  it("adopts Ada's pre-E01 row instead of adding a second Ada", async () => {
    const verifiedEarlier = new Date('2026-09-01T00:00:00.000Z');
    const legacy = {
      id: 1,
      email: LEGACY_SEED_MENTOR_EMAIL,
      displayName: 'Ada Lovelace',
      roles: ['mentee'],
      emailVerifiedAt: verifiedEarlier as Date | null,
    };
    const em = fakeEntityManager({ [LEGACY_SEED_MENTOR_EMAIL]: legacy });

    await seed(em);

    // Same row (same id), moved to the address the mock persona links to, and a mentor.
    // The backfilled verification time is kept, not overwritten.
    expect(legacy).toEqual({
      id: 1,
      email: SEED_MENTOR_EMAIL,
      displayName: 'Ada Lovelace',
      roles: ['mentor'],
      emailVerifiedAt: verifiedEarlier,
    });
    expect(em.create).not.toHaveBeenCalledWith(User, expect.objectContaining({ email: SEED_MENTOR_EMAIL }));
    expect(em.create).not.toHaveBeenCalledWith(MentorProfile, expect.anything());
    expect(em.create).toHaveBeenCalledWith(User, mentee);
    expect(em.create).toHaveBeenCalledWith(User, operator);
  });

  it("verifies an adopted legacy row that has no verification time yet", async () => {
    const legacy = {
      email: LEGACY_SEED_MENTOR_EMAIL,
      roles: ['mentee'],
      emailVerifiedAt: null as Date | null,
    };
    const em = fakeEntityManager({ [LEGACY_SEED_MENTOR_EMAIL]: legacy });

    await seed(em);

    expect(legacy.emailVerifiedAt).toEqual(NOW);
  });
});
