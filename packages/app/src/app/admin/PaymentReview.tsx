'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button, Card } from '@devmentor/ui';
import { apiCall, EmptyState, ErrorMessage, ResourcePanel, useApiResource } from '@devmentor/ui/backend';
import { LocalTime } from '@devmentor/ui/time';

export interface PaymentReviewAttempt {
  attemptId: string | null;
  bookingId: string | null;
  sessionId: string | null;
  status: string;
  reason: string | null;
  createdAt: string;
  nextReconciliationAt: string;
}

function ResolutionForm({ attempt, onResolved }: { attempt: PaymentReviewAttempt; onResolved: () => void }) {
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'confirm' | 'release'>('confirm');
  const [sessionId, setSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  async function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim() || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await apiCall(`/api/payments/review/${encodeURIComponent(attempt.attemptId!)}`, { method: 'POST', body: { action, reason: reason.trim(), ...(sessionId.trim() ? { sessionId: sessionId.trim() } : {}) } });
      if (result.ok) onResolved();
      else setError(result.error.message);
    } catch {
      setError('The payment could not be checked. No resolution has been confirmed.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return <form onSubmit={resolve} aria-label={`Resolve payment for ${attempt.bookingId}`} className="grid min-w-0 gap-4">
    <label className="dm-field">Verified outcome<select className="dm-input" value={action} disabled={busy} onChange={event => setAction(event.target.value as 'confirm' | 'release')}><option value="confirm">Confirm a matching paid booking</option><option value="release">Release a verified unpaid or fully refunded booking</option></select></label>
    <label className="dm-field">Resolution reason<textarea className="dm-input" value={reason} required maxLength={500} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
    <label className="dm-field">Stripe Checkout reference (optional)<input className="dm-input" value={sessionId} maxLength={255} disabled={busy} onChange={event => setSessionId(event.target.value)} /><span className="dm-product-caption">For an interrupted Checkout creation, supply the matching session reference from Stripe. The server verifies the booking and payment details.</span></label>
    <p className="dm-product-caption">The server checks current provider evidence before changing the booking. This action does not issue a refund.</p>
    {error && <ErrorMessage message={error} />}
    <div className="dm-form-actions"><Button type="submit" disabled={busy || !reason.trim()}>{busy ? 'Checking provider evidence…' : 'Verify and record outcome'}</Button></div>
  </form>;
}

export function PaymentReview() {
  const resource = useApiResource<PaymentReviewAttempt[]>('/api/payments/review');
  const [resolved, setResolved] = useState(false);
  return <section className="dm-product-stack" aria-label="Payment reconciliation">
    <div className="dm-product-row"><h2 className="dm-product-title">Payments needing review</h2><Button type="button" intent="neutral" appearance="stroke" disabled={resource.loading} onClick={resource.reload}>Refresh payment review</Button></div>
    <p className="dm-product-muted">Unresolved payments keep the mentor time reserved. Check the provider evidence before recording an outcome.</p>
    {resolved && <p role="status">The verified outcome was recorded. The review list is being refreshed.</p>}
    <ResourcePanel resource={resource}>{attempts => attempts.length === 0
      ? <EmptyState title="No payments need review" description="Provider exceptions and overdue payment attempts will appear here." />
      : <div className="grid min-w-0 gap-6">{attempts.map((attempt, index) => <Card key={attempt.attemptId ?? `unknown-${index}`} className="dm-product-panel">
        <h3 className="dm-product-title">{attempt.bookingId ? <>Booking <code className="break-all">{attempt.bookingId}</code></> : 'Payment without a matching booking'}</h3>
        <p>Payment state: {attempt.status}</p><p>{attempt.reason ?? 'Provider reconciliation is overdue.'}</p>
        {attempt.sessionId && <p className="dm-product-caption">Stripe Checkout reference: <code className="break-all">{attempt.sessionId}</code></p>}
        <p className="dm-product-caption">Created: <LocalTime value={attempt.createdAt} /></p><p className="dm-product-caption">Next check: <LocalTime value={attempt.nextReconciliationAt} /></p>
        {attempt.attemptId ? <ResolutionForm attempt={attempt} onResolved={() => { setResolved(true); resource.reload(); }} />
          : attempt.status.startsWith('refund_')
            ? <p>The mentee cancelled this session in time and is owed a full refund. {attempt.status === 'refund_failed' ? 'Stripe refused the automatic refund: refund it by hand in Stripe and log it (R18).' : 'The automatic refund has not settled yet: check it in Stripe.'} The next check marks the booking refunded once Stripe shows the full refund.</p>
            : <p>This payment needs manual reconciliation in Stripe. No matching booking can be confirmed or released from this record.</p>}
      </Card>)}</div>}
    </ResourcePanel>
  </section>;
}
