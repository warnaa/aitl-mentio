import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Input, Label } from '@devmentor/ui';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import { getPageSession, homeFor } from '../../../lib/session';
import { authRouteLogger, githubSignInHref, signInNotice } from '../../../lib/sign-in';

// Reads the session cookie and, when one is present, the database.
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

/** A query value Next may hand over as an array (`?a=1&a=2`): only a single value counts. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * The session check for a visitor on `/sign-in`. When it cannot be made (database
 * down, `SESSION_SECRET` unset) the visitor still gets the form instead of an error
 * page: sign-in will report the outage itself, and a stale cookie must never lock
 * anyone out of the page that replaces it.
 */
async function currentSession() {
  try {
    return await getPageSession();
  } catch (error) {
    authRouteLogger().warn({ err: error }, 'could not check the session on /sign-in');
    return null;
  }
}

/**
 * `/sign-in` (public, Tailwind). GitHub first, then the email form — disabled until
 * email sign-in ships (spec Slice 4). The route's `?cancelled=1` / `?error=` outcome is
 * explained in an alert above both. A visitor who already holds a live session is sent
 * to their role home instead (edge case 28).
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const session = await currentSession();
  if (session) {
    redirect(homeFor(session.roles));
  }

  const notice = signInNotice({ cancelled: single(query.cancelled), error: single(query.error) });

  return (
    <AuthLayout
      title="Sign in to DevMentor"
      description="Use your GitHub account. The first time you sign in, we create your DevMentor account from it."
      footer={
        <Button asChild intent="neutral" appearance="ghost">
          <Link href="/">Back to home</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {notice && <ErrorMessage message={notice} />}
        <Button asChild intent="neutral" appearance="stroke" className="w-full">
          <a href={githubSignInHref(single(query.returnTo))}>Sign in with GitHub</a>
        </Button>
        <p aria-hidden="true" className="text-center text-xs text-muted-foreground">
          or use your email
        </p>
        <fieldset disabled aria-describedby="email-sign-in-note" className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
          <legend className="sr-only">Sign in with email</legend>
          <p id="email-sign-in-note" className="text-sm leading-6 text-muted-foreground">
            Email sign-in is not available yet. Use GitHub for now.
          </p>
          <div className="dm-field">
            <Label htmlFor="sign-in-email">Email address</Label>
            <Input
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="email"
              className="disabled:cursor-not-allowed disabled:opacity-55"
            />
          </div>
          <div className="dm-field">
            <Label htmlFor="sign-in-password">Password</Label>
            <Input
              id="sign-in-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="disabled:cursor-not-allowed disabled:opacity-55"
            />
          </div>
          <Button type="button" className="w-full">
            Sign in with email
          </Button>
        </fieldset>
      </div>
    </AuthLayout>
  );
}
