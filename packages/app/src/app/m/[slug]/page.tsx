import { notFound } from 'next/navigation';
import { NotFoundError, StackTags, withScope } from '@devmentor/core';
import { ErrorMessage } from '@devmentor/ui/backend';
import { MentorPageView } from '@devmentor/ui/components/mentors/MentorPageView';
import { PublicPage } from '../../../components/public/PublicPage';
export const dynamic = 'force-dynamic';

/** `/m/<slug>`, the public mentor page (prototype s1, with s2 when no time is bookable). */
export default async function PublicMentorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let profile;
  try {
    profile = await withScope(({ mentorProfileService }) => mentorProfileService.getPublicBySlug(slug));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    return (
      <PublicPage>
        <ErrorMessage message="This mentor page is unavailable. Please try again later." />
      </PublicPage>
    );
  }
  return (
    <PublicPage>
      <MentorPageView profile={{ ...profile, stackTags: profile.stackTags.map(StackTags.labelOf) }} />
    </PublicPage>
  );
}
