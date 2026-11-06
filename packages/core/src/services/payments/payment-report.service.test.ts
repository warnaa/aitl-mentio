import { expect, it, vi } from 'vitest';
import type { EntityManager } from '@devmentor/db';
import type { Session } from '../../http/auth';
import { PaymentReportService } from './payment-report.service';

it('denies anonymous and nonoperator requests before querying payment data', async () => {
  const execute = vi.fn();
  for (const session of [null, { userId: 'mentee', roles: ['mentee'] }]) {
    const service = new PaymentReportService({ em: { getConnection: () => ({ execute }) } as unknown as EntityManager, session: Promise.resolve(session as Session | null), clock: { now: () => new Date() } });
    await expect(service.get()).rejects.toMatchObject({ status: session ? 403 : 401 });
  }
  expect(execute).not.toHaveBeenCalled();
});
it('queries one server-timed cohort and returns only aggregated payment information', async () => {
  const report = { timezone: 'Europe/Warsaw', cohortStart: '2026-08-17', cohortEnd: '2026-11-06', paidSessionCount: 0, timingSampleCount: 0, medianBookingToStartMinutes: null, bookingWeeks: [], sessionStartWeeks: [] };
  const execute = vi.fn().mockResolvedValue([{ report }]); const now = new Date('2026-11-06T12:00:00Z');
  const service = new PaymentReportService({ em: { getConnection: () => ({ execute }) } as unknown as EntityManager, session: Promise.resolve({ userId: 'operator', roles: ['operator'] }), clock: { now: () => now } });
  expect(await service.get()).toEqual(report);
  expect(execute).toHaveBeenCalledWith(expect.stringContaining("date_trunc('week', timezone('Europe/Warsaw'"), [now, now]);
  const sql = execute.mock.calls[0]![0] as string;
  expect(sql).toContain('percentile_cont(0.5)'); expect(sql).toContain('b.amount_paid_cents = b.price_cents');
  expect(sql).not.toContain('processed_webhook_events');
  expect(sql).not.toContain('display_name');
});
