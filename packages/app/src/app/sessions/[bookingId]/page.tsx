import { notFound } from 'next/navigation';
import { NotFoundError, type NoteView } from '@devmentor/core';
import { SessionIsTextNotice, ShareRuleNotice } from '@devmentor/ui';
import { ErrorMessage } from '@devmentor/ui/backend';
import { requirePageSignedIn, withPageScope } from '../../../lib/session';
import { SessionRoom } from './SessionRoom';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `/sessions/<bookingId>`, the text session (prototype s7). A stranger, an unknown id and
 * a booking that is not confirmed all get the standard not-found page; the service decides.
 */
export default async function SessionPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  if (!UUID.test(bookingId)) notFound();
  const path = `/sessions/${bookingId}`;
  await requirePageSignedIn(path);
  let initial;
  try {
    initial = await withPageScope(path, async ({ textSessionService, sessionNoteService }) => {
      const session = await textSessionService.getForParticipant(bookingId);
      let note: NoteView | null = null;
      try {
        note = await sessionNoteService.getForParticipant(bookingId);
      } catch (error) {
        // Keep the readable session and offer the note panel's Retry after a transient failure.
        // A cancelled/foreign booking still follows the page's normal not-found path.
        if (error instanceof NotFoundError) throw error;
      }
      return { session, note };
    });
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    // The notices belong to every state of the session screen, the error state included.
    return (
      <div className="dm-product-stack">
        <ErrorMessage message="This session is unavailable. Please try again later." />
        <SessionIsTextNotice />
        <ShareRuleNotice />
      </div>
    );
  }
  return <SessionRoom initial={initial.session} initialNote={initial.note} />;
}
