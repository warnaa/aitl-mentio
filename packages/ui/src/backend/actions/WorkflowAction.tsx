'use client';

import { useState } from 'react';
import { Button, type ButtonProps } from '../../components/ui/button';
import { apiCall } from '../api/apiCall';
import type { ApiResult } from '../api/types';
import { ErrorMessage } from '../feedback/ErrorMessage';

export interface WorkflowActionProps<T = unknown>
  extends Pick<ButtonProps, 'intent' | 'appearance' | 'size' | 'leadingIcon' | 'className'> {
  /** API path called through `apiCall`, so the CSRF header always rides along. */
  endpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON request body, when the action needs one. */
  body?: unknown;
  /** The button's visible name: a concrete verb, e.g. "Sign out" or "Approve note". */
  label: string;
  /** Shown on the disabled button while the request is pending. */
  pendingLabel?: string;
  /** Runs with the envelope's `data` after a confirmed success; may be async. */
  onSuccess?: (data: T) => void | Promise<void>;
  disabled?: boolean;
}

/** Shown when the request itself throws (an unreadable response), not for envelope errors. */
export const WORKFLOW_ACTION_FAILURE = 'We could not complete the request. Try again.';

/**
 * A button that changes server state (primitives spec F4): the shape `CrudForm` and
 * `DataTable` do not cover — sign out, pay, cancel, approve. It sends one request through
 * `apiCall`, disables itself and shows `pendingLabel` while pending, renders an envelope
 * error through `ErrorMessage`, and calls `onSuccess` only after a confirmed `{ ok: true }`.
 * Navigation, refreshing and wording belong to the caller. A confirmation step is not
 * part of it yet (deferred to #43).
 */
export function WorkflowAction<T = unknown>({
  endpoint,
  method = 'POST',
  body,
  label,
  pendingLabel = 'Working…',
  onSuccess,
  disabled = false,
  intent,
  appearance,
  size,
  leadingIcon,
  className,
}: WorkflowActionProps<T>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    // The button is disabled while pending: React commits a discrete click's update
    // before the next event, so a second click cannot start a second request.
    setPending(true);
    setError(null);
    try {
      let result: ApiResult<T>;
      try {
        result = await apiCall<T>(endpoint, { method, body });
      } catch {
        result = { ok: false, error: { code: 'request_failed', message: WORKFLOW_ACTION_FAILURE } };
      }
      if (result.ok) {
        await onSuccess?.(result.data);
      } else {
        setError(result.error.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="dm-workflow-action">
      <Button
        type="button"
        intent={intent}
        appearance={appearance}
        size={size}
        leadingIcon={leadingIcon}
        className={className}
        disabled={disabled || pending}
        aria-busy={pending}
        onClick={() => void run()}
      >
        {pending ? pendingLabel : label}
      </Button>
      {error ? <ErrorMessage message={error} /> : null}
    </div>
  );
}
