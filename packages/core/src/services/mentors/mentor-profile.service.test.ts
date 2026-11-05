import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LockMode,
  UniqueConstraintViolationException,
  type EntityManager,
  type IMentorProfile,
} from '@devmentor/db';
import { MentorProfileService, toOwnerDto, toPublicDto } from './mentor-profile.service';
import type { Session } from '../../http/auth';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../http/errors';
import type { EventBus } from '../../events/event-bus';

vi.mock('@devmentor/db', () => ({
  MentorProfile: 'MentorProfile', Slot: 'Slot',
  LockMode: { PESSIMISTIC_WRITE: 'write' },
  UniqueConstraintViolationException: class extends Error {
    constraint?: string;
  },
}));

const settings = { currency: 'PLN' as const, priceBounds: { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } } };
const now = new Date('2026-11-04T12:00:00Z');
function row() {
  return {
    id: 'profile-1', price25Cents: null as number | null, price50Cents: null as number | null,
    user: { id: 'owner', displayName: 'Ada Lovelace', avatarUrl: null, email: 'private@example.test' },
    slug: null as string | null,
    publicWorkUrl: 'https://example.test',
    bio: 'Experience',
    stackTags: ['react'],
    publishedAt: null as Date | null,
    initialPublishDueAt: null as Date | null,
    updatedAt: now,
  };
}

describe('MentorProfileService', () => {
  let profile: ReturnType<typeof row>;
  let session: Session | null;
  let flush: ReturnType<typeof vi.fn>;
  let emit: ReturnType<typeof vi.fn<EventBus['emit']>>;
  let findOne: ReturnType<typeof vi.fn>;
  let transactions: Array<{ findOne: typeof findOne; flush: typeof flush }>;
  let em: EntityManager;
  const service = () =>
    new MentorProfileService({
      em,
      session: Promise.resolve(session),
      clock: { now: () => now },
      eventBus: { emit }, platformSettingsService: { get: () => settings },
    });

  beforeEach(() => {
    profile = row();
    session = { userId: 'owner', roles: ['mentor'] };
    flush = vi.fn().mockResolvedValue(undefined);
    emit = vi.fn<EventBus['emit']>().mockResolvedValue(undefined);
    findOne = vi.fn(async (_entity, query) => ('slug' in query ? null : profile));
    transactions = [];
    em = {
      count: vi.fn().mockResolvedValue(0), find: vi.fn().mockResolvedValue([{ id: 'future', startsAt: new Date('2026-11-04T14:00:00Z') }, { id: 'near', startsAt: new Date('2026-11-04T13:59:59.999Z') }]),
      findOne,
      fork: vi.fn(() => ({
        transactional: vi.fn(async (fn) => {
          const child = { findOne, flush, count: vi.fn().mockResolvedValue(0) };
          transactions.push(child);
          return fn(child);
        }),
      })),
    } as unknown as EntityManager;
  });

  it('authorizes every owner method independently of routes', async () => {
    for (const current of [null, { userId: 'owner', roles: ['mentee'] } as Session]) {
      session = current;
      for (const call of [
        () => service().getMine(), () => service().updatePrices({ price25: '80', price50: '160' }),
        () => service().update({}),
        () => service().publish(),
        () => service().unpublish(),
      ]) {
        await expect(call()).rejects.toBeInstanceOf(current ? ForbiddenError : UnauthorizedError);
      }
    }
    expect(findOne).not.toHaveBeenCalled();
  });
  it('reads only the caller profile and reports absent profiles', async () => {
    expect((await service().getMine()).id).toBe(profile.id);
    expect(findOne).toHaveBeenCalledWith(
      'MentorProfile',
      { user: 'owner' },
      { populate: ['user'], refresh: true },
    );
    findOne.mockResolvedValue(null);
    await expect(service().getMine()).rejects.toBeInstanceOf(NotFoundError);
  });
  it('locks updates, allows incomplete drafts, strips protected keys and enforces shape', async () => {
    const result = await service().update({ stackTags: [] });
    expect(result.readiness.ready).toBe(false);
    expect(flush).toHaveBeenCalledOnce();
    expect(findOne).toHaveBeenCalledWith(
      'MentorProfile',
      { user: 'owner' },
      expect.objectContaining({ lockMode: LockMode.PESSIMISTIC_WRITE }),
    );
    await expect(service().update({ publicWorkUrl: 'javascript:x' })).rejects.toBeInstanceOf(ValidationError);
  });
  it('keeps a published page complete: an update that breaks the gate is refused unsaved', async () => {
    profile.publishedAt = now;
    profile.slug = 'ada-lovelace';
    const refused = service().update({ stackTags: [] });
    await expect(refused).rejects.toBeInstanceOf(ValidationError);
    await expect(refused).rejects.toMatchObject({ fieldErrors: { stackTags: ['Choose at least one stack tag.'] } });
    expect(flush).not.toHaveBeenCalled();
    // The real transaction discards its forked identity map; this fake shares one row.
    profile.stackTags = ['react'];
    expect((await service().update({ bio: 'Still complete' })).bio).toBe('Still complete');
  });
  it('stores each stack tag once and keeps tags an update leaves out', async () => {
    expect((await service().update({ stackTags: ['python', 'react', 'python'] })).stackTags).toEqual([
      'python',
      'react',
    ]);
    expect((await service().update({ bio: 'New experience' })).stackTags).toEqual(['python', 'react']);
  });
  it('projects exact audience keys and snapshots instant labels', () => {
    const entity = profile as unknown as IMentorProfile;
    expect(toPublicDto(entity)).not.toHaveProperty('prices'); expect(toOwnerDto(entity)).not.toHaveProperty('priceBounds');
    expect(Object.keys(toPublicDto(entity, settings)).sort()).toEqual(
      ['prices', 'slug', 'displayName', 'avatarUrl', 'publicWorkUrl', 'bio', 'stackTags'].sort(),
    );
    expect(Object.keys(toOwnerDto(entity, settings)).sort()).toEqual(
      [
        'prices', 'priceBounds', 'id',
        'slug',
        'displayName',
        'avatarUrl',
        'publicWorkUrl',
        'bio',
        'stackTags',
        'publishedAt',
        'initialPublishDueAt',
        'readiness',
      ].sort(),
    );
    profile.initialPublishDueAt = now;
    profile.publishedAt = now;
    expect(toOwnerDto(entity, settings)).toMatchObject({
      initialPublishDueAt: now.toISOString(),
      publishedAt: now.toISOString(),
    });
    toPublicDto(entity, settings).stackTags.push('python');
    expect(profile.stackTags).toEqual(['react']);
    const empty = {
      ...profile,
      slug: undefined,
      bio: undefined,
      publicWorkUrl: undefined,
      user: { ...profile.user, avatarUrl: 'https://example.test/avatar.png' },
    } as unknown as IMentorProfile;
    expect(toPublicDto(empty, settings)).toMatchObject({
      slug: null,
      bio: null,
      publicWorkUrl: null,
      avatarUrl: 'https://example.test/avatar.png',
    });
    expect(toOwnerDto(empty, settings)).toMatchObject({
      slug: null,
      bio: null,
      publicWorkUrl: null,
      avatarUrl: 'https://example.test/avatar.png',
    });
  });
  it('refuses incomplete publication with form-keyed readiness errors', async () => {
    profile.publicWorkUrl = '';
    await expect(service().publish()).rejects.toMatchObject({
      fieldErrors: { publicWorkUrl: ['Add a link to your public work.'] },
    });
    expect(flush).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
  it('publishes once; repeat publications preserve slug and timestamp', async () => {
    expect(await service().publish()).toMatchObject({ slug: 'ada-lovelace', publishedAt: now.toISOString() });
    profile.user.displayName = 'Renamed';
    expect(await service().publish()).toMatchObject({ slug: 'ada-lovelace' });
    expect(emit).toHaveBeenCalledExactlyOnceWith('mentors.profile.published', {
      mentorProfileId: profile.id,
      slug: 'ada-lovelace',
    });
    expect(flush).toHaveBeenCalledOnce();
  });
  it('unpublishes under the same lock and republishes the original slug', async () => {
    await service().publish();
    await service().unpublish();
    expect(profile.publishedAt).toBeNull();
    expect(profile.slug).toBe('ada-lovelace');
    profile.user.displayName = 'New name';
    expect((await service().publish()).slug).toBe('ada-lovelace');
    expect(transactions).toHaveLength(3);
  });
  it('requeries existing collisions in fresh outer transactions', async () => {
    findOne.mockImplementation(async (_entity, query) =>
      'slug' in query ? (query.slug === 'ada-lovelace' ? row() : null) : profile,
    );
    expect((await service().publish()).slug).toBe('ada-lovelace-2');
    expect(em.fork).toHaveBeenCalledTimes(2);
  });
  it('retries only the named slug constraint using discarded transaction state', async () => {
    const error = Object.assign(new UniqueConstraintViolationException(new Error('duplicate')), {
      constraint: 'mentor_profiles_slug_unique',
    });
    flush.mockImplementationOnce(async () => {
      profile = row();
      throw error;
    });
    expect((await service().publish()).slug).toBe('ada-lovelace-2');
    expect(em.fork).toHaveBeenCalledTimes(2);
    profile = row();
    flush.mockRejectedValueOnce(
      Object.assign(new UniqueConstraintViolationException(new Error('other')), { constraint: 'other' }),
    );
    await expect(service().publish()).rejects.toMatchObject({ constraint: 'other' });
    profile = row();
    flush.mockRejectedValueOnce(new Error('database down'));
    await expect(service().publish()).rejects.toThrow('database down');
  });
  it('bounds contention at 100 attempts', async () => {
    findOne.mockImplementation(async (_entity, query) => ('slug' in query ? row() : profile));
    await expect(service().publish()).rejects.toBeInstanceOf(ConflictError);
    expect(em.fork).toHaveBeenCalledTimes(100);
  });
  it('public reads need no session, require publication, and hide missing/unpublished pages', async () => {
    session = null;
    findOne.mockResolvedValue(profile);
    expect(await service().getPublicBySlug('ada')).toMatchObject({ displayName: 'Ada Lovelace', slots: [{ id: 'future', meetsLeadTime: true }, { id: 'near', meetsLeadTime: false }] });
    expect(findOne).toHaveBeenCalledWith(
      'MentorProfile',
      { slug: 'ada', publishedAt: { $ne: null } },
      { populate: ['user'], refresh: true },
    );
    findOne.mockResolvedValue(null);
    await expect(service().getPublicBySlug('private')).rejects.toBeInstanceOf(NotFoundError);
  });
  it('saves both inclusive-bound prices together under the owner lock', async () => {
    for (const [price25, price50] of [['80', '160'], ['600.00', '1200.00']]) {
      expect(await service().updatePrices({ price25: price25!, price50: price50! })).toMatchObject({ prices: { price25Cents: Number(price25) * 100, price50Cents: Number(price50) * 100, currency: 'PLN' } });
    }
    expect(profile.price25Cents).toBe(60000); expect(profile.price50Cents).toBe(120000);
    expect(findOne).toHaveBeenCalledWith('MentorProfile', { user: 'owner' }, expect.objectContaining({ lockMode: LockMode.PESSIMISTIC_WRITE }));
  });
  it('validates both before mutating either and names every breached bound', async () => {
    profile.price25Cents = 10000; profile.price50Cents = 20000;
    for (const input of [{ price25: '79.99', price50: '160' }, { price25: '600.01', price50: '160' }, { price25: '80', price50: '159.99' }, { price25: '80', price50: '1200.01' }, { price25: '0', price50: '0' }, { price25: '80.001', price50: '160' }]) {
      await expect(service().updatePrices(input)).rejects.toMatchObject({ status: 422 });
      expect(profile.price25Cents).toBe(10000); expect(profile.price50Cents).toBe(20000);
    }
    expect(flush).not.toHaveBeenCalled();
  });
  it('projects prices only when both exist and remain within current policy', () => {
    const entity = profile as unknown as IMentorProfile;
    expect(toPublicDto(entity)).not.toHaveProperty('prices'); expect(toOwnerDto(entity)).not.toHaveProperty('priceBounds');
    expect(toPublicDto(entity, settings).prices).toBeNull();
    profile.price25Cents = 8000; expect(toPublicDto(entity, settings).prices).toBeNull();
    profile.price50Cents = 16000;
    expect(toPublicDto(entity, settings).prices).toEqual({ price25Cents: 8000, price50Cents: 16000, currency: 'PLN' });
    expect(toOwnerDto(entity, settings).priceBounds).toEqual(settings.priceBounds);
    profile.price25Cents = 1; expect(toPublicDto(entity, settings).prices).toBeNull(); expect(toOwnerDto(entity, settings).prices).toBeNull();
    profile.price25Cents = 8000; profile.price50Cents = 1;
    expect(toPublicDto(entity, settings).prices).toBeNull(); expect(toOwnerDto(entity, settings).prices).toBeNull();
  });});



