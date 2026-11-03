import { apiHandler, BadRequestError, homeFor, safeReturnTo, withRequestScope } from '@devmentor/core';
import { authRouteLogger, redirectResponse, SIGN_IN_VERIFIED_PATH, signInErrorPath } from '../../../../lib/sign-in';

export const dynamic = 'force-dynamic';

/**
 * The link in the verification mail (E01 #32). Browser-navigated, so every outcome is
 * a redirect, never a JSON envelope:
 *
 * - verified now → `Set-Cookie` for a session and a redirect to the link's `returnTo`
 *   (re-sanitised) or the role home;
 * - already verified (a mail scanner may have opened it first) → `/sign-in?verified=1`,
 *   with **no** session: the link is not a 24-hour sign-in link;
 * - missing, malformed, expired, tampered or superseded token → `/sign-in?error=verification`;
 * - anything unexpected (logged) → `/sign-in?error=verification-unavailable`.
 */
export const GET = apiHandler(async (req) => {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return redirectResponse(signInErrorPath('verification'));
  }
  try {
    return await withRequestScope(req, async ({ emailVerification, userService, sessionService }) => {
      const result = await userService.verifyEmail(await emailVerification.read(token));
      if (result.status === 'already-verified') {
        return redirectResponse(SIGN_IN_VERIFIED_PATH);
      }
      const { cookie } = await sessionService.issue({ id: result.userId, sessionVersion: result.sessionVersion });
      return redirectResponse(safeReturnTo(result.returnTo, homeFor(result.roles)), [cookie]);
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return redirectResponse(signInErrorPath('verification'));
    }
    authRouteLogger().error({ err: error }, 'email verification failed');
    return redirectResponse(signInErrorPath('verification-unavailable'));
  }
});
