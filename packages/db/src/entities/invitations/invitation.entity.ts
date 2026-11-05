import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { User } from '../auth/user.entity';

const p = defineEntity.properties;

/** Operator-created invitation. The bearer secret never enters persistence. */
export const Invitation = defineSingletonEntity('Invitation', () =>
  defineEntity({
    name: 'Invitation',
    tableName: 'invitations',
    properties: {
      ...baseProperties,
      email: p.string().length(255),
      tokenHash: p.string().length(64).unique(),
      stackTags: p
        .array()
        .check(
          "array_position(stack_tags, null) is null and stack_tags <@ array['typescript', 'react', 'python', 'ai-agents']::text[]",
        ),
      expiresAt: p.datetime(),
      acceptedAt: p.datetime().nullable().check('(accepted_at is null) = (accepted_by_id is null)'),
      acceptedBy: () => p.manyToOne(User).nullable().deleteRule('no action'),
      publishDueAt: p.datetime().nullable(),
      revokedAt: p.datetime().nullable(),
      batch: p.string().length(64).nullable(),
    },
    indexes: [
      {
        name: 'invitations_unresolved_email_unique',
        expression:
          'create unique index "invitations_unresolved_email_unique" on "invitations" ("email") where accepted_at is null and revoked_at is null',
      },
    ],
  }),
);

export type IInvitation = InferEntity<typeof Invitation>;
