import { apiHandler, clientIp, homeFor, jsonOk, parseJsonBody, safeReturnTo, withRequestScope } from '@devmentor/core';
import { loginSchema } from '@devmentor/core/validators/auth/login.schema';

export const dynamic = 'force-dynamic';

/**
 * Sign in with email and password (E01 #32). Fetched through `apiCall` (JSON only, CSRF
 * header enforced by `apiHandler`). Success sets the session cookie and answers
 * `{ ok: true, data: { redirectTo } }` — the sanitised `returnTo`, else the role home —
 * for the form to navigate to. Every failure sets no cookie: a generic 401 for an
 * unknown address or a wrong password, 403 `email_unverified`, 429, 503, 422.
 */
export const POST = apiHandler(async (req) =>
  withRequestScope(req, async ({ userService, sessionService, env }) => {
    const input = await parseJsonBody(req, loginSchema);
    const user = await userService.authenticateWithPassword(input, {
      clientIp: clientIp(req.headers, env.TRUSTED_PROXY_HOPS),
    });
    const { cookie } = await sessionService.issue({ id: user.userId, sessionVersion: user.sessionVersion });
    const response = jsonOk({ redirectTo: safeReturnTo(input.returnTo, homeFor(user.roles)) });
    response.headers.append('set-cookie', cookie);
    return response;
  }),
);
