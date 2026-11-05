import Link from 'next/link';
import { redirect } from 'next/navigation';
import { safeReturnTo } from '@devmentor/core';
import { AuthFeedback, Button } from '@devmentor/ui';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import { AccountPanel } from '../../../components/auth/AccountPanel';
import { currentSession, single } from '../../../lib/auth-page';
import { homeFor } from '../../../lib/session';
import {
  authPageHref,
  githubSignInHref,
  REGISTER_PATH,
  SIGN_IN_NOTICES,
  SIGN_IN_PATH,
  SIGN_IN_VERIFIED_NOTICE,
  signInNotice,
} from '../../../lib/sign-in';

// Reads the session cookie and, when one is present, the database.
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const backHome = (
  <Button asChild intent="neutral" appearance="ghost">
    <Link href="/">Back to home</Link>
  </Button>
);

/**
 * `/sign-in` (public), composed as the prototype's s12 and, for the verification link's
 * outcomes, s22. GitHub first, then email and password (D07). The routes' `?cancelled=1`
 * / `?error=` outcome is explained in an alert above the form. A failed verification
 * link (`?error=verification…`) gets the s22 recovery screen; `?verified=1` (an
 * already-confirmed link, which creates no session) the s22 heading above the form
 * (spec A10, A11). A visitor who already holds a live session is sent to their role home
 * instead (edge case 28).
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const session = await currentSession();
  if (session) {
    redirect(homeFor(session.roles));
  }

  const returnTo = single(query.returnTo);
  const error = single(query.error);
  if (error === 'verification' || error === 'verification-unavailable') {
    return (
      <AuthLayout
        title="Check your verification link"
        description="You can request another link using the same email address."
      >
        <div className="dm-auth-stack">
          <AuthFeedback
            state={error === 'verification' ? 'verification-invalid' : 'service-unavailable'}
            detail={SIGN_IN_NOTICES[error]}
          />
          <Button asChild>
            <Link href={REGISTER_PATH}>Request a new verification link</Link>
          </Button>
          <Button asChild intent="neutral" appearance="ghost">
            <Link href={SIGN_IN_PATH}>Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  const notice = signInNotice({ cancelled: single(query.cancelled), error });
  const verified = !notice && single(query.verified) === '1';
  const safeReturn = safeReturnTo(returnTo, '');
  const invitation = safeReturn.startsWith('/invitation/') ? safeReturn : null;

  return (
    <AccountPanel
      mode="sign-in"
      title={verified ? 'Your email is verified' : invitation ? 'Sign in to accept your invitation' : 'Welcome back'}
      description={
        verified
          ? SIGN_IN_VERIFIED_NOTICE
          : invitation
            ? 'After signing in, you will return to your mentor invitation.'
            : 'Sign in to see your sessions, written answers and private notes.'
      }
      footer={
        invitation ? (
          <Button asChild intent="neutral" appearance="ghost">
            <Link href={invitation}>Back to invitation</Link>
          </Button>
        ) : (
          backHome
        )
      }
      returnTo={returnTo}
      githubHref={githubSignInHref(returnTo)}
      switchHref={authPageHref(REGISTER_PATH, returnTo)}
      notice={notice ? <ErrorMessage message={notice} /> : verified ? <AuthFeedback state="verified" /> : undefined}
    />
  );
}
