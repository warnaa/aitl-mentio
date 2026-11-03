import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@devmentor/ui';
import { AuthLayout } from '@devmentor/ui/backend';
import { AccountPanel } from '../../../components/auth/AccountPanel';
import { currentSession, single } from '../../../lib/auth-page';
import { homeFor } from '../../../lib/session';
import { authPageHref, githubSignInHref, SIGN_IN_PATH } from '../../../lib/sign-in';

// Reads the session cookie and, when one is present, the database.
export const dynamic = 'force-dynamic';

/**
 * `/register` (public, E01 #32). GitHub first, then email registration; a new account
 * is a `mentee` and signs in once the emailed link is opened. Being or becoming a mentor
 * is not offered here (R07). A visitor with a live session is sent to their role home.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const session = await currentSession();
  if (session) {
    redirect(homeFor(session.roles));
  }
  const returnTo = single(query.returnTo);

  return (
    <AuthLayout
      title="Create your DevMentor account"
      description="Use your GitHub account, or register with your email address. We email you a link to confirm the address before you can sign in."
      footer={
        <Button asChild intent="neutral" appearance="ghost">
          <Link href="/">Back to home</Link>
        </Button>
      }
    >
      <AccountPanel
        mode="register"
        returnTo={returnTo}
        githubHref={githubSignInHref(returnTo)}
        switchHref={authPageHref(SIGN_IN_PATH, returnTo)}
      />
    </AuthLayout>
  );
}
