import { TechnologyChips } from './TechnologyChips';
import { LocalTime } from '../../time/LocalTime';
export interface MentorPageData {
  slug: string | null;
  displayName: string;
  avatarUrl: string | null;
  publicWorkUrl: string | null;
  bio: string | null;
  stackTags: string[];
  slots?: { id: string; startsAt: string; meetsLeadTime: boolean }[];
}
export function MentorPageView({ profile }: { profile: MentorPageData }) {
  return (
    <article className="mx-auto flex max-w-[65ch] flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-3xl font-medium">{profile.displayName}</h1>
        <p className="mt-2 text-muted-foreground">Developer mentor</p>
      </header>
      <TechnologyChips stacks={profile.stackTags} />
      <p className="whitespace-pre-wrap text-base leading-7">{profile.bio}</p>
      {profile.publicWorkUrl && (
        <a
          className="break-all underline"
          href={profile.publicWorkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          See public work
        </a>
      )}
      <section className="space-y-4" aria-label="Published times">
        <h2 className="text-xl font-medium">Availability</h2>
        {profile.slots?.length ? <ul className="space-y-4">{profile.slots.map(slot => <li key={slot.id}>
          <LocalTime value={slot.startsAt} />
          <p className="text-sm text-muted-foreground">{slot.meetsLeadTime ? 'Meets the two-hour notice period.' : 'Unavailable: less than two hours before the start.'}</p>
        </li>)}</ul> : <p>No published times yet. Check back later.</p>}
      </section>
    </article>
  );
}

