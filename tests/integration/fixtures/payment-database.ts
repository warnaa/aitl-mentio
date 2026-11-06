import { inject } from 'vitest';
import { pino } from 'pino';
import { Booking, entities, MentorProfile, MikroORM, PaymentAttempt, PaymentResolution, ProcessedWebhookEvent, Slot, User, type EntityManager, type IBooking } from '@devmentor/db';
import { EventBus } from '../../../packages/core/src/events/event-bus';
import type { Session } from '../../../packages/core/src/http/auth';
import { MockPaymentGateway } from '../../../packages/core/src/services/payments/adapters/mock-payment-gateway';
import type { CheckoutSession, CreateCheckoutSession } from '../../../packages/core/src/services/payments/payment-gateway.port';
import { PaymentService } from '../../../packages/core/src/services/payments/payment.service';

/** Controlled provider faults and authoritative evidence; the service and ORM stay real. */
export class ControlledPaymentGateway extends MockPaymentGateway {
  readonly requests: CreateCheckoutSession[] = [];
  loseNextCreationResponse = false;
  authoritativeSession: CheckoutSession | null = null;

  override async createCheckoutSession(input: CreateCheckoutSession) {
    this.requests.push({ ...input });
    const created = await super.createCheckoutSession(input);
    if (this.loseNextCreationResponse) {
      this.loseNextCreationResponse = false;
      throw new Error('Synthetic provider timeout after session creation');
    }
    return created;
  }

  override async retrieveCheckoutSession(id: string) {
    return this.authoritativeSession?.id === id ? { ...this.authoritativeSession } : super.retrieveCheckoutSession(id);
  }
}

export interface PaymentDatabaseFixture {
  em: EntityManager;
  booking: IBooking;
  menteeId: string;
  mentorId: string;
  operatorId: string;
  profileId: string;
  gateway: ControlledPaymentGateway;
  clock: { now(): Date };
  setNow(now: string | Date): void;
  confirmations: string[];
  service(session?: Session | null): PaymentService;
}

/** Uses the suite-owned ephemeral database, independent rows and an explicit clock. */
export async function withPaymentDatabaseFixture(caseId: string, run: (fixture: PaymentDatabaseFixture) => Promise<void>) {
  const orm = await MikroORM.init({ entities, clientUrl: inject('integrationDatabaseUrl') });
  await orm.connect();
  const em = orm.em.fork();
  const prefix = `payment-db-${caseId}-${process.pid}`;
  const emails = ['mentee', 'mentor', 'operator'].map(persona => `${prefix}-${persona}@devmentor.test`);
  let profileId: string | undefined;
  try {
    let now = new Date('2026-11-06T11:00:00.000Z');
    const clock = { now: () => new Date(now) };
    const mentee = em.create(User, { email: emails[0]!, displayName: 'Synthetic payment mentee', roles: ['mentee'] });
    const mentor = em.create(User, { email: emails[1]!, displayName: 'Synthetic payment mentor', roles: ['mentor'] });
    const operator = em.create(User, { email: emails[2]!, displayName: 'Synthetic payment operator', roles: ['operator'] });
    const profile = em.create(MentorProfile, { user: mentor, headline: 'Synthetic payment mentor', slug: prefix });
    const slot = em.create(Slot, { mentorProfile: profile, startsAt: new Date('2026-11-07T12:00:00.000Z') });
    const booking = em.create(Booking, { slot, mentee, mentorProfile: profile, lengthMinutes: 25, priceCents: 8000, currency: 'PLN', status: 'pending', startsAt: slot.startsAt, expiresAt: new Date(now.getTime() + 30 * 60_000) });
    em.persist([mentee, mentor, operator, profile, slot, booking]);
    await em.flush();
    profileId = profile.id;
    const gateway = new ControlledPaymentGateway({ clock });
    const confirmations: string[] = [];
    const bus = new EventBus({ logger: pino({ level: 'silent' }) });
    bus.on('bookings.booking.confirmed', ({ bookingId }) => { confirmations.push(bookingId); });
    const defaultSession: Session = { userId: mentee.id, roles: ['mentee'] };
    await run({
      em, booking, gateway, clock, confirmations, profileId,
      menteeId: mentee.id, mentorId: mentor.id, operatorId: operator.id,
      setNow: value => { now = new Date(value); },
      service: (session = defaultSession) => new PaymentService({ em: em.fork(), clock, paymentGateway: gateway, eventBus: bus, env: { APP_URL: 'https://payment-fixture.invalid' }, session: Promise.resolve(session) }),
    });
  } finally {
    try {
      if (profileId) {
        const bookings = await em.find(Booking, { mentorProfile: profileId });
        const bookingIds = bookings.map(booking => booking.id);
        const attempts = await em.find(PaymentAttempt, { booking: { $in: bookingIds } });
        const attemptIds = attempts.map(attempt => attempt.id);
        if (attemptIds.length) await em.nativeDelete(PaymentResolution, { attempt: { $in: attemptIds } });
        await em.nativeDelete(ProcessedWebhookEvent, { booking: { $in: bookingIds } });
        await em.nativeDelete(PaymentAttempt, { booking: { $in: bookingIds } });
        await em.nativeDelete(Booking, { mentorProfile: profileId });
        await em.nativeDelete(Slot, { mentorProfile: profileId });
        await em.nativeDelete(MentorProfile, { id: profileId });
      }
      await em.nativeDelete(User, { email: { $in: emails } });
    } finally {
      await orm.close();
    }
  }
}
