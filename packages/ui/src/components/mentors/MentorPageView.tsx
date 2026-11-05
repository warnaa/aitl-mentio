import { CalendarDays, FileText, LockKeyhole, MessageSquare } from 'lucide-react';
import { TechnologyChips } from './TechnologyChips';
import { PublishedDays } from './PublishedDays';
import { LocalTime } from '../../time/LocalTime';
import { EmptyState } from '../../backend/feedback/EmptyState';
import type { ReadinessItem } from '../../backend/feedback/ReadinessChecklist';
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

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(word => word[0]).slice(0, 2).join('').toUpperCase();
/** Minor units in the stored currency; whole amounts drop the decimals. */
export const formatPrice = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

/**
 * The mentor page as the prototype's s1 screen, for the public `/m/<slug>` page and the
 * owner's preview. Visitors see prices and published times but no booking action (E03)
 * and never the mentor's setup checklist. `slots` left out means "not projected".
 */
export function MentorPageView({ profile }: { profile: MentorPageData }) {
  const ready = profile.offerReadiness?.ready ?? profile.offerReady;
  const eligible = profile.slots?.filter(slot => slot.meetsLeadTime);
  const firstParagraph = profile.bio?.split(/\n\s*\n/)[0];
  return <article className="dm-mentor-profile">
    <div className="dm-mentor-profile-layout">
      <header className="dm-mentor-profile-header">
        <div className="dm-mentor-profile-identity">
          <span className="dm-mentor-profile-avatar" aria-hidden="true">{initials(profile.displayName)}</span>
          <div>
            <p className="dm-mentor-profile-eyebrow">Developer mentor</p>
            <h1>{profile.displayName}</h1>
            {profile.stackTags.length > 0 && <p className="dm-mentor-profile-role">{profile.stackTags.join(' / ')}</p>}
          </div>
        </div>
        {firstParagraph && <p className="dm-mentor-profile-intro">{firstParagraph}</p>}
        <TechnologyChips stacks={profile.stackTags} />
      </header>

      <aside className="dm-mentor-profile-booking" aria-labelledby="mentor-sessions-title">
        <div className="dm-mentor-profile-booking-card">
          <div className="dm-mentor-profile-booking-intro">
            <p className="dm-mentor-profile-eyebrow">Sessions with {profile.displayName}</p>
            <h2 id="mentor-sessions-title">Session prices</h2>
            <p>Sessions take place in text and last 25 or 50 minutes.</p>
          </div>
          {profile.prices && <dl className="dm-mentor-profile-prices">
            <div><dt><strong>25 minutes</strong><span>A focused question</span></dt><dd>{formatPrice(profile.prices.price25Cents, profile.prices.currency)}</dd></div>
            <div><dt><strong>50 minutes</strong><span>More time for detail</span></dt><dd>{formatPrice(profile.prices.price50Cents, profile.prices.currency)}</dd></div>
          </dl>}
          {!ready ? <EmptyState title="Not bookable yet" description="This mentor is still preparing their offer. Check back once their setup is complete." />
            : eligible && (eligible.length
              ? <div className="dm-mentor-profile-availability"><p><CalendarDays aria-hidden="true" />Published availability</p><PublishedDays startsAt={eligible.map(slot => slot.startsAt)} /></div>
              : <EmptyState title="No times available right now" description="This mentor has no published times starting at least two hours from now. Check this page again later." />)}
          <ul className="dm-mentor-profile-included" aria-label="Included with your session">
            <li><MessageSquare aria-hidden="true" /><span>A conversation in text</span></li>
            <li><FileText aria-hidden="true" /><span>A written answer to keep</span></li>
            <li><LockKeyhole aria-hidden="true" /><span>A private session note</span></li>
          </ul>
        </div>
      </aside>

      <div className="dm-mentor-profile-content">
        {profile.publicWorkUrl && <section className="dm-mentor-profile-section" aria-labelledby="mentor-work-title">
          <h2 id="mentor-work-title">Public work</h2>
          <a className="dm-mentor-profile-link" href={profile.publicWorkUrl} target="_blank" rel="noopener noreferrer">View public work</a>
          <p className="dm-product-caption">Work link provided by the mentor.</p>
        </section>}
        {profile.bio && <section className="dm-mentor-profile-section" aria-labelledby="mentor-about-title">
          <h2 id="mentor-about-title">About me</h2>
          <p className="dm-mentor-profile-prose">{profile.bio}</p>
        </section>}
        {profile.slots !== undefined && <section className="dm-mentor-profile-section" aria-labelledby="mentor-times-title">
          <div className="dm-mentor-profile-section-heading">
            <h2 id="mentor-times-title">Available times</h2>
            <p>The next 50 published times are shown. Eligibility is checked when this page loads.</p>
          </div>
          {profile.slots.length ? <ul className="dm-mentor-profile-times">{profile.slots.map(slot => <li key={slot.id} data-eligible={slot.meetsLeadTime}>
            <LocalTime value={slot.startsAt} />
            <p>{slot.meetsLeadTime ? 'Meets the two-hour notice period.' : 'Unavailable: less than two hours before the start.'}</p>
          </li>)}</ul> : <p className="dm-mentor-profile-prose">No published times yet. Check back later.</p>}
        </section>}
      </div>
    </div>
  </article>;
}
