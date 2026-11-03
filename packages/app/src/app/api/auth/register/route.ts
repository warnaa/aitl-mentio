import { apiHandler, clientIp, parseJsonBody, withRequestScope } from '@devmentor/core';
import { registerSchema } from '@devmentor/core/validators/auth/register.schema';

export const dynamic = 'force-dynamic';

/**
 * Register with email and password (E01 #32). Fetched through `apiCall` (JSON only,
 * CSRF header enforced by `apiHandler`). Answers `{ ok: true, data: { email } }` once
 * the verification mail is accepted for delivery — no session yet: verification issues
 * it. Refusals are the service's: 409 for an address a verified account owns, 429 with
 * `Retry-After`, 503 when hashing is saturated or the mail cannot be sent, 422 with
 * `fieldErrors` for invalid input.
 */
export const POST = apiHandler(async (req) =>
  withRequestScope(req, async ({ userService, env }) =>
    userService.registerWithPassword(await parseJsonBody(req, registerSchema), {
      clientIp: clientIp(req.headers, env.TRUSTED_PROXY_HOPS),
    }),
  ),
);
