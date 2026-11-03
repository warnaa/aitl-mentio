import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { User } from '../entities/auth/user.entity';
import { MentorProfile } from '../entities/mentors/mentor-profile.entity';

/**
 * Seeded addresses follow `<login>@devmentor.test`, the address the mock GitHub
 * identity adapter derives from a `login` hint. A mock sign-in as `mock-mentor`,
 * `mock-mentee` or `mock-operator` therefore links to the seeded row (matched by
 * verified email) instead of creating a second account. `User.email` is unique, so each
 * address also identifies its seed row.
 */
export const SEED_MENTOR_EMAIL = 'mock-mentor@devmentor.test';
export const SEED_MENTEE_EMAIL = 'mock-mentee@devmentor.test';
export const SEED_OPERATOR_EMAIL = 'mock-operator@devmentor.test';

/**
 * The demo password of the seeded mentee and operator, for signing in through the
 * email form locally and in the integration harness. Public on purpose (it is in the
 * README): these are fixtures, never real accounts.
 */
export const SEED_PASSWORD = 'devmentor-demo-password';
/**
 * `SEED_PASSWORD` hashed once with core's `PasswordService` (scrypt, N=2¹⁷). Stored
 * pre-computed because `db` cannot import `core`, and hashing at seed time would cost
 * ~128 MiB per account; `database.seeder.test.ts` proves it matches.
 */
export const SEED_PASSWORD_HASH =
  'scrypt$131072$8$1$AM+k64qm2OLLNYQtDBmjLA==$uhIbff+K4cvHObNSn55Hvt+lngIP6wBBrtW4JgUs8c5O2C5BuKhWbOTHaECmabhhoZUYqlmmeq9iQhU3YmbcFg==';

/** Ada's address before E01. A database seeded back then still holds her under it. */
export const LEGACY_SEED_MENTOR_EMAIL = 'ada@devmentor.dev';

/**
 * Accounts without a mentor profile. The operator also holds `mentor`, proving combined
 * roles coexist. Both can sign in with `SEED_PASSWORD` as well as through GitHub; Ada
 * stays GitHub-only, so a password-less account is seeded too.
 */
const SEED_ACCOUNTS = [
  { email: SEED_MENTEE_EMAIL, displayName: 'Grace Hopper', roles: ['mentee'] },
  { email: SEED_OPERATOR_EMAIL, displayName: 'Margaret Hamilton', roles: ['mentor', 'operator'] },
] as const;

/**
 * Default seeder — a mentor (Ada Lovelace, with a profile), a mentee and an operator, all
 * with a verified email, so a fresh database has one account per role. Run with
 * `npm run db:seed`.
 *
 * Seeding is **idempotent**: `User.email` carries a unique constraint, so blindly
 * inserting a fixture a second time fails with a unique violation. Because
 * `npm run setup` re-runs this seeder on every invocation, each fixture is created only
 * when its address is absent.
 */
export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const verifiedAt = new Date();

    await this.seedMentor(em, verifiedAt);

    for (const account of SEED_ACCOUNTS) {
      const existing = await em.findOne(User, { email: account.email });
      if (!existing) {
        em.create(User, {
          ...account,
          roles: [...account.roles],
          emailVerifiedAt: verifiedAt,
          passwordHash: SEED_PASSWORD_HASH,
        });
      } else if (!existing.passwordHash) {
        // A database seeded before Slice 4: give the fixture its demo password. Never
        // overwrite a hash that is already there.
        existing.passwordHash = SEED_PASSWORD_HASH;
      }
    }
  }

  private async seedMentor(em: EntityManager, verifiedAt: Date): Promise<void> {
    if (await em.findOne(User, { email: SEED_MENTOR_EMAIL })) {
      return;
    }

    // A database seeded before E01 already has Ada under her old address. Adopt that row
    // — keeping its id and mentor profile — rather than adding a second Ada. This is the
    // only place a `users.email` is ever rewritten, and only for this seed fixture.
    const legacy = await em.findOne(User, { email: LEGACY_SEED_MENTOR_EMAIL });
    if (legacy) {
      legacy.email = SEED_MENTOR_EMAIL;
      legacy.roles = ['mentor'];
      legacy.emailVerifiedAt ??= verifiedAt;
      return;
    }

    const user = em.create(User, {
      email: SEED_MENTOR_EMAIL,
      displayName: 'Ada Lovelace',
      roles: ['mentor'],
      emailVerifiedAt: verifiedAt,
    });

    em.create(MentorProfile, {
      user,
      headline: 'Systems & algorithms mentor',
      bio: 'Helping engineers reason about complexity.',
      yearsOfExperience: 12,
    });
  }
}
