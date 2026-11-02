import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { MentorProfile } from '../mentors/mentor-profile.entity';

const p = defineEntity.properties;

/**
 * Application user. A user may optionally have a `MentorProfile` (1:1).
 *
 * `roles` is a PostgreSQL `text[]` (MikroORM's `p.array()` maps to `ArrayType`,
 * declared as `text[]` on Postgres). The `CHECK` keeps it a one-dimensional, non-empty
 * array whose members are all drawn from `mentee | mentor | operator` — no nulls, no
 * other values. Duplicates are **not** rejected here (a `CHECK` cannot hold a subquery);
 * keeping the set duplicate-free is an application invariant owned by `core`, which
 * also owns the `Role` type. See `.ai/specs/2026-09-04-accounts-and-roles.md`.
 *
 * `email` is the account-linking key and is never rewritten after creation;
 * `sessionVersion` is bumped to revoke every session the user holds.
 */
export const User = defineSingletonEntity('User', () =>
  defineEntity({
    name: 'User',
    tableName: 'users',
    properties: {
      ...baseProperties,
      email: p.string().unique(),
      displayName: p.string(),
      roles: p
        .array()
        .default(['mentee'])
        .check(
          "cardinality(roles) > 0 and array_ndims(roles) = 1 and array_position(roles, null) is null and roles <@ array['mentee', 'mentor', 'operator']::text[]",
        ),
      // GitHub's numeric account id, stored as text.
      githubId: p.string().length(64).nullable().unique(),
      // Display only — a GitHub login can change; `githubId` is the stable identity.
      githubLogin: p.string().length(64).nullable(),
      avatarUrl: p.text().nullable(),
      // Gates account linking: only a verified address may be matched to an identity.
      emailVerifiedAt: p.datetime().nullable(),
      sessionVersion: p.integer().default(0),
      // Per-property thunk so the cross-entity reference is resolved lazily at
      // discovery time, avoiding the circular-import pitfall between the two files.
      mentorProfile: () => p.oneToOne(MentorProfile).mappedBy('user').nullable(),
    },
  }),
);

export type IUser = InferEntity<typeof User>;
