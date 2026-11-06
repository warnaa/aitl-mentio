import type { EntityManager } from '@devmentor/db';
import { requireRole, type Session } from '../../http/auth';
import { UnauthorizedError } from '../../http/errors';
import type { Clock } from '../../time/clock';

export interface PaidSessionReport {
  timezone: string;
  cohortStart: string;
  cohortEnd: string;
  paidSessionCount: number;
  timingSampleCount: number;
  medianBookingToStartMinutes: number | null;
  bookingWeeks: { week: string; count: number }[];
  sessionStartWeeks: { week: string; count: number }[];
}

/** One snapshot, one row per recorded payment, with two explicit weekly views. */
export class PaymentReportService {
  constructor(private readonly deps: { em: EntityManager; session: Promise<Session | null>; clock: Clock }) {}

  async get(): Promise<PaidSessionReport> {
    const session = await this.deps.session;
    if (!session) throw new UnauthorizedError();
    requireRole(session, 'operator');
    const now = this.deps.clock.now();
    const rows = await this.deps.em.getConnection().execute<{ report: PaidSessionReport }[]>(`
      with bounds as (
        select date_trunc('week', timezone('Europe/Warsaw', ?::timestamptz)) - interval '11 weeks' as local_start,
               ?::timestamptz as current_instant
      ), cohort as (
        select b.id, b.booked_at, b.starts_at
        from bookings b cross join bounds
        where b.paid_at is not null and b.booked_at is not null
          and b.stripe_payment_intent_id is not null and b.stripe_checkout_session_id is not null
          and b.amount_paid_cents = b.price_cents and b.price_cents > 0
          and b.booked_at >= (bounds.local_start at time zone 'Europe/Warsaw')
          and b.booked_at <= bounds.current_instant
      ), booking_weeks as (
        select to_char(date_trunc('week', timezone('Europe/Warsaw', booked_at)), 'YYYY-MM-DD') as week, count(*) as count
        from cohort group by 1
      ), start_weeks as (
        select to_char(date_trunc('week', timezone('Europe/Warsaw', starts_at)), 'YYYY-MM-DD') as week, count(*) as count
        from cohort group by 1
      )
      select json_build_object(
        'timezone', 'Europe/Warsaw', 'cohortStart', to_char(bounds.local_start, 'YYYY-MM-DD'),
        'cohortEnd', bounds.current_instant,
        'paidSessionCount', (select count(*) from cohort),
        'timingSampleCount', (select count(*) from cohort where starts_at >= booked_at),
        'medianBookingToStartMinutes', (select percentile_cont(0.5) within group (order by extract(epoch from (starts_at - booked_at)) / 60) from cohort where starts_at >= booked_at),
        'bookingWeeks', (select coalesce(json_agg(json_build_object('week', week, 'count', count) order by week), '[]'::json) from booking_weeks),
        'sessionStartWeeks', (select coalesce(json_agg(json_build_object('week', week, 'count', count) order by week), '[]'::json) from start_weeks)
      ) as report from bounds
    `, [now, now]);
    return rows[0]!.report;
  }
}
