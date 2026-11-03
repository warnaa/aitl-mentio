'use client';

import { WorkflowAction } from '@devmentor/ui/backend';

/** Where a signed-out user lands. */
export const SIGNED_OUT_PATH = '/';

/**
 * A full page load, not a client-side push: the server-rendered tree still holds the
 * signed-in user, and a soft navigation could render stale chrome until the next
 * server round trip (primitives spec F4). A seam so tests can observe it — jsdom's
 * `window.location.assign` is not replaceable.
 */
export const navigation = {
  assign(path: string): void {
    window.location.assign(path);
  },
};

/**
 * Sign out — the first `WorkflowAction` (E01). POSTs `/api/auth/logout` through
 * `apiCall`, which sends the CSRF header the route requires; the route always answers
 * `{ ok: true }` with an expiring cookie, then this reloads onto `/`.
 */
export function SignOutButton() {
  return (
    <WorkflowAction
      endpoint="/api/auth/logout"
      label="Sign out"
      pendingLabel="Signing out…"
      intent="neutral"
      appearance="stroke"
      size="sm"
      onSuccess={() => navigation.assign(SIGNED_OUT_PATH)}
    />
  );
}
