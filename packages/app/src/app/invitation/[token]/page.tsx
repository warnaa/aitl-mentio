import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, CalendarDays, Mail } from 'lucide-react';
import { getEnv, NotFoundError, StackTags, withScope } from '@devmentor/core';
import { Badge, Button, Card } from '@devmentor/ui';
import { ErrorMessage } from '@devmentor/ui/backend';
import { TechnologyChips } from '@devmentor/ui/components/mentors/TechnologyChips';
import { LocalTime } from '@devmentor/ui/time';
import { getPageAccount, homeFor, signInRedirectPath } from '../../../lib/session';
import { SignOutButton } from '../../../components/auth/SignOutButton';
import { PublicPage } from '../../../components/public/PublicPage';
import { AcceptInvitation } from './AcceptInvitation';
export const dynamic = 'force-dynamic';

const ACCESS_NOTE = 'Mentor access is by invitation. Creating an account alone does not grant this role.';

/** The s26 card. A plain function, so the page's element tree carries its markup. */
function invitationCard(title: string, message: string, children?: ReactNode) {
  return (
    <Card className="dm-product-panel dm-invitation-card">
      <Mail aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {children}
    </Card>
  );
}

/**
 * `/invitation/<token>`, composed as the prototype's mentor invitation (s26). Expired,
 * used, revoked and unknown links share one state: `lookup` answers them alike so a
 * link reveals nothing about anyone else's invitation (spec A8).
 */
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const path = `/invitation/${encodeURIComponent(token)}`;
  const days = getEnv().MENTOR_PUBLISH_WINDOW_DAYS;
  let invitation = null;
  let card: ReactNode;
  try {
    invitation = await withScope(({ invitationService }) => invitationService.lookup(token));
  } catch (error) {
    card =
      error instanceof NotFoundError
        ? null
        : invitationCard('Invitations are unavailable', 'Invitations are unavailable. Please try again later.');
  }
  if (invitation) {
    const account = await getPageAccount();
    const matches = account?.user.email.trim().toLowerCase() === invitation.email;
    card = invitationCard(
      'You are invited to mentor',
      `Publish your page, set both session prices and add your first bookable time within ${days} days of accepting.`,
      <>
        <p className="dm-product-caption">
          Invitation for {invitation.email}. It expires <LocalTime value={invitation.expiresAt} />.
        </p>
        {invitation.stackTags.length > 0 && <TechnologyChips stacks={invitation.stackTags.map(StackTags.labelOf)} />}
        {!account ? (
          <>
            <p>Sign in or create a developer account, then return here to accept the invitation.</p>
            <Button asChild>
              <Link href={signInRedirectPath(path)}>
                Sign in to accept
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <p className="dm-product-caption">{ACCESS_NOTE}</p>
          </>
        ) : matches ? (
          <>
            <p className="dm-product-caption">Accepting as {account.user.email}</p>
            <AcceptInvitation token={token} />
            <p className="dm-product-caption">{ACCESS_NOTE} Accepting adds the mentor role to your existing account.</p>
          </>
        ) : (
          <>
            <ErrorMessage
              message={`This invitation belongs to a different email address. You are signed in as ${account.user.email}; sign out and sign in as ${invitation.email}.`}
            />
            <SignOutButton />
          </>
        )}
      </>,
    );
  } else if (card === null) {
    const account = await getPageAccount();
    const mentor = account?.session.roles.includes('mentor');
    card = invitationCard(
      'This invitation link cannot be used',
      'This invitation is not valid. It may have expired, been used already or been replaced. Ask the person who invited you for a new link.',
      <>
        <p>If you already accepted it, sign in to open your mentor workspace.</p>
        <Button asChild intent="neutral" appearance="stroke">
          {account ? (
            <Link href={mentor ? '/mentor' : homeFor(account.session.roles)}>
              {mentor ? 'Open mentor workspace' : 'Open my workspace'}
            </Link>
          ) : (
            <Link href="/sign-in">Sign in</Link>
          )}
        </Button>
      </>,
    );
  }
  return (
    <PublicPage>
      <div className="dm-invitation">
        <div className="dm-invitation-intro">
          <span className="dm-product-eyebrow">An invitation to mentor</span>
          <h1>Mentor developers through text sessions.</h1>
          <p>DevMentor sessions happen in text. You set your prices and choose when you are available.</p>
          <div className="dm-fact-chips" role="group" aria-label="Session format">
            <Badge variant="outline">25 or 50 minutes</Badge>
            <Badge variant="outline">Written answer included</Badge>
          </div>
          <div className="dm-invitation-detail">
            <CalendarDays aria-hidden="true" />
            <p>
              After accepting, publish your first bookable session within {days} days. Your mentor workspace shows the
              exact date.
            </p>
          </div>
        </div>
        {card}
      </div>
    </PublicPage>
  );
}
