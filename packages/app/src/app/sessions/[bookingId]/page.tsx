import { notFound } from 'next/navigation';
import { NotFoundError } from '@devmentor/core';
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
    initial = await withPageScope(path, ({ textSessionService }) => textSessionService.getForParticipant(bookingId));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    return <ErrorMessage message="This session is unavailable. Please try again later." />;
  }
  return <SessionRoom initial={initial} />;
}
