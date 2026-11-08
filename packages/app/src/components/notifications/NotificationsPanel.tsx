'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@devmentor/ui';
import { apiCall, EmptyState, ResourcePanel, useApiResource } from '@devmentor/ui/backend';
import { LocalTime } from '@devmentor/ui/time';

export interface NotificationItem {
  id: string;
  kind: 'booking_confirmed' | 'answer_posted' | 'note_awaiting_approval' | 'note_approved' | 'note_declined';
  audience: 'mentee' | 'mentor';
  counterpartName: string;
  startsAt: string;
  lengthMinutes: number;
  readAt: string | null;
  createdAt: string;
  /** The booking's session screen. */
  sessionPath: string;
}

interface NotificationList {
  unreadCount: number;
  items: NotificationItem[];
}

function unreadLine(count: number) {
  return count === 0 ? 'No unread notifications.' : `You have ${count} unread notification${count === 1 ? '' : 's'}.`;
}

/**
 * The signed-in user's notifications, shared by both role homes. It sits above the sessions
 * panel, which carries the text-session notice (R03). The start shown is the slot's start
 * (D22). Marking read sends only ids the server itself listed; the server re-scopes them.
 */
export function NotificationsPanel() {
  const resource = useApiResource<NotificationList>('/api/notifications');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markAllRead(items: NotificationItem[]) {
    setBusy(true);
    setError(null);
    try {
      const result = await apiCall('/api/notifications', { method: 'POST', body: { ids: items.filter(item => item.readAt === null).map(item => item.id) } });
      if (result.ok) resource.reload();
      else setError(result.error.message);
    } catch {
      setError('Notifications could not be marked as read. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return <section aria-label="Notifications" className="dm-product-stack">
    <h2 className="dm-product-title">Notifications</h2>
    <ResourcePanel resource={resource}>{({ unreadCount, items }) => <>
      <div className="dm-product-row">
        <p role="status">{unreadLine(unreadCount)}</p>
        <Button type="button" intent="neutral" appearance="stroke" disabled={busy || unreadCount === 0} onClick={() => markAllRead(items)}>Mark all as read</Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {items.length === 0
        ? <EmptyState title="Nothing new" description="We tell you here, and by email, when a session is confirmed or its written answer arrives. Private note notifications appear here only." />
        : <ul className="grid min-w-0 gap-3">{items.map(item => <li key={item.id}><Card className="dm-product-panel" data-unread={item.readAt === null ? 'true' : undefined}>
          {item.kind === 'note_approved' || item.kind === 'note_declined' ? <>
            <p className="dm-product-copy">{item.readAt === null && <strong>New: </strong>}{item.counterpartName} {item.kind === 'note_approved' ? 'approved your private session note.' : 'asked for changes to your private session note.'}</p>
            <Link href={item.sessionPath}>Read the private session note</Link>
          </> : item.kind === 'note_awaiting_approval' ? <>
            <p className="dm-product-copy">{item.readAt === null && <strong>New: </strong>}{item.counterpartName} sent a private session note for your approval.</p>
            <Link href={item.sessionPath}>Read the private session note</Link>
          </> : item.kind === 'answer_posted' ? <>
            <p className="dm-product-copy">{item.readAt === null && <strong>New: </strong>}{item.counterpartName} posted the written answer for your session on <LocalTime value={item.startsAt} />.</p>
            <Link href={item.sessionPath}>Read the written answer</Link>
          </> : <>
            <p className="dm-product-copy">{item.readAt === null && <strong>New: </strong>}{item.audience === 'mentee'
              ? <>Your session with {item.counterpartName} is confirmed.</>
              : <>{item.counterpartName} booked a session with you.</>}</p>
            <p className="dm-product-muted">Starts <LocalTime value={item.startsAt} />, {item.lengthMinutes} minutes.</p>
          </>}
        </Card></li>)}</ul>}
    </>}
    </ResourcePanel>
  </section>;
}
