import { mentorListQuerySchema, StackTags, withScope, type MentorListItemDto } from '@devmentor/core';
import { EmptyState, ErrorMessage } from '@devmentor/ui/backend';
import { MentorCard } from '@devmentor/ui/components/mentors/MentorCard';
import { PublicPage } from '../../components/public/PublicPage';
import { MentorListFilter } from './MentorListFilter';
export const dynamic = 'force-dynamic';

/**
 * `/mentors`, the public mentor list (#39, R13): offer-ready mentors with a bookable time,
 * filtered by one stack tag and ordered by most recently published availability. There is no
 * search, score, rating or featured placement (R13, N02).
 */
export default async function MentorsPage({ searchParams }: { searchParams?: Promise<{ tag?: string | string[] }> }) {
  const raw = (await searchParams)?.tag;
  const query = mentorListQuerySchema.safeParse(raw === undefined ? {} : { tag: raw });
  const tag = query.success ? query.data.tag : undefined;
  let mentors: MentorListItemDto[] = [];
  if (query.success) {
    try {
      mentors = await withScope(({ mentorProfileService }) => mentorProfileService.listPublished(tag));
    } catch {
      return <PublicPage><ErrorMessage message="The mentor list is unavailable. Please try again later." /></PublicPage>;
    }
  }
  const empty = query.success
    ? <EmptyState title={tag ? `No ${StackTags.label(tag)} mentors have open times right now` : 'No mentors have open times right now'} description="Check back for new availability." />
    : <EmptyState tone="warning" title="We do not list that stack" description="Choose one of the stacks above." />;
  return (
    <PublicPage>
      <h1 className="sr-only">Mentor list</h1>
      <MentorListFilter options={StackTags.options} selected={tag ?? null} resultCount={mentors.length} empty={empty}>
        {mentors.map(mentor => (
          <MentorCard key={mentor.slug} name={mentor.displayName} introduction={mentor.bio} stacks={mentor.stackTags.map(StackTags.labelOf)}
            publicWorkUrl={mentor.publicWorkUrl} prices={mentor.prices} nextSlotStartsAt={mentor.nextSlotStartsAt} href={`/m/${mentor.slug}`} />
        ))}
      </MentorListFilter>
    </PublicPage>
  );
}
