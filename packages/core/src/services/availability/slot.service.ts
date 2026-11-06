import { z } from 'zod';
import { Booking, LockMode, MentorProfile, Slot, UniqueConstraintViolationException, type EntityManager, type ISlot } from '@devmentor/db';
import { activeOccupancy } from '../bookings/occupancy';
import { requireRole, type Session } from '../../http/auth';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../http/errors';
import { parseWith } from '../../http/body';
import type { Clock } from '../../time/clock';
import type { EventBus } from '../../events/event-bus';
import { slotListSchema } from '../../validators/availability/slot-list.schema';
import { slotCreateSchema, type SlotCreate } from '../../validators/availability/slot-create.schema';

export function toSlotDto(slot: ISlot) {
  return { id: slot.id, startsAt: slot.startsAt.toISOString() };
}
export interface SlotServiceDeps {
  em: EntityManager;
  session: Promise<Session | null>;
  clock: Clock;
  eventBus: Pick<EventBus, 'emit'>;
}
export class SlotService {
  constructor(private readonly deps: SlotServiceDeps) {}

  private async ownerId() {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    return requireRole(session, 'mentor').userId;
  }

  async list(input: unknown = {}) {
    const userId = await this.ownerId();
    const { page, past } = parseWith(slotListSchema, input);
    const now = this.deps.clock.now();
    const query = { mentorProfile: { user: userId }, removedAt: null, startsAt: past ? { $lte: now } : { $gt: now } };
    const total = await this.deps.em.count(Slot, query);
    const pageCount = Math.max(1, Math.ceil(total / 25));
    const currentPage = Math.min(page, pageCount);
    const slots = await this.deps.em.find(Slot, query, { orderBy: { startsAt: past ? 'desc' : 'asc' }, limit: 25, offset: (currentPage - 1) * 25 });
    return { items: slots.map(toSlotDto), page: currentPage, pageCount };
  }

  async publish(input: SlotCreate) {
    const userId = await this.ownerId();
    const data = parseWith(slotCreateSchema, input);
    let result;
    try {
      result = await this.deps.em.fork().transactional(async em => {
        const profile = await em.findOne(MentorProfile, { user: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
        if (!profile) throw new NotFoundError('Mentor profile not found');
        const now = this.deps.clock.now();
        const startsAt = new Date(data.startsAt);
        if (startsAt <= now) throw new ValidationError('Choose a future start time.', { startsAt: ['Choose a future start time.'] });
        const slot = em.create(Slot, { mentorProfile: profile, startsAt, removedAt: null, createdAt: now, updatedAt: now });
        em.persist(slot);
        profile.lastPublishedAvailabilityAt = now;
        profile.updatedAt = now;
        await em.flush();
        return { dto: toSlotDto(slot), mentorProfileId: profile.id };
      });
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException && (error as { constraint?: string }).constraint === 'slots_active_mentor_start_unique') {
        throw new ConflictError('This start time is already published.');
      }
      throw error;
    }
    await this.deps.eventBus.emit('availability.slot.published', { mentorProfileId: result.mentorProfileId, slotId: result.dto.id, startsAt: result.dto.startsAt });
    return result.dto;
  }

  async remove(id: string) {
    const userId = await this.ownerId();
    parseWith(z.uuid(), id);
    return this.deps.em.fork().transactional(async em => {
      // The ownership join would lock both tables in planner order. Match booking's
      // explicit mentor -> slot order so a competing reservation cannot deadlock.
      const profile = await em.findOne(MentorProfile, { user: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
      if (!profile) throw new NotFoundError('Slot not found');
      const slot = await em.findOne(Slot, { id, mentorProfile: profile.id, removedAt: null }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
      if (!slot) throw new NotFoundError('Slot not found');
      const now = this.deps.clock.now();
      const occupant = await em.findOne(Booking, { slot: slot.id, ...activeOccupancy(now) });
      if (occupant) throw new ConflictError('A reserved time cannot be removed.');
      slot.removedAt = now;
      slot.updatedAt = slot.removedAt;
      await em.flush();
      return { id: slot.id };
    });
  }
}
