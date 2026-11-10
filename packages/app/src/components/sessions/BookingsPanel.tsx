'use client';

import Link from 'next/link';
import { Button, Card, SessionIsTextNotice } from '@devmentor/ui';
import { EmptyState, ResourcePanel, useApiResource } from '@devmentor/ui/backend';
import { formatPrice } from '@devmentor/ui/components/mentors/MentorPageView';
import { LocalTime } from '@devmentor/ui/time';
import { CancelAction } from './CancelAction';
import { CheckoutAction } from './CheckoutAction';
import { splitSessions } from './split-sessions';

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
  cancelledAt: string | null;
  refundStatus: 'none' | 'pending' | 'refunded' | 'failed';
  freeCancellationUntil: string;
}

/** One line on what happened to the money of a cancelled session, phrased for each participant. */
function CancelledState({ booking, persona }: { booking: ParticipantBooking; persona: 'mentee' | 'mentor' }) {
  const refund = booking.refundStatus === 'refunded' ? 'Refunded in full.'
    : booking.refundStatus === 'pending' ? 'Refund in progress.'
      : booking.refundStatus === 'failed'
        ? persona === 'mentee' ? <>We could not refund automatically. DevMentor will refund you by hand; booking reference <code>{booking.id}</code>.</> : 'Refund being handled by DevMentor.'
        : 'Cancelled less than 24 hours before the start; no refund.';
  return <>
    {persona === 'mentor' && <p role="status">The mentee cancelled. This time is available to book again.</p>}
    <p role={persona === 'mentee' ? 'status' : undefined} className={persona === 'mentor' ? 'dm-product-muted' : undefined}>{refund}</p>
  </>;
}

function statusLabel(status: string) {
  return status === 'confirmed' ? 'Confirmed' : status === 'expired' ? 'Expired' : status === 'cancelled' ? 'Cancelled' : 'Pending';
}

function SessionCard({ booking, persona, returned, upcoming, onChanged }: { booking: ParticipantBooking; persona: 'mentee' | 'mentor'; returned: boolean; upcoming: boolean; onChanged: () => void }) {
  // Upcoming already means a future start by the panel's clock; the server re-checks on cancel.
  const cancellable = persona === 'mentee' && booking.status === 'confirmed' && upcoming;
  return <Card className="dm-product-panel" aria-current={returned ? 'true' : undefined}>
    <div className="dm-product-row"><h4 className="dm-product-title">Session with {persona === 'mentee' ? booking.mentorName : booking.menteeName}</h4><span className="dm-product-status" data-tone={booking.status === 'confirmed' ? 'success' : 'information'}>{statusLabel(booking.status)}</span></div>
    {returned && <p className="dm-product-caption">You returned from Checkout for this session. The status below comes from our records.</p>}
    <p className="dm-product-copy">Starts: <LocalTime value={booking.startsAt} /></p>
    <p className="dm-product-muted">{booking.lengthMinutes}-minute text session</p>
    <p>{formatPrice(booking.priceCents, booking.currency)}</p>
    {booking.status === 'confirmed'
      ? <><p role="status">Payment verified. Your session is confirmed.</p><div className="dm-form-actions">{cancellable && <CancelAction booking={booking} onCancelled={onChanged} />}<Link href={`/sessions/${booking.id}`} className="dm-product-title">Open text session</Link></div></>
      : booking.status === 'cancelled'
        ? <CancelledState booking={booking} persona={persona} />
      : booking.paymentStatus === 'review'
        ? <p role="status">Your payment needs review. Contact support with booking reference <code>{booking.id}</code>. This session is not confirmed.</p>
        : booking.status === 'pending'
          ? <><p role="status">Waiting for payment confirmation. Returning from Checkout does not confirm a session.</p>{booking.expiresAt && <p className="dm-product-caption">Payment window: <LocalTime value={booking.expiresAt} />. The time stays reserved while payment is checked.</p>}{persona === 'mentee' && <CheckoutAction bookingId={booking.id} />}</>
          : <p>This reservation is no longer active. Choose an available time to book again.</p>}
  </Card>;
}

function SessionSection({ id, title, empty, bookings, persona, returnedId, upcoming, onChanged }: { id: string; title: string; empty: string; bookings: ParticipantBooking[]; persona: 'mentee' | 'mentor'; returnedId?: string; upcoming: boolean; onChanged: () => void }) {
  return <section aria-labelledby={id} className="dm-product-stack">
    <h3 id={id} className="dm-product-title">{title}</h3>
    {bookings.length === 0
      ? <p className="dm-product-muted">{empty}</p>
      : <div className="grid min-w-0 gap-6">{bookings.map(booking => <SessionCard key={booking.id} booking={booking} persona={persona} returned={booking.id === returnedId} upcoming={upcoming} onChanged={onChanged} />)}</div>}
  </section>;
}

/**
 * The authenticated API projection is authority, including after a Checkout return.
 * Sessions are split into upcoming and past by the browser clock; `returnedId` marks the
 * booking a Checkout redirect named, without saying anything the stored status does not.
 */
export function BookingsPanel({ persona, returnedId }: { persona: 'mentee' | 'mentor'; returnedId?: string }) {
  const resource = useApiResource<ParticipantBooking[]>(`/api/bookings?role=${persona}`);
  return <section aria-label="Your bookings" className="dm-product-stack">
    <div className="dm-product-row"><h2 className="dm-product-title">Your bookings</h2><Button type="button" intent="neutral" appearance="stroke" disabled={resource.loading} onClick={resource.reload}>Check payment status</Button></div>
    <ResourcePanel resource={resource}>{bookings => {
      if (bookings.length === 0) return <EmptyState title="No sessions yet" description="Sessions you book will appear here, with their payment status and scheduled time." />;
      const { upcoming, past } = splitSessions(bookings, new Date());
      return <>
        <SessionSection id={`${persona}-upcoming-sessions`} title="Upcoming sessions" empty="No upcoming sessions." bookings={upcoming} persona={persona} returnedId={returnedId} upcoming onChanged={resource.reload} />
        <SessionSection id={`${persona}-past-sessions`} title="Past sessions" empty="No past sessions." bookings={past} persona={persona} returnedId={returnedId} upcoming={false} onChanged={resource.reload} />
      </>;
    }}
    </ResourcePanel>
    <SessionIsTextNotice />
  </section>;
}
