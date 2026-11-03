// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiCall } from '../api/apiCall';
import type { ApiResult } from '../api/types';
import { WORKFLOW_ACTION_FAILURE, WorkflowAction } from './WorkflowAction';

vi.mock('../api/apiCall', () => ({ apiCall: vi.fn() }));

const request = vi.mocked(apiCall);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ ok: true, data: null });
});

afterEach(cleanup);

describe('WorkflowAction', () => {
  it('POSTs to the endpoint by default and passes the envelope data to onSuccess', async () => {
    request.mockResolvedValue({ ok: true, data: { id: 'note-1' } });
    const onSuccess = vi.fn();
    render(<WorkflowAction endpoint="/api/notes/1/approve" label="Approve note" onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Approve note' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 'note-1' }));
    expect(request).toHaveBeenCalledWith('/api/notes/1/approve', { method: 'POST', body: undefined });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Approve note' }).hasAttribute('disabled')).toBe(false);
  });

  it('sends the given method and body', async () => {
    render(<WorkflowAction endpoint="/api/bookings/1" method="DELETE" body={{ reason: 'clash' }} label="Cancel booking" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('/api/bookings/1', { method: 'DELETE', body: { reason: 'clash' } }),
    );
  });

  it('disables itself and shows the pending label until the request settles, ignoring repeat clicks', async () => {
    const response = deferred<ApiResult<null>>();
    request.mockReturnValue(response.promise);
    const onSuccess = vi.fn();
    render(<WorkflowAction endpoint="/api/auth/logout" label="Sign out" pendingLabel="Signing out…" onSuccess={onSuccess} />);

    const button = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(button);
    fireEvent.click(button);

    const pending = await screen.findByRole('button', { name: 'Signing out…' });
    expect(pending.hasAttribute('disabled')).toBe(true);
    expect(pending.getAttribute('aria-busy')).toBe('true');
    expect(request).toHaveBeenCalledOnce();
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => response.resolve({ ok: true, data: null }));
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Sign out' }).getAttribute('aria-busy')).toBe('false');
  });

  it('uses a generic pending label by default and stays pending while an async onSuccess runs', async () => {
    const navigation = deferred<void>();
    render(<WorkflowAction endpoint="/api/x" label="Run payouts" onSuccess={() => navigation.promise} />);

    fireEvent.click(screen.getByRole('button', { name: 'Run payouts' }));
    await screen.findByRole('button', { name: 'Working…' });

    await act(async () => navigation.resolve());
    expect(screen.getByRole('button', { name: 'Run payouts' }).hasAttribute('disabled')).toBe(false);
  });

  it('shows the envelope error, skips onSuccess, and clears the error on the next attempt', async () => {
    request.mockResolvedValueOnce({ ok: false, error: { code: 'conflict', message: 'This note was already approved.' } });
    const onSuccess = vi.fn();
    render(<WorkflowAction endpoint="/api/x" label="Approve note" onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Approve note' }));

    expect((await screen.findByRole('alert')).textContent).toBe('This note was already approved.');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Approve note' }).hasAttribute('disabled')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Approve note' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a generic failure when the request itself throws', async () => {
    request.mockRejectedValue(new Error('body stream already read'));
    render(<WorkflowAction endpoint="/api/x" label="Pay now" />);

    fireEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    expect((await screen.findByRole('alert')).textContent).toBe(WORKFLOW_ACTION_FAILURE);
  });

  it('succeeds without an onSuccess callback', async () => {
    render(<WorkflowAction endpoint="/api/x" label="Open batch" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open batch' }));
    await waitFor(() => expect(request).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open batch' }).hasAttribute('disabled')).toBe(false));
  });

  it('honours disabled and forwards the button styling', () => {
    render(
      <WorkflowAction endpoint="/api/x" label="Sign out" disabled intent="neutral" appearance="stroke" size="sm"
        className="custom" leadingIcon={<span>icon</span>} />,
    );
    const button = screen.getByRole('button', { name: 'Sign out' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toContain('dm-button-neutral');
    expect(button.className).toContain('dm-button-stroke');
    expect(button.className).toContain('dm-button-sm');
    expect(button.className).toContain('custom');
    fireEvent.click(button);
    expect(request).not.toHaveBeenCalled();
  });
});
