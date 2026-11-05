import { TechnologyChips } from './TechnologyChips';
import { LocalTime } from '../../time/LocalTime';
import { Badge } from '../ui/badge';
import { ReadinessChecklist, type ReadinessItem } from '../../backend/feedback/ReadinessChecklist';
export interface MentorPageData {
  slug: string | null;
  displayName: string;
  avatarUrl: string | null;
  publicWorkUrl: string | null;
  bio: string | null;
  stackTags: string[];
  slots?: { id: string; startsAt: string; meetsLeadTime: boolean }[];
  prices?: { price25Cents: number; price50Cents: number; currency: string } | null;
  offerReady?: boolean;
  offerReadiness?: { ready: boolean; items: ReadinessItem[] };
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
      <section className="space-y-4" aria-label="Session prices">
        <h2 className="text-xl font-medium">Session prices</h2>
        {profile.prices && <div className="flex flex-wrap gap-2">
          <Badge variant="outline">25 min: {profile.prices.currency} {(profile.prices.price25Cents / 100).toFixed(2)}</Badge>
          <Badge variant="outline">50 min: {profile.prices.currency} {(profile.prices.price50Cents / 100).toFixed(2)}</Badge>
        </div>}
        {!profile.offerReady && <p>Not bookable yet. This mentor is still preparing their offer.</p>}
        {profile.offerReadiness && <ReadinessChecklist title="Offer preparation" items={profile.offerReadiness.items} />}
        {profile.offerReady && <p>This mentor has published their profile, prices and availability.</p>}
      </section>
      <section className="space-y-4" aria-label="Published times">
        <h2 className="text-xl font-medium">Availability</h2>
        <p className="text-sm text-muted-foreground">The next 50 published times are shown. Eligibility is checked when this page loads.</p>
        {profile.slots?.length ? <ul className="space-y-4">{profile.slots.map(slot => <li key={slot.id}>
          <LocalTime value={slot.startsAt} />
          <p className="text-sm text-muted-foreground">{slot.meetsLeadTime ? 'Meets the two-hour notice period.' : 'Unavailable: less than two hours before the start.'}</p>
        </li>)}</ul> : <p>No published times yet. Check back later.</p>}
      </section>
    </article>
  );
}

