import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { User } from '../auth/user.entity';

const p = defineEntity.properties;

/**
 * Mentor-facing profile owned by a `User` (the owning side of the 1:1, so the FK
 * lives here). Placeholder fields — the real mentor domain is a later spec.
 */
export const MentorProfile = defineSingletonEntity('MentorProfile', () =>
  defineEntity({
    name: 'MentorProfile',
    tableName: 'mentor_profiles',
    // A public page always has a share link; the slug is set on first publication and kept.
    checks: [{ name: 'mentor_profiles_published_slug_check', expression: 'published_at is null or slug is not null' }],
    properties: {
      ...baseProperties,
      // Per-property thunk (lazy) so the reference to `User` is resolved at discovery
      // time — see the matching note on `User.mentorProfile`.
      user: () =>
        p
          .oneToOne(User)
          .inversedBy('mentorProfile')
          .owner()
          .unique()
          .deleteRule('cascade'),
      slug: p.string().length(60).nullable().unique(),
      publicWorkUrl: p.text().nullable(),
      // Hand-written literal: db cannot import core's `StackTags`; a core test pins the two together.
      stackTags: p
        .array()
        .default([])
        .check("stack_tags <@ array['typescript','react','python','ai-agents']::text[] and array_position(stack_tags, null) is null"),
      publishedAt: p.datetime().nullable(),
      headline: p.string(),
      bio: p.text().nullable(),
      yearsOfExperience: p.integer().default(0),
      initialPublishDueAt: p.datetime().nullable(),
      lastPublishedAvailabilityAt: p.datetime().nullable(),
    },
  }),
);

export type IMentorProfile = InferEntity<typeof MentorProfile>;
