import {
  LockMode,
  MentorProfile,
  UniqueConstraintViolationException,
  type EntityManager,
  type IMentorProfile,
} from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { MAX_SLUG_ATTEMPTS, uniqueSlug } from '../../domain/slug';
import { requireRole, type Session } from '../../http/auth';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import {
  mentorProfileUpdateSchema,
  type MentorProfileUpdate,
} from '../../validators/mentors/mentor-profile-update.schema';
import { parseWith } from '../../http/body';
import { mentorPagePublishable } from './readiness';

/** Explicit audience allowlists: adding a private entity field cannot widen these. */
export function toPublicDto(profile: IMentorProfile) {
  return {
    slug: profile.slug ?? null,
    displayName: profile.user.displayName,
    avatarUrl: profile.user.avatarUrl ?? null,
    publicWorkUrl: profile.publicWorkUrl ?? null,
    bio: profile.bio ?? null,
    stackTags: [...profile.stackTags],
  };
}
export function toOwnerDto(profile: IMentorProfile) {
  return {
    id: profile.id,
    slug: profile.slug ?? null,
    displayName: profile.user.displayName,
    avatarUrl: profile.user.avatarUrl ?? null,
    publicWorkUrl: profile.publicWorkUrl ?? null,
    bio: profile.bio ?? null,
    stackTags: [...profile.stackTags],
    publishedAt: profile.publishedAt?.toISOString() ?? null,
    initialPublishDueAt: profile.initialPublishDueAt?.toISOString() ?? null,
    readiness: mentorPagePublishable.evaluate(profile),
  };
}
export type MentorPublicDto = ReturnType<typeof toPublicDto>;
export type MentorOwnerDto = ReturnType<typeof toOwnerDto>;

export interface MentorProfileServiceDeps {
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  eventBus: Pick<EventBus, 'emit'>;
}

export class MentorProfileService {
  constructor(private readonly deps: MentorProfileServiceDeps) {}

  private async ownerId(): Promise<string> {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    return requireRole(session, 'mentor').userId;
  }

  private async profile(em: EntityManager, userId: string, lock = false): Promise<IMentorProfile> {
    const profile = await em.findOne(
      MentorProfile,
      { user: userId },
      {
        populate: ['user'],
        refresh: true,
        ...(lock ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
      },
    );
    if (!profile) throw new NotFoundError('Mentor profile not found');
    return profile;
  }

  async getMine(): Promise<MentorOwnerDto> {
    return toOwnerDto(await this.profile(this.deps.em, await this.ownerId()));
  }

  async update(input: MentorProfileUpdate): Promise<MentorOwnerDto> {
    const userId = await this.ownerId();
    const data = parseWith(mentorProfileUpdateSchema, input);
    return this.deps.em.fork().transactional(async (em) => {
      const profile = await this.profile(em, userId, true);
      Object.assign(profile, data);
      if (data.stackTags) profile.stackTags = [...new Set(data.stackTags)];
      // A live page keeps meeting the gate it was published under; this rolls the change back.
      if (profile.publishedAt) {
        mentorPagePublishable.assert(profile, 'A published page needs every required field. Unpublish it first to remove one.');
      }
      profile.updatedAt = this.deps.clock.now();
      await em.flush();
      return toOwnerDto(profile);
    });
  }

  async publish(): Promise<MentorOwnerDto> {
    const userId = await this.ownerId();
    const occupied = new Set<string>();
    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
      let candidate: string | undefined;
      try {
        // Never reuse a rolled-back identity map or an enclosing failed transaction.
        const result = await this.deps.em.fork().transactional(async (em) => {
          const profile = await this.profile(em, userId, true);
          if (profile.publishedAt) return { dto: toOwnerDto(profile), changed: false };
          mentorPagePublishable.assert(profile);
          if (!profile.slug) {
            candidate = uniqueSlug(profile.user.displayName, occupied);
            const collision = await em.findOne(MentorProfile, { slug: candidate });
            if (collision) return { dto: toOwnerDto(profile), changed: false, collision: candidate };
            profile.slug = candidate;
          }
          profile.publishedAt = this.deps.clock.now();
          profile.updatedAt = profile.publishedAt;
          await em.flush();
          return { dto: toOwnerDto(profile), changed: true };
        });
        if (result.collision) {
          occupied.add(result.collision);
          continue;
        }
        if (result.changed) {
          await this.deps.eventBus.emit('mentors.profile.published', {
            mentorProfileId: result.dto.id,
            slug: result.dto.slug!,
          });
        }
        return result.dto;
      } catch (error) {
        if (
          !(error instanceof UniqueConstraintViolationException) ||
          (error as { constraint?: string }).constraint !== 'mentor_profiles_slug_unique'
        )
          throw error;
        occupied.add(candidate!);
      }
    }
    throw new ConflictError('A unique share link could not be reserved. Please try publishing again.');
  }

  async unpublish(): Promise<MentorOwnerDto> {
    const userId = await this.ownerId();
    return this.deps.em.fork().transactional(async (em) => {
      const profile = await this.profile(em, userId, true);
      profile.publishedAt = null;
      profile.updatedAt = this.deps.clock.now();
      await em.flush();
      return toOwnerDto(profile);
    });
  }

  async getPublicBySlug(slug: string): Promise<MentorPublicDto> {
    const profile = await this.deps.em.findOne(
      MentorProfile,
      {
        slug,
        publishedAt: { $ne: null },
      },
      { populate: ['user'], refresh: true },
    );
    if (!profile) throw new NotFoundError('Mentor page not found');
    return toPublicDto(profile);
  }
}
