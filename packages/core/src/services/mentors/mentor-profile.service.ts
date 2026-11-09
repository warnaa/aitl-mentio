import {
  LockMode,
  Booking,
  MentorProfile,
  Slot,
  UniqueConstraintViolationException,
  type EntityManager,
  type IMentorProfile,
} from '@devmentor/db';
import type { EventBus } from '../../events/event-bus';
import { MAX_SLUG_ATTEMPTS, uniqueSlug } from '../../domain/slug';
import { requireRole, type Session } from '../../http/auth';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import {
  mentorProfileUpdateSchema,
  type MentorProfileUpdate,
} from '../../validators/mentors/mentor-profile-update.schema';
import { parseWith } from '../../http/body';
import { mentorOfferReady, mentorPagePublishable } from './readiness';
import { parseMajorAmount, withinBounds } from '../../money/money';
import type { PricePolicy } from '../operator/platform-settings.service';
import { mentorPricesUpdateSchema, type MentorPricesUpdate } from '../../validators/mentors/mentor-prices-update.schema';
import { activeOccupancy, MIN_LEAD_MINUTES, MINUTE_MS, overlappingInterval, viableLengths } from '../bookings/occupancy';

/** Explicit audience allowlists: adding a private entity field cannot widen these. */
function publicFields(profile: IMentorProfile) {
  return {
    slug: profile.slug ?? null, displayName: profile.user.displayName,
    avatarUrl: profile.user.avatarUrl ?? null, publicWorkUrl: profile.publicWorkUrl ?? null,
    bio: profile.bio ?? null, stackTags: [...profile.stackTags],
  };
}
function ownerFields(profile: IMentorProfile) {
  return { ...publicFields(profile), id: profile.id,
    publishedAt: profile.publishedAt?.toISOString() ?? null,
    initialPublishDueAt: profile.initialPublishDueAt?.toISOString() ?? null,
    readiness: mentorPagePublishable.evaluate(profile),
  };
}
function pricesDto(profile: IMentorProfile, settings: PricePolicy) {
  return profile.price25Cents != null && profile.price50Cents != null && withinBounds(profile.price25Cents, settings.priceBounds.p25) && withinBounds(profile.price50Cents, settings.priceBounds.p50)
    ? { price25Cents: profile.price25Cents, price50Cents: profile.price50Cents, currency: settings.currency }
    : null;
}
// Keep the existing one-argument projections source-compatible; HTTP reads always supply settings.
export function toPublicDto(profile: IMentorProfile): ReturnType<typeof publicFields>;
export function toPublicDto(profile: IMentorProfile, settings: PricePolicy): ReturnType<typeof publicFields> & { prices: ReturnType<typeof pricesDto> };
export function toPublicDto(profile: IMentorProfile, settings?: PricePolicy) {
  const fields = publicFields(profile);
  return settings ? { ...fields, prices: pricesDto(profile, settings) } : fields;
}
export function toOwnerDto(profile: IMentorProfile): ReturnType<typeof ownerFields>;
export function toOwnerDto(profile: IMentorProfile, settings: PricePolicy): ReturnType<typeof ownerFields> & { prices: ReturnType<typeof pricesDto>; priceBounds: PricePolicy['priceBounds'] };
export function toOwnerDto(profile: IMentorProfile, settings?: PricePolicy) {
  const fields = ownerFields(profile);
  return settings ? { ...fields, prices: pricesDto(profile, settings), priceBounds: settings.priceBounds } : fields;
}
export type MentorPublicDto = ReturnType<typeof toPublicDto> & { offerReady: boolean; offerReadiness: ReturnType<typeof mentorOfferReady.evaluate>; slots: { id: string; startsAt: string; meetsLeadTime: boolean; viableLengths: (25 | 50)[] }[] };
export type MentorOwnerDto = ReturnType<typeof toOwnerDto> & { offerReadiness: ReturnType<typeof mentorOfferReady.evaluate> };

/** At most this many flagged mentors are listed; `total` still counts all of them. */
export const OUT_OF_BOUNDS_LIMIT = 200;
export interface OutOfBoundsMentor {
  mentorProfileId: string;
  displayName: string;
  slug: string | null;
  published: boolean;
  price25Cents: number | null;
  price50Cents: number | null;
  breaches: ('price25' | 'price50')[];
}
export interface OutOfBoundsMentors { total: number; mentors: OutOfBoundsMentor[] }

export interface MentorProfileServiceDeps {
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  platformSettingsService: { get(): Promise<PricePolicy> };
  eventBus: Pick<EventBus, 'emit'>;
}

export class MentorProfileService {
  constructor(private readonly deps: MentorProfileServiceDeps) {}

  private async ownerId(): Promise<string> {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    return requireRole(session, 'mentor').userId;
  }

  /**
   * Operator only (E05-S02, R08): mentors whose stored price lies outside `settings`. Read-only —
   * their prices are never changed here; they are held to the bounds on their next save and
   * are not offer-ready until then. A mentor with no price yet is not flagged.
   */
  async listOutOfBounds(settings: PricePolicy): Promise<OutOfBoundsMentors> {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    requireRole(session, 'operator');
    const { p25, p50 } = settings.priceBounds;
    // SQL comparisons with NULL are not true, so unpriced mentors drop out on their own.
    const [rows, total] = await this.deps.em.findAndCount(
      MentorProfile,
      { $or: [
        { price25Cents: { $lt: p25.minCents } }, { price25Cents: { $gt: p25.maxCents } },
        { price50Cents: { $lt: p50.minCents } }, { price50Cents: { $gt: p50.maxCents } },
      ] },
      { populate: ['user'], orderBy: { user: { displayName: 'asc' }, id: 'asc' }, limit: OUT_OF_BOUNDS_LIMIT },
    );
    return {
      total,
      mentors: rows.map(profile => ({
        mentorProfileId: profile.id,
        displayName: profile.user.displayName,
        slug: profile.slug ?? null,
        published: !!profile.publishedAt,
        price25Cents: profile.price25Cents ?? null,
        price50Cents: profile.price50Cents ?? null,
        breaches: ([['price25', profile.price25Cents, p25], ['price50', profile.price50Cents, p50]] as const)
          .filter(([, cents, bounds]) => cents != null && !withinBounds(cents, bounds))
          .map(([key]) => key),
      })),
    };
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

  /**
   * Settings are read by each caller before it opens a transaction, so a settings read never waits
   * for a second pooled connection while the transaction holds the mentor's row lock.
   */
  private settings(): Promise<PricePolicy> {
    return this.deps.platformSettingsService.get();
  }

  private async ownerDto(em: EntityManager, profile: IMentorProfile, settings: PricePolicy): Promise<MentorOwnerDto> {
    const hasFutureSlots = await em.count(Slot, { mentorProfile: profile.id, removedAt: null, startsAt: { $gt: this.deps.clock.now() } }) > 0;
    return { ...toOwnerDto(profile, settings), offerReadiness: mentorOfferReady.evaluate({ ...profile, settings, hasFutureSlots }) };
  }

  async updatePrices(input: MentorPricesUpdate): Promise<MentorOwnerDto> {
    const userId = await this.ownerId();
    const data = parseWith(mentorPricesUpdateSchema, input);
    const settings = await this.settings();
    return this.deps.em.fork().transactional(async em => {
      const profile = await this.profile(em, userId, true);
      const fieldErrors: Record<string, string[]> = {};
      const cents: Partial<Record<'price25' | 'price50', number>> = {};
      for (const [key, raw, bounds] of [
        ['price25', data.price25, settings.priceBounds.p25],
        ['price50', data.price50, settings.priceBounds.p50],
      ] as const) {
        // An amount too large to store is out of bounds for that field, not a form-level error.
        let value: number | undefined;
        try { value = parseMajorAmount(raw); } catch { value = undefined; }
        if (value === undefined || !withinBounds(value, bounds)) fieldErrors[key] = [`Enter ${settings.currency} ${(bounds.minCents / 100).toFixed(2)}–${(bounds.maxCents / 100).toFixed(2)}.`];
        else cents[key] = value;
      }
      if (Object.keys(fieldErrors).length) throw new ValidationError('Prices must be within the platform bounds.', fieldErrors);
      profile.price25Cents = cents.price25!;
      profile.price50Cents = cents.price50!;
      profile.updatedAt = this.deps.clock.now();
      await em.flush();
      return this.ownerDto(em, profile, settings);
    });
  }
  async getMine(): Promise<MentorOwnerDto> {
    const profile = await this.profile(this.deps.em, await this.ownerId());
    return this.ownerDto(this.deps.em, profile, await this.settings());
  }

  async update(input: MentorProfileUpdate): Promise<MentorOwnerDto> {
    const userId = await this.ownerId();
    const data = parseWith(mentorProfileUpdateSchema, input);
    const settings = await this.settings();
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
      return this.ownerDto(em, profile, settings);
    });
  }

  async publish(): Promise<MentorOwnerDto> {
    const userId = await this.ownerId();
    const settings = await this.settings();
    const occupied = new Set<string>();
    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
      let candidate: string | undefined;
      try {
        // Never reuse a rolled-back identity map or an enclosing failed transaction.
        const result = await this.deps.em.fork().transactional(async (em) => {
          const profile = await this.profile(em, userId, true);
          if (profile.publishedAt) return { dto: await this.ownerDto(em, profile, settings), changed: false };
          mentorPagePublishable.assert(profile);
          if (!profile.slug) {
            candidate = uniqueSlug(profile.user.displayName, occupied);
            const collision = await em.findOne(MentorProfile, { slug: candidate });
            if (collision) return { dto: await this.ownerDto(em, profile, settings), changed: false, collision: candidate };
            profile.slug = candidate;
          }
          profile.publishedAt = this.deps.clock.now();
          profile.updatedAt = profile.publishedAt;
          await em.flush();
          return { dto: await this.ownerDto(em, profile, settings), changed: true };
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
    const settings = await this.settings();
    return this.deps.em.fork().transactional(async (em) => {
      const profile = await this.profile(em, userId, true);
      profile.publishedAt = null;
      profile.updatedAt = this.deps.clock.now();
      await em.flush();
      return this.ownerDto(em, profile, settings);
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
    const now = this.deps.clock.now();
    const slots = await this.deps.em.find(Slot, { mentorProfile: profile.id, removedAt: null, startsAt: { $gt: now } }, { orderBy: { startsAt: 'asc' }, limit: 50 });
    const settings = await this.settings();
    const offerReadiness = mentorOfferReady.evaluate({ ...profile, settings, hasFutureSlots: slots.length > 0 });
    const occupied = slots.length ? await this.deps.em.find(Booking, {
      mentorProfile: profile.id,
      $and: [activeOccupancy(now), { $or: slots.map(slot => overlappingInterval(slot.startsAt, 50)) }],
    }) : [];
    return { ...toPublicDto(profile, settings), offerReady: offerReadiness.ready, offerReadiness, slots: slots.map(slot => ({
      id: slot.id,
      startsAt: slot.startsAt.toISOString(),
      meetsLeadTime: slot.startsAt.getTime() >= now.getTime() + MIN_LEAD_MINUTES * MINUTE_MS,
      viableLengths: viableLengths(slot.startsAt, occupied),
    })) };
  }
}
