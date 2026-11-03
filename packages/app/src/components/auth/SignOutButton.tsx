'use client';

import { WorkflowAction } from '@devmentor/ui/backend';
import { navigation } from '../../lib/navigation';

/** Where a signed-out user lands. */
export const SIGNED_OUT_PATH = '/';

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
