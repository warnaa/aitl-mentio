import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { MentorProfile } from '../mentors/mentor-profile.entity';

const p = defineEntity.properties;

/** A published start instant; booking history will reference this immutable row. */
export const Slot = defineSingletonEntity('Slot', () =>
  defineEntity({
    name: 'Slot',
    tableName: 'slots',
    indexes: [
      { name: 'slots_mentor_start_index', properties: ['mentorProfile', 'startsAt'] },
      {
        name: 'slots_active_mentor_start_unique',
        expression: 'create unique index "slots_active_mentor_start_unique" on "slots" ("mentor_profile_id", "starts_at") where removed_at is null',
      },
    ],
    properties: {
      ...baseProperties,
      mentorProfile: () => p.manyToOne(MentorProfile).deleteRule('cascade'),
      startsAt: p.datetime(),
      removedAt: p.datetime().nullable(),
    },
  }),
);

export type ISlot = InferEntity<typeof Slot>;
