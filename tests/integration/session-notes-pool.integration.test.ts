import { expect, inject, it } from 'vitest';
import { Booking, LockMode, MikroORM, SessionNote, entities } from '@devmentor/db';
import { EventBus, RateLimiter, SessionNoteService, createLogger } from '@devmentor/core';
import { confirmBooking } from './fixtures/notification';
import { withPaymentFixture } from './fixtures/payment';
import { integrationChildEnvironment } from './environment';

it('NOTES-009 saves and replays a sent note with one shared service and limiter pool connection', async () => {
  await withPaymentFixture('n-009', async f => {
    await confirmBooking(f);
    await f.em.nativeUpdate(Booking, { id: f.booking.id }, { writtenAnswer: 'Synthetic answer', writtenAnswerAt: new Date('2026-11-07T12:00:00Z') });
    const orm = await MikroORM.init({ entities, clientUrl: inject('integrationDatabaseUrl'), pool: { min: 0, max: 1 }, driverOptions: { connectionTimeoutMillis: 2_000, statement_timeout: 5_000 } });
    try {
      await orm.connect();
      expect(orm.config.get('pool').max).toBe(1);
      const clock = { now: () => new Date('2026-11-08T12:00:00Z') };
      const logger = createLogger();
      const eventBus = new EventBus({ logger });
      const events: object[] = [];
      eventBus.on('notes.note.sent', event => { events.push(event); });
      const service = new SessionNoteService({ em: orm.em.fork(), session: Promise.resolve({ userId: f.mentorId, roles: ['mentor'] }), clock,
        rateLimiter: new RateLimiter({ em: orm.em.fork(), clock, logger }), eventBus });
      const draft = await service.saveDraft(f.booking.id, { body: 'One connection remains sufficient.', expectedRevision: null });
      expect(draft).toMatchObject({ version: 1, revision: 1, status: 'draft' });
      const sent = await service.send(f.booking.id, { version: 1, revision: 1 });
      expect(await service.send(f.booking.id, { version: 1, revision: 1 })).toEqual(sent);
      expect(await f.em.fork().findOneOrFail(SessionNote, { booking: f.booking.id })).toMatchObject({ body: draft.body, status: 'awaiting_approval', revision: 1, sentAt: clock.now() });
      expect(events).toEqual([1, 2].map(() => ({ bookingId: f.booking.id, noteId: draft.id, version: 1 })));
    } finally { await orm.close(true); }
  });
});

it('NOTES-010 completes six competing create saves after all five app connections wait on an external booking lock', async () => {
  await withPaymentFixture('n-010', async f => {
    await confirmBooking(f);
    await f.em.nativeUpdate(Booking, { id: f.booking.id }, { writtenAnswer: 'Synthetic answer', writtenAnswerAt: new Date('2026-11-07T12:00:00Z') });
    expect(integrationChildEnvironment(inject('integrationDatabaseUrl')).DB_POOL_MAX).toBe('5');
    // f.em owns a physically separate fixture pool, not a fork of the app pool.
    let release!: () => void;
    const released = new Promise<void>(resolve => { release = resolve; });
    let locked!: (pid: number) => void;
    let lockFailed!: (reason: unknown) => void;
    const acquired = new Promise<number>((resolve, reject) => { locked = resolve; lockFailed = reject; });
    const blocker = f.em.fork().transactional(async em => {
      await em.execute("set local lock_timeout = '5s'");
      await em.findOneOrFail(Booking, { id: f.booking.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      const [row] = await em.execute<{ pid: number }[]>('select pg_backend_pid() as pid');
      locked(row!.pid);
      await released;
    });
    void blocker.catch(lockFailed);
    const acquisitionDeadline = setTimeout(() => lockFailed(new Error('Fixture booking lock acquisition timed out')), 10_000);
    let requests: Promise<number>[] = [];
    let responses = Promise.resolve<PromiseSettledResult<number>[]>([]);
    const controller = new AbortController();
    try {
      const pid = await acquired;
      clearTimeout(acquisitionDeadline);
      requests = Array.from({ length: 6 }, (_, index) => fetch(`${f.base}/api/notes/${f.booking.id}`, {
        method: 'PUT', headers: f.mentor, body: JSON.stringify({ body: `Contender ${index}`, expectedRevision: null }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
      }).then(async response => { await response.arrayBuffer(); return response.status; }));
      responses = Promise.allSettled(requests);
      // Include indirect transaction-id/tuple lock chains, all rooted at our holder.
      await expect.poll(async () => {
        const [row] = await f.em.execute<{ count: number }[]>(`with recursive blocked(pid) as (
          select a.pid from pg_stat_activity a where ? = any(pg_blocking_pids(a.pid))
          union select a.pid from pg_stat_activity a join blocked b on b.pid = any(pg_blocking_pids(a.pid))
        ) select count(*)::int as count from blocked`, [pid]);
        return row!.count;
      }, { timeout: 10_000 }).toBe(5);
      release();
      await blocker;
      const statuses = (await responses).map(result => {
        if (result.status === 'rejected') throw result.reason;
        return result.value;
      });
      expect(statuses.sort()).toEqual([200, 409, 409, 409, 409, 409]);
      expect(await f.em.fork().count(SessionNote, { booking: f.booking.id })).toBe(1);
      expect(await f.em.fork().findOneOrFail(SessionNote, { booking: f.booking.id })).toMatchObject({ version: 1, revision: 1, status: 'draft' });
    } finally {
      clearTimeout(acquisitionDeadline);
      release();
      controller.abort();
      await Promise.allSettled([blocker, responses]);
    }
  });
});
