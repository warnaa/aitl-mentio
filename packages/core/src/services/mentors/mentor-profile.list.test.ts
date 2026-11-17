import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityManager } from '@devmentor/db';
import { MentorProfileService } from './mentor-profile.service';
import { mentorListQuerySchema } from '../../validators/mentors/mentor-list-query.schema';

vi.mock('@devmentor/db', () => ({
  MentorProfile: 'MentorProfile', Slot: 'Slot', Booking: 'Booking',
  LockMode: { PESSIMISTIC_WRITE: 'write' },
  UniqueConstraintViolationException: class extends Error {},
}));

const settings = { currency: 'PLN' as const, priceBounds: { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } } };
const now = new Date('2026-11-04T12:00:00Z');
const at = (iso: string) => new Date(iso);

function mentor(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id, slug: id, publicWorkUrl: `https://example.test/${id}`, bio: `About ${id}`, stackTags: ['react'],
    publishedAt: now, price25Cents: 9000, price50Cents: 17000,
    user: { id: `user-${id}`, displayName: `Mentor ${id}`, avatarUrl: null, email: `${id}@private.test` },
    ...overrides,
  };
}
const slot = (profile: string, startsAt: string) => ({ id: `${profile}-${startsAt}`, mentorProfile: { id: profile }, startsAt: at(startsAt) });
const booking = (profile: string, startsAt: string, lengthMinutes: 25 | 50) => ({ mentorProfile: { id: profile }, startsAt: at(startsAt), lengthMinutes });

describe('MentorProfileService.listPublished', () => {
  let profiles: ReturnType<typeof mentor>[];
  let slots: ReturnType<typeof slot>[];
  let bookings: ReturnType<typeof booking>[];
  let find: ReturnType<typeof vi.fn>;
  const service = () => new MentorProfileService({
    em: { find } as unknown as EntityManager,
    session: Promise.resolve(null),
    clock: { now: () => now },
    eventBus: { emit: vi.fn() },
    platformSettingsService: { get: () => settings },
  });

  beforeEach(() => {
    profiles = [mentor('newest'), mentor('older')];
    slots = [slot('newest', '2026-11-05T09:00:00Z'), slot('older', '2026-11-06T09:00:00Z')];
    bookings = [];
    find = vi.fn(async (entity: string) => entity === 'MentorProfile' ? profiles : entity === 'Slot' ? slots : bookings);
  });

  it('lists offer-ready mentors with a bookable time in the query order, exposing only public fields', async () => {
    const list = await service().listPublished();
    expect(list).toEqual([
      { slug: 'newest', displayName: 'Mentor newest', avatarUrl: null, publicWorkUrl: 'https://example.test/newest', bio: 'About newest', stackTags: ['react'],
        prices: { price25Cents: 9000, price50Cents: 17000, currency: 'PLN' }, nextSlotStartsAt: '2026-11-05T09:00:00.000Z' },
      expect.objectContaining({ slug: 'older', nextSlotStartsAt: '2026-11-06T09:00:00.000Z' }),
    ]);
    expect(JSON.stringify(list)).not.toMatch(/private\.test|user-|"id"/);
  });

  it('asks the database for published mentors within the current price bounds, ordered by latest published availability', async () => {
    await service().listPublished();
    expect(find).toHaveBeenNthCalledWith(1, 'MentorProfile', {
      publishedAt: { $ne: null },
      price25Cents: { $gte: 8000, $lte: 60000 },
      price50Cents: { $gte: 16000, $lte: 120000 },
    }, { populate: ['user'], orderBy: [{ lastPublishedAvailabilityAt: 'desc nulls last' }, { slug: 'asc' }] });
    expect(find).toHaveBeenNthCalledWith(2, 'Slot', { mentorProfile: { $in: ['newest', 'older'] }, removedAt: null, startsAt: { $gte: at('2026-11-04T14:00:00Z') } }, { orderBy: { startsAt: 'asc' } });
    expect(find).toHaveBeenNthCalledWith(3, 'Booking', expect.objectContaining({
      mentorProfile: { $in: ['newest', 'older'] },
      $and: [expect.objectContaining({ $or: expect.any(Array) }), { startsAt: { $gt: at('2026-11-04T13:10:00Z') } }],
    }));
  });

  it('filters by one stack tag', async () => {
    await service().listPublished('python');
    expect(find.mock.calls[0]?.[1]).toMatchObject({ stackTags: { $contains: ['python'] } });
  });

  it('skips the slot and booking queries when no mentor qualifies', async () => {
    profiles = [];
    expect(await service().listPublished()).toEqual([]);
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('drops a published mentor whose page no longer meets the publishing gate', async () => {
    profiles = [mentor('newest', { bio: '  ' }), mentor('older')];
    expect((await service().listPublished()).map(item => item.slug)).toEqual(['older']);
  });

  it('drops a mentor without any bookable time', async () => {
    slots = [slot('older', '2026-11-06T09:00:00Z')];
    expect((await service().listPublished()).map(item => item.slug)).toEqual(['older']);
  });

  it('skips an occupied slot for the next time and drops a mentor whose every slot is taken', async () => {
    slots = [slot('newest', '2026-11-05T09:00:00Z'), slot('newest', '2026-11-05T11:00:00Z'), slot('older', '2026-11-06T09:00:00Z')];
    bookings = [booking('newest', '2026-11-05T08:40:00Z', 50), booking('older', '2026-11-06T09:00:00Z', 25)];
    expect(await service().listPublished()).toEqual([expect.objectContaining({ slug: 'newest', nextSlotStartsAt: '2026-11-05T11:00:00.000Z' })]);
  });

  it('keeps a slot that still fits the shorter session', async () => {
    bookings = [booking('newest', '2026-11-05T09:25:00Z', 25)];
    expect((await service().listPublished())[0]).toMatchObject({ slug: 'newest', nextSlotStartsAt: '2026-11-05T09:00:00.000Z' });
  });
});

describe('mentorListQuerySchema', () => {
  it('accepts no tag or one known tag and rejects anything else', () => {
    expect(mentorListQuerySchema.parse({})).toEqual({});
    expect(mentorListQuerySchema.parse({ tag: 'ai-agents' })).toEqual({ tag: 'ai-agents' });
    for (const input of [{ tag: 'rust' }, { tag: '' }, { tag: 'react', q: 'search' }]) expect(mentorListQuerySchema.safeParse(input).success).toBe(false);
  });
});
