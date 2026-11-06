import { notFound } from 'next/navigation';
import { NotFoundError, StackTags, withScope } from '@devmentor/core';
import { ErrorMessage } from '@devmentor/ui/backend';
import { MentorPageView } from '@devmentor/ui/components/mentors/MentorPageView';
import { PublicPage } from '../../../components/public/PublicPage';
import { getPageSession } from '../../../lib/session';
import { SlotPicker } from './SlotPicker';
export const dynamic = 'force-dynamic';

/** `/m/<slug>`, the public mentor page (prototype s1, with s2 when no time is bookable). */
export default async function PublicMentorPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ slot?: string | string[]; length?: string | string[] }>;
}) {
  const { slug } = await params;
  let profile;
  let session;
  try {
    profile = await withScope(({ mentorProfileService }) => mentorProfileService.getPublicBySlug(slug));
    session = await getPageSession();
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    return (
      <PublicPage>
        <ErrorMessage message="This mentor page is unavailable. Please try again later." />
      </PublicPage>
    );
  }
  const selection = await searchParams;
  const initialSlotId = typeof selection?.slot === 'string' ? selection.slot : '';
  const initialLength = selection?.length === '50' ? 50 : 25;
  const viewer = session ? session.roles.includes('mentee') ? 'mentee' : 'other' : 'signed-out';
  return (
    <PublicPage>
      <MentorPageView profile={{ ...profile, stackTags: profile.stackTags.map(StackTags.labelOf) }}
        booking={profile.offerReady && profile.prices && <SlotPicker slug={slug} slots={profile.slots} prices={profile.prices}
          viewer={viewer} initialSlotId={initialSlotId} initialLength={initialLength} />} />
    </PublicPage>
  );
}
