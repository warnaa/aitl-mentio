'use client';

import { Button, Card, SessionIsTextNotice } from '@devmentor/ui';
import { EmptyState, ResourcePanel, useApiResource } from '@devmentor/ui/backend';
import { formatPrice } from '@devmentor/ui/components/mentors/MentorPageView';
import { LocalTime } from '@devmentor/ui/time';
import { CheckoutAction } from './CheckoutAction';

export interface ParticipantBooking {
  id: string;
  mentorName: string;
  menteeName: string;
  lengthMinutes: number;
  priceCents: number;
  currency: string;
  status: string;
  startsAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  paymentStatus: 'unpaid' | 'creating' | 'open' | 'confirmed' | 'expired' | 'review';
}

/** The authenticated API projection is authority, including after a Checkout return. */
export function BookingsPanel({ persona }: { persona: 'mentee' | 'mentor' }) {
  const resource = useApiResource<ParticipantBooking[]>(`/api/bookings?role=${persona}`);
  return <section aria-label="Your bookings" className="dm-product-stack">
    <div className="dm-product-row"><h2 className="dm-product-title">Your bookings</h2><Button type="button" intent="neutral" appearance="stroke" disabled={resource.loading} onClick={resource.reload}>Check payment status</Button></div>
    <ResourcePanel resource={resource}>{bookings => bookings.length === 0
      ? <EmptyState title="No sessions yet" description="Sessions you book will appear here, with their payment status and scheduled time." />
      : <div className="grid min-w-0 gap-6">{bookings.map(booking => <Card key={booking.id} className="dm-product-panel">
        <div className="dm-product-row"><h3 className="dm-product-title">Session with {persona === 'mentee' ? booking.mentorName : booking.menteeName}</h3><span className="dm-product-status" data-tone={booking.status === 'confirmed' ? 'success' : 'information'}>{booking.status === 'confirmed' ? 'Confirmed' : booking.status === 'expired' ? 'Expired' : booking.status === 'cancelled' ? 'Cancelled' : 'Pending'}</span></div>
        <p className="dm-product-copy">Starts: <LocalTime value={booking.startsAt} /></p>
        <p className="dm-product-muted">{booking.lengthMinutes}-minute text session</p>
        <p>{formatPrice(booking.priceCents, booking.currency)}</p>
        {booking.status === 'confirmed'
          ? <p role="status">Payment verified. Your session is confirmed.</p>
          : booking.paymentStatus === 'review'
            ? <p role="status">Your payment needs review. Contact support with booking reference <code>{booking.id}</code>. This session is not confirmed.</p>
            : booking.status === 'pending'
              ? <><p role="status">Waiting for payment confirmation. Returning from Checkout does not confirm a session.</p>{booking.expiresAt && <p className="dm-product-caption">Payment window: <LocalTime value={booking.expiresAt} />. The time stays reserved while payment is checked.</p>}{persona === 'mentee' && <CheckoutAction bookingId={booking.id} />}</>
              : <p>This reservation is no longer active. Choose an available time to book again.</p>}
      </Card>)}</div>}
    </ResourcePanel>
    <SessionIsTextNotice />
  </section>;
}
