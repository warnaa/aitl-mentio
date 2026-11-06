'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@devmentor/ui/components/button';
import { apiCall, ErrorMessage, LoadingMessage } from '@devmentor/ui/backend';

/** A retry recovers the server's existing attempt; the browser never supplies money fields. */
export function CheckoutAction({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function checkout() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await apiCall<{ bookingId: string; url: string; expiresAt: string }>(`/api/bookings/${encodeURIComponent(bookingId)}/checkout`, { method: 'POST', body: {} });
      if (result.ok) router.push(result.data.url);
      else setError(result.error.message);
    } catch {
      setError('Checkout could not be opened. Check your payment status before trying again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <div className="grid min-w-0 gap-3">
    {error && <ErrorMessage message={error} />}
    {busy && <LoadingMessage message="Opening secure checkout…" />}
    <div className="dm-form-actions"><Button type="button" disabled={busy} onClick={() => void checkout()}>Pay with Stripe</Button></div>
  </div>;
}
