import { notFound } from 'next/navigation';
import { NotFoundError, StackTags, withScope } from '@devmentor/core';
import { ErrorMessage } from '@devmentor/ui/backend';
import { MentorPageView } from '@devmentor/ui/components/mentors/MentorPageView';
export const dynamic = 'force-dynamic';
export default async function PublicMentorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let profile;
  try {
    profile = await withScope(({ mentorProfileService }) => mentorProfileService.getPublicBySlug(slug));
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    return (
      <main className="p-6">
        <ErrorMessage message="This mentor page is unavailable. Please try again later." />
      </main>
    );
  }
  return <MentorPageView profile={{ ...profile, stackTags: profile.stackTags.map(StackTags.labelOf) }} />;
}
