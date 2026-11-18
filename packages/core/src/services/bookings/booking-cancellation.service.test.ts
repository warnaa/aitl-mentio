import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityManager } from '@devmentor/db';
import type { Session } from '../../http/auth';
import { MockPaymentGateway } from '../payments/adapters/mock-payment-gateway';
import { BookingCancellationService, isFreeCancellation, refundIdempotencyKey } from './booking-cancellation.service';

vi.mock('@devmentor/db', () => ({ Booking: 'Booking', MentorProfile: 'Profile', Slot: 'Slot', LockMode: { PESSIMISTIC_WRITE: 'write' } }));

type Row = Record<string, unknown> & { id: string };
const id = '11111111-1111-4111-8111-111111111111';
const menteeId = 'mentee-1';
const startsAt = new Date('2026-11-12T12:00:00Z');
const HOUR = 3_600_000;
let current: Date;
let session: Session | null;
let gateway: MockPaymentGateway;
let booking: Row;
const emit = vi.fn();
const warn = vi.fn();
const error = vi.fn();

function matches(row: Row, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, value]) => {
    const actual = key === 'mentee' ? (row.mentee as Row).id : row[key];
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      const op = value as Record<string, unknown>;
      if ('$in' in op) return (op.$in as unknown[]).includes(actual);
      if ('$lte' in op) return actual instanceof Date && actual.getTime() <= (op.$lte as Date).getTime();
    }
    return actual === value;
  });
}

function fakeEm(): EntityManager {
  const rows = () => (booking ? [booking] : []);
  const em = {
    fork: () => em,
    findOne: async (_entity: string, query: Record<string, unknown>) => rows().find(row => matches(row, query)) ?? null,
    findOneOrFail: async (entity: string, query: Record<string, unknown>) => {
      if (entity !== 'Booking') return { id: query.id };
      const row = rows().find(candidate => matches(candidate, query));
      if (!row) throw new Error('Missing row');
      return row;
    },
    find: async (_entity: string, query: Record<string, unknown>) => rows().filter(row => matches(row, query)),
    nativeUpdate: async (_entity: string, query: Record<string, unknown>, data: Record<string, unknown>) => {
      const hit = rows().filter(row => matches(row, query));
      for (const row of hit) Object.assign(row, data);
      return hit.length;
    },
    transactional: async (fn: (tx: unknown) => unknown) => fn(em),
    flush: async () => undefined,
  };
  return em as unknown as EntityManager;
}

const service = () => new BookingCancellationService({
  em: fakeEm(), session: Promise.resolve(session), clock: { now: () => new Date(current) },
  paymentGateway: gateway, eventBus: { emit }, logger: { warn, error },
});

beforeEach(() => {
  vi.clearAllMocks();
  current = new Date(startsAt.getTime() - 48 * HOUR);
  session = { userId: menteeId, roles: ['mentee'] };
  gateway = new MockPaymentGateway({ clock: { now: () => new Date(current) } });
  booking = {
    id, mentee: { id: menteeId }, mentorProfile: { id: 'profile' }, slot: { id: 'slot' },
    status: 'confirmed', startsAt, priceCents: 8000, amountPaidCents: 8000, stripePaymentIntentId: 'pi_1',
    cancelledAt: null, refundStatus: 'none', stripeRefundId: null, refundNextAttemptAt: null, updatedAt: current,
  };
});

describe('isFreeCancellation', () => {
  it('treats exactly 24 hours as free and one millisecond less as forfeited', () => {
    expect(isFreeCancellation(startsAt, new Date(startsAt.getTime() - 24 * HOUR))).toBe(true);
    expect(isFreeCancellation(startsAt, new Date(startsAt.getTime() - 24 * HOUR + 1))).toBe(false);
  });
});

describe('cancel', () => {
  it('cancels, refunds the paid amount once with the booking key, and tells the mentor', async () => {
    const result = await service().cancel(id, { expectRefund: true });
    expect(result.booking).toEqual({ id, status: 'cancelled', cancelledAt: current.toISOString(), refundStatus: 'refunded' });
    expect(booking).toMatchObject({ status: 'cancelled', refundStatus: 'refunded', stripeRefundId: expect.stringContaining('re_mock_'), refundNextAttemptAt: null });
    expect(await gateway.listRefunds('pi_1')).toEqual([expect.objectContaining({ amountCents: 8000, bookingId: id })]);
    expect(emit).toHaveBeenCalledWith('bookings.booking.cancelled', { bookingId: id });
    expect(refundIdempotencyKey(id)).toBe(`refund-${id}`);
  });

  it('cancels at exactly 24 hours with a refund, and inside the window without calling the provider', async () => {
    current = new Date(startsAt.getTime() - 24 * HOUR);
    expect((await service().cancel(id, { expectRefund: true })).booking.refundStatus).toBe('refunded');
    booking.status = 'confirmed'; booking.refundStatus = 'none'; booking.cancelledAt = null; booking.stripeRefundId = null;
    gateway = new MockPaymentGateway({ clock: { now: () => current } });
    const refund = vi.spyOn(gateway, 'refund');
    current = new Date(startsAt.getTime() - 24 * HOUR + 1);
    expect((await service().cancel(id, { expectRefund: false })).booking.refundStatus).toBe('none');
    expect(booking).toMatchObject({ status: 'cancelled', refundNextAttemptAt: null });
    expect(refund).not.toHaveBeenCalled();
  });

  it('refuses when the outcome the mentee saw differs from the server decision, without cancelling', async () => {
    await expect(service().cancel(id, { expectRefund: false })).rejects.toMatchObject({ status: 409, code: 'refund_window_changed' });
    current = new Date(startsAt.getTime() - HOUR);
    await expect(service().cancel(id, { expectRefund: true })).rejects.toMatchObject({ status: 409, code: 'refund_window_changed' });
    expect(booking.status).toBe('confirmed');
  });

  it('refuses a started session with the dispute route, and unpaid or expired bookings', async () => {
    current = startsAt;
    await expect(service().cancel(id, { expectRefund: false })).rejects.toMatchObject({ code: 'session_started', message: expect.stringContaining('quality dispute') });
    current = new Date(startsAt.getTime() - 48 * HOUR);
    for (const status of ['pending', 'expired']) {
      booking.status = status;
      await expect(service().cancel(id, { expectRefund: true })).rejects.toMatchObject({ status: 409, code: 'conflict' });
    }
  });

  it('hides foreign bookings, refuses other roles and invalid input', async () => {
    session = { userId: 'someone-else', roles: ['mentee'] };
    await expect(service().cancel(id, { expectRefund: true })).rejects.toMatchObject({ status: 404 });
    session = { userId: menteeId, roles: ['mentor'] };
    await expect(service().cancel(id, { expectRefund: true })).rejects.toMatchObject({ status: 403 });
    session = null;
    await expect(service().cancel(id, { expectRefund: true })).rejects.toMatchObject({ status: 401 });
    session = { userId: menteeId, roles: ['mentee'] };
    await expect(service().cancel('not-a-uuid', { expectRefund: true })).rejects.toMatchObject({ status: 422 });
    await expect(service().cancel(id, { expectRefund: 'yes' } as never)).rejects.toMatchObject({ status: 422 });
    expect(booking.status).toBe('confirmed');
  });

  it('answers a repeated request with the stored state and no second refund or event', async () => {
    await service().cancel(id, { expectRefund: true });
    const refund = vi.spyOn(gateway, 'refund');
    emit.mockClear();
    expect((await service().cancel(id, { expectRefund: true })).booking.refundStatus).toBe('refunded');
    expect(refund).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('fails closed before cancelling a free session when payments are not configured', async () => {
    vi.spyOn(gateway, 'assertReady').mockImplementation(() => { throw Object.assign(new Error('Payments are not configured'), { status: 503 }); });
    await expect(service().cancel(id, { expectRefund: true })).rejects.toMatchObject({ status: 503 });
    expect(booking.status).toBe('confirmed');
  });

  it('keeps the cancellation and records failed on a definitive decline', async () => {
    gateway.refundOutcomes.push('decline');
    expect((await service().cancel(id, { expectRefund: true })).booking.refundStatus).toBe('failed');
    expect(booking).toMatchObject({ status: 'cancelled', refundStatus: 'failed' });
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ reason: 'refund_declined:charge_disputed' }), 'bookings.refund.failed');
  });

  it('keeps an unknown outcome pending with a due time instead of failing', async () => {
    gateway.refundOutcomes.push('timeout');
    expect((await service().cancel(id, { expectRefund: true })).booking.refundStatus).toBe('pending');
    expect(booking.refundNextAttemptAt).toEqual(new Date(current.getTime() + 5 * 60_000));
  });

  it('adopts an existing refund (a manual R18 refund) instead of refunding again', async () => {
    gateway.addExternalRefund('pi_1', 8000);
    const refund = vi.spyOn(gateway, 'refund');
    expect((await service().cancel(id, { expectRefund: true })).booking.refundStatus).toBe('refunded');
    expect(refund).not.toHaveBeenCalled();
  });

  it('never tops up a partial refund and never refunds without payment evidence', async () => {
    gateway.addExternalRefund('pi_1', 3000);
    expect((await service().cancel(id, { expectRefund: true })).booking.refundStatus).toBe('failed');
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ reason: 'refund_partial' }), 'bookings.refund.failed');
    Object.assign(booking, { status: 'confirmed', refundStatus: 'none', cancelledAt: null, amountPaidCents: null });
    expect((await service().cancel(id, { expectRefund: true })).booking.refundStatus).toBe('failed');
    expect(await gateway.listRefunds('pi_1')).toHaveLength(1);
  });
});

describe('reconcileRefunds', () => {
  it('resolves a timed-out refund from evidence after the provider forgot the key, without a second refund', async () => {
    gateway.refundOutcomes.push('timeout_after_create');
    await service().cancel(id, { expectRefund: true });
    expect(booking.refundStatus).toBe('pending');
    gateway.forgetRefundKeys();
    const refund = vi.spyOn(gateway, 'refund');
    current = new Date(current.getTime() + 25 * HOUR);
    expect(await service().reconcileRefunds()).toEqual({ processed: 1, failed: 0 });
    expect(booking.refundStatus).toBe('refunded');
    expect(refund).not.toHaveBeenCalled();
    expect(await gateway.listRefunds('pi_1')).toHaveLength(1);
  });

  it('replays a refund that was never created, and follows a pending refund until it settles', async () => {
    gateway.refundOutcomes.push('timeout');
    await service().cancel(id, { expectRefund: true });
    gateway.refundOutcomes.push('pending');
    current = new Date(current.getTime() + 6 * 60_000);
    await service().reconcileRefunds();
    expect(booking).toMatchObject({ refundStatus: 'pending', stripeRefundId: expect.stringContaining('re_mock_') });
    gateway.settleRefund(booking.stripeRefundId as string, 'succeeded');
    current = new Date(current.getTime() + 6 * 60_000);
    await service().reconcileRefunds();
    expect(booking.refundStatus).toBe('refunded');
  });

  it('leaves items that are not due, and re-checks failed refunds so a manual refund clears them', async () => {
    gateway.refundOutcomes.push('decline');
    await service().cancel(id, { expectRefund: true });
    expect(await service().reconcileRefunds()).toEqual({ processed: 0, failed: 0 });
    const refund = vi.spyOn(gateway, 'refund');
    current = new Date(current.getTime() + 61 * 60_000);
    await service().reconcileRefunds();
    expect(booking.refundStatus).toBe('failed');
    gateway.addExternalRefund('pi_1', 8000);
    current = new Date(current.getTime() + 61 * 60_000);
    await service().reconcileRefunds();
    expect(booking.refundStatus).toBe('refunded');
    expect(refund).not.toHaveBeenCalled();
  });

  it('persists backoff when the provider is down and never regresses a refunded booking', async () => {
    gateway.refundOutcomes.push('timeout');
    await service().cancel(id, { expectRefund: true });
    vi.spyOn(gateway, 'listRefunds').mockRejectedValue(new Error('provider down'));
    current = new Date(current.getTime() + 6 * 60_000);
    expect(await service().reconcileRefunds()).toEqual({ processed: 1, failed: 0 });
    expect(booking).toMatchObject({ refundStatus: 'pending', refundNextAttemptAt: new Date(current.getTime() + 5 * 60_000) });
    booking.refundStatus = 'refunded'; booking.refundNextAttemptAt = current;
    expect(await service().reconcileRefunds()).toEqual({ processed: 0, failed: 0 });
    expect(booking.refundStatus).toBe('refunded');
    await expect(service().reconcileRefunds(0)).rejects.toMatchObject({ status: 422 });
  });
});
