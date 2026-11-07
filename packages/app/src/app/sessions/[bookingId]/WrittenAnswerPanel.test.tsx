// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WrittenAnswerPanel, type WrittenAnswerPanelProps } from './WrittenAnswerPanel';

const id = '11111111-1111-4111-8111-111111111111';
const saved = { body: 'Use a union.\nNarrow on ok.', postedAt: '2026-11-12T14:30:00.000Z' };
const base: WrittenAnswerPanelProps['session'] = {
  booking: { id, startsAt: '2026-11-12T14:00:00.000Z', endsAt: '2026-11-12T14:25:00.000Z', lengthMinutes: 25 },
  window: 'ended', viewerRole: 'mentee', counterpartName: 'Alex Mentor', answer: null, answerOwed: true,
};
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const onSaved = vi.fn();
const view = (over: Partial<WrittenAnswerPanelProps['session']> = {}) => <WrittenAnswerPanel session={{ ...base, ...over }} zone="UTC" onSaved={onSaved} />;
const asMentor = (over: Partial<WrittenAnswerPanelProps['session']> = {}) => view({ viewerRole: 'mentor', counterpartName: 'Sam Mentee', ...over });
const textarea = () => screen.getByLabelText(/Written answer/) as HTMLTextAreaElement;
const submit = async (name: string) => { await act(async () => { fireEvent.click(screen.getByRole('button', { name })); }); };

beforeEach(() => {
  fetchMock.mockReset();
  onSaved.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('shows the mentee the posted answer as text, with its time, in any window', () => {
  const { rerender } = render(view({ answer: { ...saved, body: '<b>literal</b>\nsecond line' }, answerOwed: false }));
  expect(screen.getByText('Posted')).toBeTruthy();
  expect(screen.getByText('From Alex Mentor')).toBeTruthy();
  expect(screen.getByText(/<b>literal<\/b>/).textContent).toBe('<b>literal</b>\nsecond line');
  expect(screen.getByText(/^Posted .*14:30/)).toBeTruthy();
  rerender(view({ window: 'open', answer: saved, answerOwed: false }));
  expect(screen.getByText(/Narrow on ok/)).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
});

it('tells the mentee the answer is still owed after the end, and shows nothing before it', () => {
  const { container, rerender } = render(view());
  expect(screen.getByText('Awaiting answer')).toBeTruthy();
  expect(screen.getByText('The written answer is still owed.')).toBeTruthy();
  rerender(view({ window: 'open', answerOwed: false }));
  expect(container.textContent).toBe('');
});

it('tells the mentor before the start that the answer opens with the session, with no form', () => {
  render(asMentor({ window: 'not_started', answerOwed: false }));
  expect(screen.getByText('You can post the written answer when the session starts.')).toBeTruthy();
  expect(screen.getByText('From you')).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
});

it('lets the mentor post the answer during the session and confirms it', async () => {
  render(asMentor({ window: 'open', answerOwed: false }));
  expect(screen.getByRole('heading', { name: 'Written answer for Sam' })).toBeTruthy();
  expect(screen.getByText('Sam sees it on this page as soon as you post it.')).toBeTruthy();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, data: saved }), { status: 200 }));
  fireEvent.change(textarea(), { target: { value: '  Use a union.\r\nNarrow on ok.  ' } });
  await submit('Post written answer');
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe(`/api/sessions/${id}/answer`);
  expect(init?.method).toBe('PUT');
  expect(JSON.parse(String(init?.body))).toEqual({ body: 'Use a union.\nNarrow on ok.' });
  expect(onSaved).toHaveBeenCalledWith(saved);
  expect(screen.getByText('Written answer saved.')).toBeTruthy();
});

it('starts the mentor from the saved answer, previews it and offers to update it', () => {
  render(asMentor({ answer: saved, answerOwed: false }));
  expect(textarea().value).toBe(saved.body);
  expect(screen.getByRole('button', { name: 'Update written answer' })).toBeTruthy();
  expect(screen.getByText('From you')).toBeTruthy();
});

it('validates before saving and keeps the draft with the server message when a save is refused', async () => {
  render(asMentor());
  await submit('Post written answer');
  expect(screen.getByText('Write the answer before posting it.')).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: 'rate_limited', message: 'Too many requests' } }), { status: 429 }));
  fireEvent.change(textarea(), { target: { value: 'My answer' } });
  await submit('Post written answer');
  expect(screen.getByRole('alert').textContent).toContain('Too many requests');
  expect(textarea().value).toBe('My answer');
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.queryByText('Written answer saved.')).toBeNull();
});

it('keeps the mentor draft when the session ends under the form', () => {
  const { rerender } = render(asMentor({ window: 'open', answerOwed: false }));
  fireEvent.change(textarea(), { target: { value: 'Half written' } });
  rerender(asMentor({ window: 'ended' }));
  expect(textarea().value).toBe('Half written');
});

it('follows a newer saved answer when the mentor has no unsaved edits, and shows the trimmed copy after a save', async () => {
  const { rerender } = render(asMentor({ answer: saved, answerOwed: false }));
  rerender(asMentor({ answer: { body: 'Saved in another tab.', postedAt: '2026-11-12T15:00:00.000Z' }, answerOwed: false }));
  expect(textarea().value).toBe('Saved in another tab.');
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { body: 'Trimmed.', postedAt: '2026-11-12T16:00:00.000Z' } }), { status: 200 }));
  fireEvent.change(textarea(), { target: { value: '  Trimmed.  ' } });
  await submit('Update written answer');
  rerender(asMentor({ answer: { body: 'Trimmed.', postedAt: '2026-11-12T16:00:00.000Z' }, answerOwed: false }));
  expect(textarea().value).toBe('Trimmed.');
  expect(screen.getByText('Written answer saved.')).toBeTruthy();
});

it('keeps unsaved edits when a newer answer arrives and says that saving replaces it', () => {
  const { rerender } = render(asMentor({ answer: saved, answerOwed: false }));
  fireEvent.change(textarea(), { target: { value: 'My edit' } });
  rerender(asMentor({ answer: { body: 'Saved in another tab.', postedAt: '2026-11-12T15:00:00.000Z' }, answerOwed: false }));
  expect(textarea().value).toBe('My edit');
  expect(screen.getByText(/A newer written answer was saved/)).toBeTruthy();
});
