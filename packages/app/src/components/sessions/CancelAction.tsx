'use client';

import { useRef, useState } from 'react';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger, Button,
} from '@devmentor/ui';
import { apiCall, ErrorMessage } from '@devmentor/ui/backend';
import { formatPrice } from '@devmentor/ui/components/mentors/MentorPageView';

export interface CancellableBooking {
  id: string;
  priceCents: number;
  currency: string;
  /** The last instant a cancellation is free (start minus 24 hours, inclusive). */
  freeCancellationUntil: string;
}

/** The outcome the browser expects; the server decides again and answers 409 when they differ. */
export function expectsRefund(booking: Pick<CancellableBooking, 'freeCancellationUntil'>, now: Date) {
  return now.getTime() <= Date.parse(booking.freeCancellationUntil);
}

/**
 * E03-S05: the mentee cancels a confirmed session. The dialog states the outcome — a full
 * refund or none — before the mentee confirms (R09), and sends that outcome so the server
 * can refuse a cancellation whose outcome changed while the dialog was open.
 */
export function CancelAction({ booking, onCancelled }: { booking: CancellableBooking; onCancelled: () => void }) {
  const [open, setOpen] = useState(false);
  const [refund, setRefund] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  function openChange(value: boolean) {
    if (busy) return;
    if (value) { setRefund(expectsRefund(booking, new Date())); setNotice(null); setError(null); setStarted(null); }
    setOpen(value);
  }

  async function cancel() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const result = await apiCall<{ booking: { refundStatus: string } }>(`/api/bookings/${encodeURIComponent(booking.id)}/cancel`, { method: 'POST', body: { expectRefund: refund } });
      if (result.ok) { setOpen(false); onCancelled(); return; }
      if (result.error.code === 'refund_window_changed') { setRefund(!refund); setNotice(result.error.message); }
      else if (result.error.code === 'session_started') setStarted(result.error.message);
      else setError(result.error.message);
    } catch {
      setError('The cancellation could not be sent. Check your connection and try again.');
    } finally {
      inFlight.current = false; setBusy(false);
    }
  }

  const price = formatPrice(booking.priceCents, booking.currency);
  return <AlertDialog open={open} onOpenChange={openChange}>
    <AlertDialogTrigger asChild><Button type="button" intent="neutral" appearance="stroke">Cancel session</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
      {started
        ? <p role="status">{started}</p>
        : <>
          {notice && <p role="status"><strong>{notice}</strong></p>}
          <AlertDialogDescription>{refund
            ? <>You are cancelling more than 24 hours before the start, so you get a full refund of {price} to your original payment method.</>
            : <>The session starts in less than 24 hours. If you cancel now, you will not get a refund (DevMentor&apos;s cancellation rule).</>}
          </AlertDialogDescription>
          <p className="dm-product-muted">The mentor&apos;s time becomes free for others.</p>
        </>}
      {error && <ErrorMessage message={error} />}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>{started ? 'Close' : 'Keep session'}</AlertDialogCancel>
        {!started && <Button type="button" intent={refund ? 'primary' : 'error'} disabled={busy} onClick={() => void cancel()}>
          {busy ? 'Cancelling…' : refund ? 'Cancel and refund' : 'Cancel without refund'}
        </Button>}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
