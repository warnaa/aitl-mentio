import { beforeEach, expect, it, vi } from 'vitest';
import type { EntityManager } from '@devmentor/db';
import type { Session } from '../../http/auth';
import { PaymentService } from './payment.service';
import { MockPaymentGateway } from './adapters/mock-payment-gateway';
import type { CheckoutSession, PaymentEvent } from './payment-gateway.port';
import { CheckoutNotCreatedError } from './payment-gateway.port';

const { UniqueError } = vi.hoisted(() => ({ UniqueError: class extends Error { constraint = 'processed_webhook_events_event_id_unique'; } }));
vi.mock('@devmentor/db', () => ({ Booking: 'Booking', PaymentAttempt: 'Attempt', PaymentResolution: 'Resolution', ProcessedWebhookEvent: 'Event', MentorProfile: 'Profile', Slot: 'Slot', User: 'User', UniqueConstraintViolationException: UniqueError, LockMode: { PESSIMISTIC_WRITE: 'write' } }));
type Row = { id: string; [key: string]: unknown };
const id = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-11-06T12:00:00Z');
let current: Date;
let session: Session | null;
let gateway: MockPaymentGateway;
let booking: Row;
type Tables = Record<'Booking' | 'Profile' | 'Slot' | 'Attempt' | 'Event' | 'Resolution', Row[]>;
let tables: Tables;
const emit = vi.fn();
const flush = vi.fn();
function same(actual: unknown, expected: unknown): boolean {
  if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
  if (expected && typeof expected === 'object') {
    const query = expected as Record<string, unknown>;
    if ('$in' in query) return (query.$in as unknown[]).some(value => same(actual, value));
    if ('$ne' in query) return !same(actual, query.$ne);
    if ('$lte' in query) return (actual as Date).getTime() <= (query.$lte as Date).getTime();
    if ('$or' in query && !(query.$or as unknown[]).some(value => same(actual, value))) return false;
    return Object.entries(query).filter(([key]) => key !== '$or').every(([key, value]) => same((actual as Record<string, unknown>)[key], value));
  }
  if (actual && typeof actual === 'object' && 'id' in actual) return (actual as Row).id === expected;
  return actual === expected;
}
const findOne = vi.fn(async (entity: string, query: unknown): Promise<Row | null> => tables[entity as keyof Tables].find(row => same(row, query)) ?? null);
const find = vi.fn(async (entity: string, query: unknown): Promise<Row[]> => tables[entity as keyof Tables].filter(row => same(row, query)));
const persist = vi.fn((row: Row) => { const kind = row.__kind as string; if (!tables[kind as keyof Tables].includes(row)) tables[kind as keyof Tables].push(row); });
const em = {
  findOne, find,
  findOneOrFail: async (entity: string, query: unknown) => { const row = await findOne(entity, query); if (!row) throw new Error('Missing row'); return row; },
  fork: (): unknown => em,
  transactional: async <T>(fn: (value: unknown) => Promise<T>): Promise<T> => fn(em),
  create: (entity: string, values: Record<string, unknown>): Row => ({ id: crypto.randomUUID(), __kind: entity, ...values }),
  getReference: (_entity: string, userId: string) => ({ id: userId }),
  persist, flush,
  nativeUpdate: vi.fn(async (entity: string, query: unknown, values: Record<string, unknown>) => { for (const row of tables[entity as keyof Tables].filter(row => same(row, query))) Object.assign(row, values); return 1; }),
};
const clock = { now: () => current };
const service = () => new PaymentService({ em: em as unknown as EntityManager, session: Promise.resolve(session), clock, paymentGateway: gateway, env: { APP_URL: 'https://devmentor.example' }, eventBus: { emit } });
const attempt = () => tables.Attempt[0]!;
const evidence = (changes: Partial<CheckoutSession> = {}): CheckoutSession => ({ id: attempt().sessionId as string, bookingId: id, attemptId: attempt().id, amountCents: 8000, currency: 'pln', paymentIntentId: 'pi_paid', paid: true, status: 'complete', livemode: false, refundedCents: 0, url: null, ...changes });
const event = (changes: Partial<CheckoutSession> = {}, eventId = 'evt_paid'): PaymentEvent => {
  const provider = evidence(changes);
  vi.spyOn(gateway, 'retrieveCheckoutSession').mockResolvedValue(provider);
  return { id: eventId, type: 'checkout.session.completed', session: provider };
};
async function checkout() { return service().startCheckout(id); }

it('releases a definitely rejected creation but preserves an older ambiguous submission', async () => {
  vi.spyOn(gateway, 'createCheckoutSession').mockRejectedValueOnce(new CheckoutNotCreatedError('Provider rejected creation'));
  await expect(checkout()).rejects.toThrow('Provider rejected creation');
  expect(booking).toMatchObject({ status: 'expired', paymentPending: false });
  expect(attempt()).toMatchObject({ state: 'expired', submissionCount: 1, rejectedSubmissionCount: 1 });
});

it('does not release after a later definite rejection when an earlier call may have created a session', async () => {
  vi.spyOn(gateway, 'createCheckoutSession').mockRejectedValueOnce(new Error('response lost')).mockRejectedValueOnce(new CheckoutNotCreatedError('key now revoked'));
  await expect(checkout()).rejects.toThrow('response lost');
  await expect(checkout()).rejects.toThrow('key now revoked');
  expect(booking).toMatchObject({ status: 'pending', paymentPending: true });
  expect(attempt()).toMatchObject({ submissionCount: 2, rejectedSubmissionCount: 1 });
});

it.each(['session_attached', 'session_paid', 'review', 'booking_expired'])('does not submit when another transaction changed state before provider submission: %s', async change => {
  const lookup = findOne.getMockImplementation()!;
  let changed = false;
  findOne.mockImplementation(async (entity, query) => {
    if (!changed && entity === 'Booking' && tables.Attempt.length && attempt().submissionCount === 0) {
      changed = true;
      if (change.startsWith('session_')) attempt().sessionId = 'cs_concurrent';
      else if (change === 'review') attempt().state = 'review';
      else booking.status = 'expired';
    }
    return lookup(entity, query);
  });
  const create = vi.spyOn(gateway, 'createCheckoutSession');
  if (change === 'session_attached') vi.spyOn(gateway, 'retrieveCheckoutSession').mockImplementation(async () => evidence({ id: 'cs_concurrent', paid: false, status: 'open', url: 'https://provider.invalid/concurrent' }));
  if (change === 'session_paid') vi.spyOn(gateway, 'retrieveCheckoutSession').mockImplementation(async () => evidence({ id: 'cs_concurrent' }));
  try {
    if (change === 'session_attached') await expect(checkout()).resolves.toMatchObject({ url: 'https://provider.invalid/concurrent' });
    else await expect(checkout()).rejects.toMatchObject({ status: 409 });
    expect(create).not.toHaveBeenCalled();
  }
  finally { findOne.mockImplementation(lookup); }
});

it('retains occupancy if a rejected submission races an attached or terminal booking', async () => {
  vi.spyOn(gateway, 'createCheckoutSession').mockImplementationOnce(async () => {
    attempt().sessionId = 'cs_attached'; booking.status = 'confirmed';
    throw new CheckoutNotCreatedError('racing rejection');
  });
  await expect(checkout()).rejects.toThrow('racing rejection');
  expect(booking).toMatchObject({ status: 'confirmed', paymentPending: true });
});

beforeEach(() => {
  vi.clearAllMocks(); current = now; session = { userId: 'mentee', roles: ['mentee'] };
  gateway = new MockPaymentGateway({ clock });
  const profile = { id: 'mentorProfile', slug: 'mentor', user: { id: 'mentor', displayName: 'Mentor' } };
  const slot = { id: 'slot', mentorProfile: profile };
  booking = { id, mentee: { id: 'mentee', displayName: 'Mentee' }, mentorProfile: profile, slot, status: 'pending', lengthMinutes: 25, priceCents: 8000, currency: 'PLN', startsAt: new Date(now.getTime() + 120 * 60_000), expiresAt: new Date(now.getTime() + 30 * 60_000), paymentPending: false, paidAt: null, bookedAt: null, amountPaidCents: null, stripePaymentIntentId: null, stripeCheckoutSessionId: null, cancelledAt: null, refundStatus: 'none' };
  tables = { Booking: [booking], Profile: [profile], Slot: [slot], Attempt: [], Event: [], Resolution: [] };
  flush.mockResolvedValue(undefined); emit.mockResolvedValue(undefined);
});

it('requires a live mentee and validates input before any ownership or creation work', async () => {
  session = null; await expect(checkout()).rejects.toMatchObject({ status: 401 });
  session = { userId: 'mentor', roles: ['mentor'] }; await expect(checkout()).rejects.toMatchObject({ status: 403 });
  session = { userId: 'mentee', roles: ['mentee'] }; await expect(service().startCheckout('bad')).rejects.toMatchObject({ status: 422 });
  expect(findOne).not.toHaveBeenCalled();
  session = { userId: 'foreign', roles: ['mentee'] }; await expect(checkout()).rejects.toMatchObject({ status: 404 });
  expect(tables.Attempt).toHaveLength(0);
});

it('creates one fixed authoritative payment window and safely recovers the same URL on retry', async () => {
  const result = await checkout();
  expect(result).toMatchObject({ bookingId: id, url: expect.stringContaining('mockCheckout='), expiresAt: '2026-11-06T12:31:00.000Z' });
  expect(booking).toMatchObject({ paymentPending: true, status: 'pending', expiresAt: new Date('2026-11-06T12:31:00Z') });
  expect(attempt()).toMatchObject({ state: 'open', diagnosticCode: null });
  current = new Date(now.getTime() + 20_000);
  expect(await checkout()).toEqual(result); expect(tables.Attempt).toHaveLength(1);
  expect(findOne).toHaveBeenCalledWith('Profile', { id: 'mentorProfile' });
});

it('refuses expired holds, too-near payment windows and terminal bookings', async () => {
  booking.expiresAt = now; await expect(checkout()).rejects.toMatchObject({ status: 409 });
  booking.expiresAt = new Date(now.getTime() + 30 * 60_000); booking.startsAt = new Date(now.getTime() + 60 * 60_000);
  await expect(checkout()).rejects.toMatchObject({ status: 409 });
  booking.startsAt = new Date(now.getTime() + 61 * 60_000); await checkout();
  attempt().state = 'review'; await expect(checkout()).rejects.toMatchObject({ status: 409 });
  attempt().state = 'expired'; await expect(checkout()).rejects.toMatchObject({ status: 409 });
  booking.status = 'confirmed'; await expect(checkout()).rejects.toMatchObject({ status: 409 });
});

it('retains creating occupancy across a provider timeout and recovers a lost successful create', async () => {
  const original = gateway.createCheckoutSession.bind(gateway);
  const create = vi.spyOn(gateway, 'createCheckoutSession').mockImplementationOnce(async input => { await original(input); throw new Error('lost response'); });
  await expect(checkout()).rejects.toThrow('lost response');
  expect(attempt().state).toBe('creating'); expect(booking.paymentPending).toBe(true);
  await checkout(); expect(create).toHaveBeenCalledTimes(2); expect(attempt().state).toBe('open');
});

it('never releases ambiguous creation when its original creation parameters become stale', async () => {
  vi.spyOn(gateway, 'createCheckoutSession').mockRejectedValueOnce(new Error('unknown create outcome'));
  await expect(checkout()).rejects.toThrow('unknown create outcome');
  current = new Date(now.getTime() + 61_000);
  await expect(checkout()).rejects.toMatchObject({ status: 409 });
  expect(attempt()).toMatchObject({ state: 'review', diagnosticCode: 'ambiguous_creation', sessionId: null });
  expect(booking.paymentPending).toBe(true);
});

it('does not hand out an open URL whose provider amount or identity differs from the stored attempt', async () => {
  await checkout();
  for (const changes of [{ amountCents: 1 }, { currency: 'eur' }, { livemode: true }, { attemptId: 'foreign' }]) {
    attempt().state = 'open';
    vi.spyOn(gateway, 'retrieveCheckoutSession').mockResolvedValueOnce(evidence({ ...changes, status: 'open', paid: false, url: 'https://checkout.stripe.com/untrusted' }));
    await expect(checkout()).rejects.toMatchObject({ status: 409 }); expect(attempt().state).toBe('review');
  }
});

it('confirms once after durable commit and deduplicates both identical and distinct event IDs', async () => {
  await checkout();
  expect(await service().handleEvent(event())).toEqual({ outcome: 'confirmed' });
  expect(booking).toMatchObject({ status: 'confirmed', bookedAt: now, paidAt: now, stripePaymentIntentId: 'pi_paid', amountPaidCents: 8000, paymentPending: false });
  expect(emit).toHaveBeenCalledWith('bookings.booking.confirmed', { bookingId: id });
  expect(await service().handleEvent(event())).toEqual({ outcome: 'duplicate' });
  expect(await service().handleEvent(event({}, 'another-event'))).toEqual({ outcome: 'already_confirmed' });
  expect(tables.Event).toHaveLength(2); expect(emit).toHaveBeenCalledTimes(1);
});

it('quarantines mismatched payments, reused payment intents, unpaid completion and payment after session start', async () => {
  await checkout();
  expect(await service().handleEvent(event({ amountCents: 1 }))).toEqual({ outcome: 'review' });
  expect(booking.paymentPending).toBe(true); expect(booking.status).toBe('pending');
  expect(await service().handleEvent(event({}, 'later-correct'))).toEqual({ outcome: 'review' });
  attempt().state = 'open';
  expect(await service().handleEvent(event({ paid: false }, 'unpaid'))).toEqual({ outcome: 'review' });
  attempt().state = 'open'; current = booking.startsAt as Date;
  expect(await service().handleEvent(event({}, 'after-start'))).toEqual({ outcome: 'review' });
  current = now; attempt().state = 'open';
  tables.Booking.push({ id: 'other', stripePaymentIntentId: 'pi_paid' });
  expect(await service().handleEvent(event({}, 'reused-intent'))).toEqual({ outcome: 'review' });
  expect(emit).not.toHaveBeenCalled();
});

it('retains unconfirmed open sessions, releases only verified unpaid expiry and ignores stale terminal evidence', async () => {
  await checkout();
  expect(await service().handleEvent(event({ paid: false, status: 'open', paymentIntentId: null }, 'still-open'))).toEqual({ outcome: 'open' });
  expect(await service().handleEvent(event({ paid: false, status: 'expired', paymentIntentId: null }, 'expired'))).toEqual({ outcome: 'expired' });
  expect(booking).toMatchObject({ status: 'expired', paymentPending: false });
  expect(await service().handleEvent(event({}, 'late-paid'))).toEqual({ outcome: 'terminal' });
  expect(emit).not.toHaveBeenCalled();
});

it('records unknown verified sessions, ignores unsupported events and preserves retryable storage errors', async () => {
  await checkout();
  expect(await service().handleEvent({ id: 'unknown', type: 'other', session: null })).toEqual({ outcome: 'ignored' });
  expect(await service().handleEvent({ ...event(), session: null })).toEqual({ outcome: 'ignored' });
  expect(await service().handleEvent(event({ id: 'unknown', attemptId: crypto.randomUUID() }))).toEqual({ outcome: 'unknown_session' });
  expect(tables.Event[0]).toMatchObject({ booking: null, sessionId: 'unknown', outcome: 'unknown_session' });
  flush.mockRejectedValueOnce(new Error('database unavailable'));
  await expect(service().handleEvent(event({}, 'retry'))).rejects.toThrow('database unavailable');
  flush.mockRejectedValueOnce(new UniqueError('race'));
  expect(await service().handleEvent(event({}, 'unique'))).toEqual({ outcome: 'duplicate' });
  const unrelated = new UniqueError('unrelated'); unrelated.constraint = 'other_constraint'; flush.mockRejectedValueOnce(unrelated);
  await expect(service().handleEvent(event({}, 'other-unique'))).rejects.toThrow('unrelated');
});

it('reconciles bounded due attempts and backs off both successful and unavailable provider calls', async () => {
  await checkout(); current = new Date(now.getTime() + 32 * 60_000);
  expect(await service().reconcile()).toEqual({ processed: 1, failed: 0 });
  expect(booking.status).toBe('expired');
  booking.status = 'pending'; booking.paymentPending = true; attempt().state = 'open'; attempt().nextReconciliationAt = now;
  vi.spyOn(gateway, 'retrieveCheckoutSession').mockRejectedValueOnce(new Error('provider unavailable'));
  expect(await service().reconcile(1)).toEqual({ processed: 0, failed: 1 });
  expect(attempt().nextReconciliationAt).toEqual(new Date(current.getTime() + 5 * 60_000));
  await expect(service().reconcile(101)).rejects.toMatchObject({ status: 422 });
});

it('requires operator scope and verified evidence for an audited resolution', async () => {
  await checkout(); attempt().state = 'review';
  await expect(service().resolveReview(attempt().id, { action: 'confirm', reason: 'checked' })).rejects.toMatchObject({ status: 403 });
  session = { userId: 'operator', roles: ['operator'] };
  await expect(service().resolveReview('bad', { action: 'confirm', reason: 'checked' })).rejects.toMatchObject({ status: 422 });
  await expect(service().resolveReview(crypto.randomUUID(), { action: 'confirm', reason: 'checked' })).rejects.toMatchObject({ status: 404 });
  await expect(service().resolveReview(attempt().id, { action: 'confirm', reason: '' })).rejects.toMatchObject({ status: 422 });
  await expect(service().resolveReview(attempt().id, { action: 'confirm', reason: 'checked' })).rejects.toMatchObject({ status: 409 });
  vi.spyOn(gateway, 'retrieveCheckoutSession').mockResolvedValueOnce(evidence());
  expect(await service().resolveReview(attempt().id, { action: 'confirm', reason: 'Provider payment verified' })).toEqual({ status: 'confirmed' });
  expect(tables.Resolution).toHaveLength(1); expect(tables.Resolution[0]).toMatchObject({ action: 'confirm', actor: { id: 'operator' }, reason: 'Provider payment verified', paymentIntentId: 'pi_paid' });
  expect(emit).toHaveBeenCalledTimes(1);
});

it('recovers an ambiguous session using operator-supplied provider identity without trusting client money fields', async () => {
  const original = gateway.createCheckoutSession.bind(gateway);
  vi.spyOn(gateway, 'createCheckoutSession').mockImplementationOnce(async input => { await original(input); throw new Error('lost'); });
  await expect(checkout()).rejects.toThrow('lost'); current = new Date(now.getTime() + 61_000);
  await expect(checkout()).rejects.toMatchObject({ status: 409 }); session = { userId: 'operator', roles: ['operator'] };
  await expect(service().resolveReview(attempt().id, { action: 'release', reason: 'checked' })).rejects.toMatchObject({ status: 409 });
  const sessionId = `cs_mock_${attempt().id}`; await gateway.expireCheckoutSession(sessionId);
  expect(await service().resolveReview(attempt().id, { action: 'release', reason: 'Verified terminal unpaid', sessionId })).toEqual({ status: 'expired' });
  expect(booking.paymentPending).toBe(false); expect(attempt().sessionId).toBe(sessionId);
});

it('rejects partial refunds and changed identities; releases only a verified completed full refund', async () => {
  await checkout(); attempt().state = 'review'; session = { userId: 'operator', roles: ['operator'] };
  for (const changes of [{ refundedCents: 1 }, { bookingId: 'foreign', refundedCents: 8000 }]) {
    vi.spyOn(gateway, 'retrieveCheckoutSession').mockResolvedValueOnce(evidence(changes));
    await expect(service().resolveReview(attempt().id, { action: 'release', reason: 'check' })).rejects.toMatchObject({ status: 409 });
  }
  vi.spyOn(gateway, 'retrieveCheckoutSession').mockResolvedValueOnce(evidence({ refundedCents: 8000 }));
  expect(await service().resolveReview(attempt().id, { action: 'release', reason: 'Refund independently verified' })).toEqual({ status: 'expired' });
  expect(booking).toMatchObject({ status: 'expired', paymentPending: false }); expect(tables.Resolution).toHaveLength(1);
});

it('projects only participant-owned rows and operator-only bounded review cases, never provider secrets or URLs', async () => {
  expect(await service().listMine()).toEqual([expect.objectContaining({ id, mentorName: 'Mentor', menteeName: 'Mentee', paymentStatus: 'unpaid', paidAt: null, cancelledAt: null, refundStatus: 'none', freeCancellationUntil: new Date(now.getTime() + 120 * 60_000 - 24 * 3_600_000).toISOString() })]);
  await checkout();
  expect(await service().listMine()).toEqual([expect.objectContaining({ paymentStatus: 'open' })]);
  session = { userId: 'foreign', roles: ['mentee'] }; expect(await service().listMine()).toEqual([]);
  session = { userId: 'mentor', roles: ['mentor'] }; expect(await service().listMine('mentor')).toHaveLength(1);
  await expect(service().listMine()).rejects.toMatchObject({ status: 403 });
  await expect(service().listMine('operator' as 'mentor')).rejects.toMatchObject({ status: 422 });
  await expect(service().listReview()).rejects.toMatchObject({ status: 403 });
  session = { userId: 'operator', roles: ['operator'] };
  tables.Event.push({ id: 'unknown', eventId: 'unknown', type: 'checkout.session.completed', booking: null, outcome: 'unknown_session', receivedAt: now, sessionId: 'cs_unknown' });
  expect(await service().listReview()).toEqual([expect.objectContaining({ attemptId: attempt().id, bookingId: id, sessionId: attempt().sessionId }), expect.objectContaining({ attemptId: null, bookingId: null, sessionId: 'cs_unknown', reason: 'unknown_provider_session' })]);
  booking.expiresAt = null; booking.paidAt = now;
  session = { userId: 'mentee', roles: ['mentee'] }; expect(await service().listMine()).toEqual([expect.objectContaining({ expiresAt: null, paidAt: now.toISOString() })]);
});

it('rechecks disappearing or changed booking ownership after its initial scope lookup', async () => {
  findOne.mockResolvedValueOnce(booking).mockResolvedValueOnce(null);
  await expect(checkout()).rejects.toMatchObject({ status: 404 });
  findOne.mockResolvedValueOnce(booking).mockImplementationOnce(async () => { booking.mentee = { id: 'foreign' }; return booking; });
  await expect(checkout()).rejects.toMatchObject({ status: 404 });
});

it('fails readiness before creating an attempt or changing the original unpaid hold', async () => {
  vi.spyOn(gateway, 'assertReady').mockImplementationOnce(() => { throw new Error('missing credentials'); });
  await expect(checkout()).rejects.toThrow('missing credentials');
  expect(tables.Attempt).toHaveLength(0); expect(booking.paymentPending).toBe(false);
  expect(booking.expiresAt).toEqual(new Date(now.getTime() + 30 * 60_000));
});

it('reconciles payment already completed before a client retry without handing out a payable URL', async () => {
  const result = await checkout();
  await gateway.simulateCheckoutCompleted(attempt().sessionId as string);
  await expect(checkout()).rejects.toMatchObject({ status: 409 });
  expect(booking.status).toBe('confirmed'); expect(emit).toHaveBeenCalledTimes(1);
  expect(result.url).toContain('mockCheckout');
});

it('recovers an already-paid creation whose response was lost before local attachment', async () => {
  const original = gateway.createCheckoutSession.bind(gateway);
  vi.spyOn(gateway, 'createCheckoutSession').mockImplementationOnce(async input => {
    const created = await original(input); await gateway.simulateCheckoutCompleted(created.id); throw new Error('lost paid creation');
  });
  await expect(checkout()).rejects.toThrow('lost paid creation');
  await expect(checkout()).rejects.toMatchObject({ status: 409 });
  expect(booking.status).toBe('confirmed'); expect(emit).toHaveBeenCalledTimes(1);
});

it('keeps ambiguous review attempts reserved on repeated reconciliation without sliding the payment deadline', async () => {
  vi.spyOn(gateway, 'createCheckoutSession').mockRejectedValueOnce(new Error('unknown'));
  await expect(checkout()).rejects.toThrow('unknown'); current = new Date(now.getTime() + 61_000);
  expect(await service().reconcile()).toEqual({ processed: 1, failed: 0 });
  const expiry = attempt().expiresAt; current = new Date(now.getTime() + 10 * 60_000);
  expect(await service().reconcile()).toEqual({ processed: 1, failed: 0 });
  expect(attempt()).toMatchObject({ state: 'review', sessionId: null, expiresAt: expiry }); expect(booking.paymentPending).toBe(true);
});

it('quarantines unrelated signed sessions with empty metadata instead of querying an invalid UUID', async () => {
  await checkout();
  expect(await service().handleEvent(event({ id: 'cs_other_app', attemptId: '', bookingId: '' }))).toEqual({ outcome: 'unknown_session' });
  expect(findOne).toHaveBeenCalledWith('Attempt', { sessionId: 'cs_other_app' }, { populate: ['booking'] });
  expect(booking.status).toBe('pending');
});

it('uses current provider refund truth rather than a stale paid webhook snapshot', async () => {
  await checkout();
  const stale = event();
  vi.spyOn(gateway, 'retrieveCheckoutSession').mockResolvedValue(evidence({ refundedCents: 8000 }));
  expect(await service().handleEvent(stale)).toEqual({ outcome: 'review' });
  expect(booking).toMatchObject({ status: 'pending', paymentPending: true }); expect(emit).not.toHaveBeenCalled();
});

it('cannot override an already-used provider payment intent with an operator confirmation', async () => {
  await checkout(); attempt().state = 'review'; session = { userId: 'operator', roles: ['operator'] };
  tables.Booking.push({ id: 'other', stripePaymentIntentId: 'pi_paid' });
  vi.spyOn(gateway, 'retrieveCheckoutSession').mockResolvedValue(evidence());
  await expect(service().resolveReview(attempt().id, { action: 'confirm', reason: 'checked' })).rejects.toMatchObject({ status: 409 });
  expect(tables.Resolution).toHaveLength(0); expect(emit).not.toHaveBeenCalled();
});

it('lists failed and overdue cancellation refunds for the operator, but not a refund still settling', async () => {
  session = { userId: 'operator', roles: ['operator'] };
  Object.assign(booking, { status: 'cancelled', cancelledAt: new Date(now.getTime() - 30 * 60_000), refundStatus: 'pending', refundNextAttemptAt: now });
  expect(await service().listReview()).toEqual([]);
  booking.cancelledAt = new Date(now.getTime() - 61 * 60_000);
  expect(await service().listReview()).toEqual([expect.objectContaining({ attemptId: null, bookingId: id, sessionId: null, status: 'refund_pending', reason: 'refund_overdue' })]);
  booking.refundStatus = 'failed';
  expect(await service().listReview()).toEqual([expect.objectContaining({ bookingId: id, status: 'refund_failed', reason: 'refund_failed', nextReconciliationAt: now.toISOString() })]);
});
