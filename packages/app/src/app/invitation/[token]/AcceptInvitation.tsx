'use client';
import { WorkflowAction } from '@devmentor/ui/backend';
import { navigation } from '../../../lib/navigation';
export function AcceptInvitation({ token }: { token: string }) {
  return (
    <WorkflowAction
      endpoint={`/api/invitations/${encodeURIComponent(token)}/accept`}
      label="Accept invitation"
      pendingLabel="Accepting invitation…"
      onSuccess={() => navigation.assign('/mentor')}
    />
  );
}
