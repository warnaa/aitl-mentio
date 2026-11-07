// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { NoteDto } from '@devmentor/core';
import { SessionNotePanel } from './SessionNotePanel';

const id = '11111111-1111-4111-8111-111111111111';
const note = (over: Partial<NoteDto> = {}): NoteDto => ({ id: 'note1', version: 1, revision: 1, body: 'Saved private text', status: 'draft', declineComment: null, sentAt: null, decidedAt: null, updatedAt: '2026-11-07T15:00:00Z', private: true, ...over });
const props = (current: NoteDto | null = null) => ({ bookingId: id, viewerRole: 'mentor' as const, counterpartName: 'Sam Mentee', hasAnswer: true, initial: { current, history: [] }, zone: 'UTC' });
const fetchMock = vi.fn();
const ok = (data: unknown) => new Response(JSON.stringify({ ok: true, data }));
const fail = (message = 'Newer saved revision. Refresh the preview.') => new Response(JSON.stringify({ ok: false, error: { code: 'conflict', message } }), { status: 409 });
const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name });
const text = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: /Session note/ });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('requires an answer for the mentor and hides the panel for an unanswered mentee', () => {
  const p = { ...props(), hasAnswer: false };
  const { rerender } = render(<SessionNotePanel {...p} />);
  expect(screen.getByText(/Post the written answer before drafting/)).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
  rerender(<SessionNotePanel {...p} viewerRole="mentee" />);
  expect(screen.queryByRole('region')).toBeNull();
});
it('shows mentee empty/draft/awaiting read-only states and no decision controls, rendering text escaped', () => {
  const p = props();
  const { rerender, container } = render(<SessionNotePanel {...p} viewerRole="mentee" />);
  expect(screen.getByText('No session note yet')).toBeTruthy();
  rerender(<SessionNotePanel {...p} viewerRole="mentee" initial={{ current: note({ body: '<script>private</script>' }), history: [] }} />);
  expect(screen.getByText(/has not sent this note/)).toBeTruthy();
  expect(screen.getByText('<script>private</script>')).toBeTruthy();
  expect(container.querySelector('script')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  rerender(<SessionNotePanel {...p} viewerRole="mentee" initial={{ current: note({ status: 'awaiting_approval' }), history: [] }} />);
  expect(screen.getByText('Awaiting your approval')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Approve|Decline|Send for approval/ })).toBeNull();
});
it('saves a normalized draft with create-only revision and sends the exact saved revision, with reachable replay', async () => {
  render(<SessionNotePanel {...props()} />);
  fireEvent.change(text(), { target: { value: '  private\r\ntext  ' } });
  fetchMock.mockResolvedValueOnce(ok(note({ body: 'private\ntext' })));
  fireEvent.keyDown(text(), { key: 'Enter', ctrlKey: true });
  await waitFor(() => expect(button('Send for approval').disabled).toBe(false));
  expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ body: 'private\ntext', expectedRevision: null });
  const sent = note({ body: 'private\ntext', status: 'awaiting_approval', sentAt: '2026-11-07T15:01:00Z' });
  fetchMock.mockResolvedValueOnce(ok(sent));
  fireEvent.click(button('Send for approval'));
  await waitFor(() => expect(screen.getByText('Notification requested.')).toBeTruthy());
  expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ version: 1, revision: 1 });
  expect(screen.queryByRole('textbox')).toBeNull();
  fetchMock.mockResolvedValueOnce(ok(sent));
  fireEvent.click(button('Notify mentee'));
  await waitFor(() => expect(button('Notify mentee').disabled).toBe(false));
  expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ version: 1, revision: 1 });
});
it('blocks duplicate writes, dirty sends and refresh while saving, and preserves edits after failed writes', async () => {
  render(<SessionNotePanel {...props(note())} />);
  fireEvent.change(text(), { target: { value: 'dirty kept' } });
  expect(button('Send for approval').disabled).toBe(true);
  const put = deferred<Response>(); fetchMock.mockReturnValueOnce(put.promise);
  fireEvent.click(button('Save draft'));
  expect(button('Refresh note').disabled).toBe(true);
  expect(button('Send for approval').disabled).toBe(true);
  await act(async () => put.resolve(fail()));
  expect(text().value).toBe('dirty kept');
  expect(screen.getByRole('alert').textContent).toContain('Newer saved revision');
  expect(button('Send for approval').disabled).toBe(true);
  expect(JSON.parse(fetchMock.mock.calls[0]![1].body).expectedRevision).toBe(1);
});
it('refreshes after the session ended, exposes load errors with Retry and preserves a dirty form', async () => {
  render(<SessionNotePanel {...props(note())} initial={null} />);
  expect(screen.getByRole('alert').textContent).toContain('could not be loaded');
  fetchMock.mockResolvedValueOnce(fail('Temporary load failure'));
  fireEvent.click(button('Retry'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Temporary load failure'));
  fetchMock.mockResolvedValueOnce(ok({ current: null, history: [] }));
  fireEvent.click(button('Refresh note'));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  fireEvent.change(text(), { target: { value: 'typed while waiting' } });
  fetchMock.mockResolvedValueOnce(ok({ current: note({ revision: 2 }), history: [] }));
  fireEvent.click(button('Refresh note'));
  await waitFor(() => expect(screen.getByText(/A newer saved session note exists/)).toBeTruthy());
  expect(text().value).toBe('typed while waiting');
});
it('checks dirty at application time when someone types during refresh and keeps its original expected revision', async () => {
  render(<SessionNotePanel {...props(note())} />);
  const read = deferred<Response>(); fetchMock.mockReturnValueOnce(read.promise);
  fireEvent.click(button('Refresh note'));
  expect(screen.getByText(/Refreshing session note/)).toBeTruthy();
  fireEvent.change(text(), { target: { value: 'edit during GET' } });
  await act(async () => read.resolve(ok({ current: note({ revision: 2, body: 'new saved preview' }), history: [] })));
  expect(text().value).toBe('edit during GET');
  expect(screen.getByText('new saved preview')).toBeTruthy();
  fetchMock.mockResolvedValueOnce(fail()); fireEvent.click(button('Save draft'));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(JSON.parse(fetchMock.mock.calls[1]![1].body).expectedRevision).toBe(1);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  fireEvent.click(button('Reload saved draft')); expect(text().value).toBe('edit during GET');
  fireEvent.click(button('Reload saved draft')); expect(text().value).toBe('new saved preview');
  expect(screen.getByText('Saved draft loaded.')).toBeTruthy();
  confirm.mockRestore();
});
it('invalidates GET-before-save and GET-before-send so late responses cannot regress the saved state or reopen an editor', async () => {
  render(<SessionNotePanel {...props(note())} />);
  const oldGet = deferred<Response>(); fetchMock.mockReturnValueOnce(oldGet.promise);
  fireEvent.click(button('Refresh note'));
  fireEvent.change(text(), { target: { value: 'new body' } });
  fetchMock.mockResolvedValueOnce(ok(note({ revision: 2, body: 'new body' })));
  fireEvent.click(button('Save draft'));
  await waitFor(() => expect(button('Send for approval').disabled).toBe(false));
  await act(async () => oldGet.resolve(ok({ current: note(), history: [] })));
  expect(text().value).toBe('new body');
  const beforeSend = deferred<Response>(); fetchMock.mockReturnValueOnce(beforeSend.promise);
  fireEvent.click(button('Refresh note'));
  fetchMock.mockResolvedValueOnce(ok(note({ revision: 2, body: 'new body', status: 'awaiting_approval' })));
  fireEvent.click(button('Send for approval'));
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  await act(async () => beforeSend.resolve(ok({ current: note({ revision: 2, body: 'new body' }), history: [] })));
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(button('Notify mentee')).toBeTruthy();
});
it('accepts only progressing parent version/revision/status and never replaces dirty text', () => {
  const p = props(note());
  const { rerender } = render(<SessionNotePanel {...p} />);
  rerender(<SessionNotePanel {...p} initial={{ current: note({ revision: 2, body: 'fresh' }), history: [] }} />);
  expect(text().value).toBe('fresh');
  rerender(<SessionNotePanel {...p} initial={{ current: note(), history: [] }} />);
  expect(text().value).toBe('fresh');
  fireEvent.change(text(), { target: { value: 'unsaved' } });
  rerender(<SessionNotePanel {...p} initial={{ current: note({ revision: 3, body: 'new preview' }), history: [] }} />);
  expect(text().value).toBe('unsaved');
  rerender(<SessionNotePanel {...p} initial={{ current: note({ version: 2, revision: 1, body: 'next version', status: 'awaiting_approval' }), history: [] }} />);
  expect(screen.getByText('next version')).toBeTruthy();
  expect(screen.getByLabelText('Unsaved session note').textContent).toBe('unsaved');
  expect(button('Notify mentee').disabled).toBe(false);
  rerender(<SessionNotePanel {...p} initial={{ current: note({ version: 2, status: 'draft' }), history: [] }} />);
  expect(screen.queryByRole('textbox')).toBeNull();
  rerender(<SessionNotePanel {...p} initial={{ current: null, history: [] }} />);
  expect(screen.getByText('next version')).toBeTruthy();
});
it('keeps a clean saved draft after send failure and retries the same revision', async () => {
  render(<SessionNotePanel {...props(note())} />);
  fetchMock.mockResolvedValueOnce(fail('Send failed; draft kept.'));
  fireEvent.click(button('Send for approval'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Send failed'));
  expect(text().value).toBe('Saved private text');
  expect(button('Send for approval').disabled).toBe(false);
});

it('ignores a second send and refresh fired in the same event batch as the first send', async () => {
  render(<SessionNotePanel {...props(note())} />);
  const pending = deferred<Response>(); fetchMock.mockReturnValueOnce(pending.promise);
  const sendButton = button('Send for approval');
  const refreshButton = button('Refresh note');
  act(() => {
    sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    refreshButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fireEvent.submit(text().closest('form')!);
    fireEvent.keyDown(text(), { key: 'Enter', ctrlKey: true });
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve(fail('Try again')));
});

it('does not regress a newer parent revision when an older successful save response arrives later', async () => {
  const p = props(note());
  const { rerender } = render(<SessionNotePanel {...p} />);
  fireEvent.change(text(), { target: { value: 'my saved second revision' } });
  const put = deferred<Response>(); fetchMock.mockReturnValueOnce(put.promise);
  fireEvent.click(button('Save draft'));
  rerender(<SessionNotePanel {...p} initial={{ current: note({ revision: 3, body: 'third revision accepted first' }), history: [] }} />);
  await act(async () => put.resolve(ok(note({ revision: 2, body: 'my saved second revision' }))));
  expect(text().value).toBe('my saved second revision');
  expect(screen.getByText('third revision accepted first')).toBeTruthy();
  expect(button('Send for approval').disabled).toBe(true);
  expect(button('Reload saved draft')).toBeTruthy();
});
