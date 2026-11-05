import { NotFoundError, StackTags, withScope } from '@devmentor/core';
import { ErrorMessage } from '@devmentor/ui/backend';
import { LocalTime } from '@devmentor/ui/time';
import { getPageAccount, signInRedirectPath } from '../../../lib/session';
import { SignOutButton } from '../../../components/auth/SignOutButton';
import { AcceptInvitation } from './AcceptInvitation';
export const dynamic = 'force-dynamic';
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation;
  try {
    invitation = await withScope(({ invitationService }) => invitationService.lookup(token));
  } catch (error) {
    return (
      <main className="mx-auto max-w-[65ch] p-6">
        <ErrorMessage
          message={
            error instanceof NotFoundError
              ? 'This invitation is not valid.'
              : 'Invitations are unavailable. Please try again later.'
          }
        />
      </main>
    );
  }
  const account = await getPageAccount();
  const matches = account?.user.email.trim().toLowerCase() === invitation.email;
  return (
    <main className="mx-auto flex max-w-[65ch] flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-medium">Your mentor invitation</h1>
      <p>You have been invited as {invitation.email}.</p>
      {invitation.stackTags.length > 0 && (
        <p>Stacks you were invited for: {invitation.stackTags.map(StackTags.labelOf).join(', ')}.</p>
      )}
      <p>
        This invitation expires <LocalTime value={invitation.expiresAt} />.
      </p>
      {!account ? (
        <a className="underline" href={signInRedirectPath(`/invitation/${encodeURIComponent(token)}`)}>
          Sign in to accept
        </a>
      ) : matches ? (
        <>
          <p>Accepting adds the mentor role to the account you are signed in with.</p>
          <AcceptInvitation token={token} />
        </>
      ) : (
        <>
          <ErrorMessage
            message={`This invitation belongs to a different email address. You are signed in as ${account.user.email}; sign out and sign in as ${invitation.email}.`}
          />
          <SignOutButton />
        </>
      )}
    </main>
  );
}
