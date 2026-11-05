import { LockMode, MentorProfile, Slot, UniqueConstraintViolationException, type EntityManager, type ISlot } from '@devmentor/db';
import { requireRole, type Session } from '../../http/auth';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../http/errors';
import { parseWith } from '../../http/body';
import type { Clock } from '../../time/clock';
import type { EventBus } from '../../events/event-bus';
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

  async list() {
    const userId = await this.ownerId();
    const slots = await this.deps.em.find(Slot, { mentorProfile: { user: userId }, removedAt: null }, { orderBy: { startsAt: 'asc' } });
    return slots.map(toSlotDto);
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
    return this.deps.em.fork().transactional(async em => {
      const slot = await em.findOne(Slot, { id, mentorProfile: { user: userId }, removedAt: null }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
      if (!slot) throw new NotFoundError('Slot not found');
      slot.removedAt = this.deps.clock.now();
      slot.updatedAt = slot.removedAt;
      await em.flush();
      return { id: slot.id };
    });
  }
}
