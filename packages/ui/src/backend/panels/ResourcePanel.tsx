import type { ReactNode } from 'react';
import type { ApiResource } from '../api/useApiResource';
import { LoadingMessage } from '../feedback/LoadingMessage';
import { ErrorMessage } from '../feedback/ErrorMessage';
import { EmptyState } from '../feedback/EmptyState';
import { Button } from '../../components/ui/button';

/**
 * The loading, error and empty states of one `useApiResource`, so a page renders only
 * its loaded content. Content stays mounted while a reload is in flight, so a form
 * inside keeps its input and focus after it saves.
 */
export function ResourcePanel<T>({
  resource,
  children,
}: {
  resource: ApiResource<T>;
  children: (data: T) => ReactNode;
}) {
  if (resource.error) {
    return (
      <ErrorMessage
        message={resource.error}
        action={
          <Button intent="neutral" appearance="stroke" onClick={resource.reload}>
            Try again
          </Button>
        }
      />
    );
  }
  if (resource.data !== null) return <>{children(resource.data)}</>;
  if (resource.loading) return <LoadingMessage />;
  return <EmptyState title="Nothing here yet." />;
}
