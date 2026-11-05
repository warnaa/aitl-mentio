'use client';

import { ErrorMessage, LoadingMessage, useApiResource } from '@devmentor/ui/backend';
import { Button } from '@devmentor/ui/components/button';
import { LocalTime } from '@devmentor/ui/time';

interface OnboardingStatus {
  initialPublishDueAt: string | null;
}

/** The durable first deadline, read after redirect or refresh rather than carried from acceptance. */
export function MentorDeadline() {
  const status = useApiResource<OnboardingStatus>('/api/mentors/me/onboarding');
  if (status.error) {
    return (
      <ErrorMessage
        message={status.error}
        action={
          <Button intent="neutral" appearance="stroke" onClick={status.reload}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!status.data) return <LoadingMessage message="Loading your publication deadline…" />;
  const dueAt = status.data.initialPublishDueAt;
  return (
    <p className="text-base leading-7">
      {dueAt ? (
        <>
          Publish at least one bookable session by <LocalTime value={dueAt} />.
        </>
      ) : (
        'Your mentor invitation has no publication deadline.'
      )}
    </p>
  );
}
