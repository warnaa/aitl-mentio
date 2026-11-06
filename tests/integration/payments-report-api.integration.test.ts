import { expect, it } from 'vitest';
import type { PaidSessionReport } from '@devmentor/core/services';
import { bookingPersona } from './fixtures/booking';
import { paymentEvent, postCheckout, postPaymentEvent, storedBooking, withPaymentFixture } from './fixtures/payment';

it('PAYMENTS-021 restricts the paid-session report to operators and exposes both views without double counting', async () => {
  await withPaymentFixture('021', async fixture => {
    const anonymous = await fetch(`${fixture.base}/api/payments/report`);
    const mentee = await fetch(`${fixture.base}/api/payments/report`, { headers: fixture.first });
    expect(anonymous.status).toBe(401);
    expect(mentee.status).toBe(403);
    const operator = await bookingPersona(fixture.base, 'mock-operator');
    const readReport = async () => {
      const response = await fetch(`${fixture.base}/api/payments/report`, { headers: operator });
      expect(response.status).toBe(200);
      return (await response.json()).data as PaidSessionReport;
    };
    expect(await readReport()).toMatchObject({ paidSessionCount: 0, timingSampleCount: 0, medianBookingToStartMinutes: null, bookingWeeks: [], sessionStartWeeks: [] });

    expect((await postCheckout(fixture)).status).toBe(200);
    const event = await paymentEvent(fixture, `evt_report_api_${fixture.booking.id}`);
    expect((await postPaymentEvent(fixture, event)).status).toBe(200);
    expect((await postPaymentEvent(fixture, event)).status).toBe(200);
    const booking = await storedBooking(fixture);
    const report = await readReport();
    expect(report).toMatchObject({ timezone: 'Europe/Warsaw', paidSessionCount: 1, timingSampleCount: 1 });
    expect(report.medianBookingToStartMinutes!).toBeCloseTo((booking.startsAt.getTime() - booking.bookedAt!.getTime()) / 60_000, 5);
    expect(report.bookingWeeks.reduce((sum, row) => sum + row.count, 0)).toBe(1);
    expect(report.sessionStartWeeks.reduce((sum, row) => sum + row.count, 0)).toBe(1);
    expect(report.sessionStartWeeks[0]!.week > report.bookingWeeks[0]!.week).toBe(true);
    expect(Object.keys(report).sort()).toEqual(['timezone', 'cohortStart', 'cohortEnd', 'paidSessionCount', 'timingSampleCount', 'medianBookingToStartMinutes', 'bookingWeeks', 'sessionStartWeeks'].sort());
    expect(JSON.stringify(report)).not.toContain(fixture.firstId);
    expect(JSON.stringify(report)).not.toContain(fixture.booking.id);
    expect(JSON.stringify(report)).not.toContain(booking.stripePaymentIntentId!);
  });
});
