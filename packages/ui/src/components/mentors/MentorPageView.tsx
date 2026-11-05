import { TechnologyChips } from './TechnologyChips';
export interface MentorPageData {
  slug: string | null;
  displayName: string;
  avatarUrl: string | null;
  publicWorkUrl: string | null;
  bio: string | null;
  stackTags: string[];
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
    </article>
  );
}
