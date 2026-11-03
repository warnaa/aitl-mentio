import { makeCrudRoute, requireRole, requireSession } from '@devmentor/core';

export const dynamic = 'force-dynamic';

/**
 * Reference CRUD route: `route.ts` is configuration, not logic. The collection verb
 * (`GET` list) is generated from the service by `makeCrudRoute`; item-level verbs
 * would live in `users/[id]/route.ts` off the same config.
 *
 * Operators only, guarded twice: `authorize` denies before the service is reached, and
 * `UserService.list` checks the scoped session again, so the read stays guarded
 * whoever calls it. There is no `POST`: accounts are created by sign-in, never by an
 * open endpoint that could set an arbitrary email (E01, breaking change 3).
 */
export const { GET } = makeCrudRoute({
  resolve: (cradle) => cradle.userService,
  authorize: async (req, cradle) => {
    requireRole(await requireSession(req, cradle), 'operator');
  },
});
