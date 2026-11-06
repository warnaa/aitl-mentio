'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { apiCall, ErrorMessage, LoadingMessage } from '@devmentor/ui/backend';
import { Button } from '@devmentor/ui/components/button';
import { formatPrice } from '@devmentor/ui/components/mentors/MentorPageView';
import { LocalTime } from '@devmentor/ui/time';
import { CheckoutAction } from '../../../components/sessions/CheckoutAction';

export interface PickerSlot {
  id: string;
  startsAt: string;
  meetsLeadTime: boolean;
  viableLengths: (25 | 50)[];
}
export interface PendingBooking {
  id: string;
  priceCents: number;
  currency: string;
  lengthMinutes: number;
  startsAt: string;
  expiresAt: string;
}
export interface SlotPickerProps {
  slug: string;
  slots: PickerSlot[];
  prices: { price25Cents: number; price50Cents: number; currency: string };
  viewer: 'signed-out' | 'mentee' | 'other';
  initialSlotId: string;
  initialLength: 25 | 50;
}

/** A reservation workflow, with server authority and an explicit action after sign-in. */
export function SlotPicker({ slug, slots, prices, viewer, initialSlotId, initialLength }: SlotPickerProps) {
  const [slotId, setSlotId] = useState(() => slots.some(slot => slot.id === initialSlotId && slot.meetsLeadTime && slot.viableLengths.includes(initialLength)) ? initialSlotId : '');
  const [lengthMinutes, setLengthMinutes] = useState(initialLength);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [booking, setBooking] = useState<PendingBooking | null>(null);
  const inFlight = useRef(false);
  const selected = slots.find(slot => slot.id === slotId);
  const canReserve = !!selected && selected.meetsLeadTime && selected.viableLengths.includes(lengthMinutes);
  const returnTo = `/m/${encodeURIComponent(slug)}?${new URLSearchParams({ slot: slotId, length: String(lengthMinutes) })}`;
  const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  function chooseSlot(slot: PickerSlot) {
    setSlotId(slot.id);
    if (!slot.viableLengths.includes(lengthMinutes)) setLengthMinutes(slot.viableLengths[0]!);
    setError(null);
  }

  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReserve || viewer !== 'mentee' || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    setNeedsSignIn(false);
    try {
      const result = await apiCall<PendingBooking>('/api/bookings', { method: 'POST', body: { slotId, lengthMinutes } });
      if (result.ok) setBooking(result.data);
      else {
        setError(result.error.message);
        setNeedsSignIn(result.error.code === 'unauthorized');
      }
    } catch {
      setError('The reservation could not be checked. Try again to recover a pending hold.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return <section aria-label="Reserve a session" className="grid min-w-0 gap-4">
    <h3>Choose a time and duration</h3>
    <p className="dm-product-caption">Choose a start at least two hours ahead. Times are shown in your timezone. Availability is checked again when you reserve.</p>
    {booking ? <div role="status" className="grid min-w-0 gap-2">
      <h3>Pending reservation</h3>
      <p>This reservation is unpaid and is not confirmed.</p>
      <p>{booking.lengthMinutes} minutes: {formatPrice(booking.priceCents, booking.currency)}</p>
      <p>Starts: <LocalTime value={booking.startsAt} /></p>
      <p>Held until: <LocalTime value={booking.expiresAt} /></p>
      <p>Pay securely through Stripe Checkout. Your session is confirmed only after payment is verified.</p>
      <p className="dm-product-caption">Opening Checkout starts one 31-minute payment window. Your time stays reserved while the payment result is checked.</p>
      <CheckoutAction bookingId={booking.id} />
    </div> : <form aria-label="Reserve selected time" onSubmit={reserve} className="grid min-w-0 gap-4">
      <fieldset disabled={pending} className="grid min-w-0 gap-3">
        <legend className="mb-2 font-medium">Session start</legend>
        {slots.map(slot => <label key={slot.id} className="flex min-h-11 min-w-0 items-start gap-2">
          <input type="radio" name="slotId" value={slot.id} checked={slot.id === slotId}
            disabled={!slot.meetsLeadTime || slot.viableLengths.length === 0} onChange={() => chooseSlot(slot)} className="mt-1 shrink-0" />
          <span className="min-w-0 break-words"><LocalTime value={slot.startsAt} />
            {!slot.meetsLeadTime ? <span className="block dm-product-caption">Unavailable: less than two hours before the start.</span>
              : slot.viableLengths.length === 0 && <span className="block dm-product-caption">Unavailable: overlaps a reserved session.</span>}
          </span>
        </label>)}
      </fieldset>
      <fieldset disabled={pending} className="grid min-w-0 gap-2">
        <legend className="mb-2 font-medium">Session duration</legend>
        {([25, 50] as const).map(length => <label key={length} className="flex min-h-11 items-start gap-2">
          <input type="radio" name="lengthMinutes" value={length} checked={lengthMinutes === length}
            disabled={!!selected && !selected.viableLengths.includes(length)} onChange={() => setLengthMinutes(length)} className="mt-1 shrink-0" />
          <span>{length} minutes: {formatPrice(length === 25 ? prices.price25Cents : prices.price50Cents, prices.currency)}
            {selected && !selected.viableLengths.includes(length) && <span className="block dm-product-caption">Unavailable for this start time.</span>}
          </span>
        </label>)}
      </fieldset>
      <p className="dm-product-caption">A reservation holds this time for 30 minutes. It does not confirm a session or charge you.</p>
      {viewer === 'other' && <p>A mentee account is required to reserve a session.</p>}
      {error && <ErrorMessage message={error} action={needsSignIn && <a href={signInHref}>Sign in again with this selection</a>} />}
      {pending && <LoadingMessage message="Reserving this time…" />}
      <div className="dm-form-actions">
        {viewer === 'signed-out' && canReserve
          ? <Button asChild><a href={signInHref}>Sign in to reserve</a></Button>
          : <Button type="submit" disabled={!canReserve || viewer !== 'mentee' || pending}>{viewer === 'signed-out' ? 'Choose a time to sign in' : 'Reserve this time'}</Button>}
      </div>
    </form>}
  </section>;
}
