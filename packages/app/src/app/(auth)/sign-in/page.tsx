import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthFeedback, Button } from '@devmentor/ui';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import { AccountPanel } from '../../../components/auth/AccountPanel';
import { currentSession, single } from '../../../lib/auth-page';
import { homeFor } from '../../../lib/session';
import {
  authPageHref,
  githubSignInHref,
  REGISTER_PATH,
  SIGN_IN_VERIFIED_NOTICE,
  signInNotice,
} from '../../../lib/sign-in';

// Reads the session cookie and, when one is present, the database.
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * `/sign-in` (public). GitHub first, then email and password (D07). The routes'
 * `?cancelled=1` / `?error=` outcome is explained in an alert above the form, and
 * `?verified=1` (an already-confirmed verification link) as a status. A visitor who
 * already holds a live session is sent to their role home instead (edge case 28).
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const session = await currentSession();
  if (session) {
    redirect(homeFor(session.roles));
  }

  const returnTo = single(query.returnTo);
  const notice = signInNotice({ cancelled: single(query.cancelled), error: single(query.error) });
  const verified = !notice && single(query.verified) === '1';

  return (
    <AuthLayout
      title="Sign in to DevMentor"
      description="Use your GitHub account, or the email address and password you registered with."
      footer={
        <Button asChild intent="neutral" appearance="ghost">
          <Link href="/">Back to home</Link>
        </Button>
      }
    >
      <AccountPanel
        mode="sign-in"
        returnTo={returnTo}
        githubHref={githubSignInHref(returnTo)}
        switchHref={authPageHref(REGISTER_PATH, returnTo)}
        notice={
          notice ? (
            <ErrorMessage message={notice} />
          ) : verified ? (
            <AuthFeedback state="verified" detail={SIGN_IN_VERIFIED_NOTICE} />
          ) : undefined
        }
      />
    </AuthLayout>
  );
}
