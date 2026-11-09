import { ArrowRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { LocalTime } from '../../time/LocalTime';
import { MentorIdentity } from './MentorProfileCard';
import { TechnologyChips } from './TechnologyChips';
import { formatPrice, initials } from './MentorPageView';

export interface MentorCardProps {
  name: string;
  /** Plain description (R04); clamped in the card, shown in full on the mentor page. */
  introduction: string | null;
  /** Display labels, not stored tag values. */
  stacks: string[];
  publicWorkUrl: string | null;
  prices: { price25Cents: number; price50Cents: number; currency: string };
  /** ISO instant of the next bookable time. */
  nextSlotStartsAt: string;
  /** The mentor page (`/m/<slug>`); the host owns routing. */
  href: string;
}

/**
 * One mentor in the public list (#39). It carries no rating, score or rank (R13, N02): a plain
 * description, a link to public work, prices and the next bookable time are the comparison.
 */
export function MentorCard({ name, introduction, stacks, publicWorkUrl, prices, nextSlotStartsAt, href }: MentorCardProps) {
  return <article className="dm-product-panel dm-mentor-card" aria-label={name}>
    <MentorIdentity name={name} headline={stacks.join(' / ')} initials={initials(name)} />
    {introduction && <p className="dm-product-copy dm-mentor-card-intro">{introduction}</p>}
    <TechnologyChips stacks={stacks} />
    <div className="dm-fact-chips" role="group" aria-label="Session prices">
      <Badge variant="outline">25 minutes: {formatPrice(prices.price25Cents, prices.currency)}</Badge>
      <Badge variant="outline">50 minutes: {formatPrice(prices.price50Cents, prices.currency)}</Badge>
    </div>
    <p className="dm-product-muted">Next open time: <LocalTime value={nextSlotStartsAt} /></p>
    <div className="dm-product-actions">
      {publicWorkUrl && <a className="dm-mentor-card-work" href={publicWorkUrl} rel="noopener noreferrer" target="_blank">Public work<span aria-hidden="true"> ↗</span></a>}
      <Button asChild intent="neutral" appearance="stroke"><a href={href}>View profile<ArrowRight aria-hidden="true" /></a></Button>
    </div>
  </article>;
}
