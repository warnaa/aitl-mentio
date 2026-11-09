// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SessionDto } from '@devmentor/core';
import { POLL_MS, SessionRoom } from './SessionRoom';

const id = '11111111-1111-4111-8111-111111111111';
const message = (n: number, own: boolean) => ({ id: `m${n}`, authorRole: own ? 'mentee' : 'mentor', isOwn: own, authorName: own ? 'Sam Mentee' : 'Alex Mentor', body: `line ${n}\nsecond`, createdAt: `2026-11-12T14:0${n}:00.000Z` }) as SessionDto['messages'][number];
const session = (over: Partial<SessionDto> = {}): SessionDto => ({
  booking: { id, startsAt: '2026-11-12T14:00:00.000Z', endsAt: '2026-11-12T14:25:00.000Z', lengthMinutes: 25 },
  window: 'open', serverNow: '2026-11-12T14:05:00.000Z', viewerRole: 'mentee', counterpartName: 'Alex Mentor', truncated: false,
  messages: [message(1, true), message(2, false)], answer: null, answerOwed: false, ...over,
});
const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status });
const fail = (status: number, code: string, message: string) => new Response(JSON.stringify({ ok: false, error: { code, message } }), { status });
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

function setVisibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
}
const tick = (ms = POLL_MS) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const calls = (url: string) => fetchMock.mock.calls.filter(([called]) => called === url);

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setVisibility('visible');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const noticesShown = () => {
  expect(screen.getByText('Sessions are text. DevMentor makes no promise about how soon an answer arrives.')).toBeTruthy();
  expect(screen.getByText('Paste only what you are allowed to share. DevMentor does not check who owns it.')).toBeTruthy();
};

it('shows the open session with both notices, the transcript and a composer, and no audio or video control', () => {
  const { container } = render(<SessionRoom initial={session()} />);
  noticesShown();
  expect(screen.getByRole('heading', { name: 'Session with Alex Mentor' })).toBeTruthy();
  expect(screen.getByText('Your mentor: Alex Mentor')).toBeTruthy();
  expect(screen.getByText('Only you and Alex can read this conversation.')).toBeTruthy();
  expect(screen.getByText('In progress')).toBeTruthy();
  expect(screen.getByText(/line 1/)).toBeTruthy();
  expect(screen.getByLabelText(/Message to Alex/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'My sessions' }).getAttribute('href')).toBe('/home');
  expect(container.querySelector('audio, video, [aria-label*="call" i]')).toBeNull();
  expect(screen.queryByText(/Reconnecting/)).toBeNull();
  expect(screen.queryByText('Awaiting answer')).toBeNull();
});

it('before the start it explains when writing opens and offers no composer, keeping both notices', () => {
  render(<SessionRoom initial={session({ window: 'not_started', messages: [] })} />);
  noticesShown();
  expect(screen.getByText(/You can write here when the session starts/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
  const locked = screen.getByLabelText('Message to Alex') as HTMLTextAreaElement;
  expect(locked.disabled).toBe(true);
  expect(screen.getByText('Upcoming')).toBeTruthy();
});

it('after the end it keeps the transcript readable, closes the composer and shows the owed written answer without polling', async () => {
  render(<SessionRoom initial={session({ window: 'ended', answerOwed: true })} />);
  noticesShown();
  expect(screen.getByText('This session has ended')).toBeTruthy();
  expect(screen.getByText('You can still read the conversation above.')).toBeTruthy();
  expect(screen.getByText('Awaiting answer')).toBeTruthy();
  expect(screen.getByText('The written answer is still owed.')).toBeTruthy();
  expect(screen.getByText('From Alex Mentor')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
  await tick(POLL_MS * 3);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('shows the mentor view with the mentee as counterpart and the answer editor', () => {
  render(<SessionRoom initial={session({ viewerRole: 'mentor', counterpartName: 'Sam Mentee', window: 'ended', answerOwed: true })} />);
  expect(screen.getByText('Your mentee: Sam Mentee')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'My sessions' }).getAttribute('href')).toBe('/mentor');
  expect(screen.getByRole('heading', { name: 'Written answer for Sam' })).toBeTruthy();
  expect(screen.queryByText('Awaiting answer')).toBeNull();
});

it('shows the saved answer at once and refreshes the session after the mentor posts it', async () => {
  render(<SessionRoom initial={session({ viewerRole: 'mentor', counterpartName: 'Sam Mentee', window: 'ended', answerOwed: true })} />);
  const saved = { body: 'Use a union.', postedAt: '2026-11-12T14:30:00.000Z' };
  fetchMock.mockImplementation(async (_url, init) => (init?.method === 'PUT' ? ok(saved) : ok(session({ viewerRole: 'mentor', counterpartName: 'Sam Mentee', window: 'ended', answer: saved }))));
  fireEvent.change(screen.getByLabelText(/Written answer/), { target: { value: 'Use a union.' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Post written answer' })); });
  expect(fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')![0]).toBe(`/api/sessions/${id}/answer`);
  expect(screen.getByText('Written answer saved.')).toBeTruthy();
  expect(screen.getByText('From you')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Update written answer' })).toBeTruthy();
  expect(calls(`/api/sessions/${id}`)).toHaveLength(1);
});

it('says when older messages are not shown', () => {
  render(<SessionRoom initial={session({ truncated: true })} />);
  expect(screen.getByText('Earlier messages are not shown.')).toBeTruthy();
});

it('polls every five seconds, shows new messages, flags a failed poll and recovers', async () => {
  render(<SessionRoom initial={session()} />);
  fetchMock.mockResolvedValueOnce(ok(session({ messages: [message(1, true), message(2, false), message(3, false)] })));
  await tick();
  expect(calls(`/api/sessions/${id}`)).toHaveLength(1);
  expect(screen.getByText(/line 3/)).toBeTruthy();
  fetchMock.mockResolvedValueOnce(fail(500, 'internal_error', 'boom'));
  await tick();
  expect(screen.getByText('Reconnecting…')).toBeTruthy();
  expect(screen.getByText(/line 3/)).toBeTruthy();
  fetchMock.mockResolvedValueOnce(ok(session()));
  await tick();
  expect(screen.queryByText('Reconnecting…')).toBeNull();
});

it('does not poll while the tab is hidden and polls at once when it becomes visible again', async () => {
  render(<SessionRoom initial={session()} />);
  setVisibility('hidden');
  await tick(POLL_MS * 2);
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockResolvedValue(ok(session()));
  setVisibility('visible');
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(calls(`/api/sessions/${id}`)).toHaveLength(1);
  setVisibility('hidden');
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(calls(`/api/sessions/${id}`)).toHaveLength(1);
});

it('switches itself to the ended state from the server window and stops polling', async () => {
  render(<SessionRoom initial={session()} />);
  fetchMock.mockResolvedValue(ok(session({ window: 'ended', answerOwed: true })));
  await tick();
  expect(screen.getByText('This session has ended')).toBeTruthy();
  expect(screen.queryByText(/Your draft is kept/)).toBeNull();
  await tick(POLL_MS * 3);
  expect(calls(`/api/sessions/${id}`)).toHaveLength(1);
});

it('starts polling for a session that has not started and opens the composer when the server says so', async () => {
  render(<SessionRoom initial={session({ window: 'not_started', messages: [] })} />);
  fetchMock.mockResolvedValue(ok(session()));
  await tick();
  expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy();
});

const type = (value: string) => fireEvent.change(screen.getByLabelText(/Message to Alex/), { target: { value } });
const send = async () => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Send message' })); }); };

it('posts the message, clears the composer, confirms to assistive tech and refreshes the transcript', async () => {
  render(<SessionRoom initial={session()} />);
  fetchMock.mockImplementation(async (url, init) => (init?.method === 'POST' ? ok(message(3, true), 201) : ok(session({ messages: [message(1, true), message(2, false), message(3, true)] }))));
  type('  hello\r\nthere  ');
  await send();
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
  expect(post[0]).toBe(`/api/sessions/${id}/messages`);
  expect(JSON.parse(String(post[1]!.body))).toEqual({ body: 'hello\nthere' });
  expect((screen.getByLabelText(/Message to Alex/) as HTMLTextAreaElement).value).toBe('');
  expect(screen.getByText('Message sent.')).toBeTruthy();
  expect(screen.getByText(/line 3/)).toBeTruthy();
});

it('validates before sending: an empty or over-long message never reaches the server', async () => {
  render(<SessionRoom initial={session()} />);
  await send();
  expect(screen.getByText('Write a message before sending.')).toBeTruthy();
  type('x'.repeat(4001));
  await send();
  expect(screen.getByText('Keep this message under 4,000 characters.')).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('keeps the draft and shows the error when a post fails while the session is still open', async () => {
  render(<SessionRoom initial={session()} />);
  fetchMock.mockImplementation(async (url, init) => (init?.method === 'POST' ? fail(429, 'rate_limited', 'Too many requests') : ok(session())));
  type('still here');
  await send();
  expect(screen.getByRole('alert').textContent).toContain('Too many requests');
  expect((screen.getByLabelText(/Message to Alex/) as HTMLTextAreaElement).value).toBe('still here');
  expect(screen.queryByText(/ended before your message/)).toBeNull();
  expect(screen.queryByText('Message sent.')).toBeNull();
});

it('keeps the draft visible when the session ended before the message was sent', async () => {
  render(<SessionRoom initial={session()} />);
  fetchMock.mockImplementation(async (url, init) => (init?.method === 'POST' ? fail(409, 'conflict', 'This session has ended.') : ok(session({ window: 'ended', answerOwed: true }))));
  type('too late');
  await send();
  expect(screen.getByText(/This session ended before your message was sent/)).toBeTruthy();
  expect((screen.getByLabelText(/Message to Alex/) as HTMLTextAreaElement).value).toBe('too late');
  expect(screen.getByText('Awaiting answer')).toBeTruthy();
});

it('ignores a failed refresh after a post without claiming the session ended', async () => {
  render(<SessionRoom initial={session()} />);
  fetchMock.mockImplementation(async (url, init) => (init?.method === 'POST' ? fail(500, 'internal_error', 'boom') : fail(500, 'internal_error', 'down')));
  type('hello');
  await send();
  expect(screen.getByText('Reconnecting…')).toBeTruthy();
  expect(screen.queryByText(/ended before your message/)).toBeNull();
});

it('keeps an unsent draft readable when a poll finds the session ended under it', async () => {
  render(<SessionRoom initial={session()} />);
  type('a long paste I was still writing');
  fetchMock.mockResolvedValue(ok(session({ window: 'ended', answerOwed: true })));
  await tick();
  expect(screen.getByText(/ended before your message was sent/)).toBeTruthy();
  expect((screen.getByLabelText(/Message to Alex/) as HTMLTextAreaElement).value).toBe('a long paste I was still writing');
  expect(screen.getByText('Awaiting answer')).toBeTruthy();
});

it('closes the composer when the session ends and there is no draft', async () => {
  render(<SessionRoom initial={session()} />);
  type('x');
  type('');
  fetchMock.mockResolvedValue(ok(session({ window: 'ended', answerOwed: true })));
  await tick();
  expect(screen.queryByLabelText(/Message to Alex/)).toBeNull();
  expect(screen.getByText('You can still read the conversation above.')).toBeTruthy();
});

it('puts the cursor back in the empty composer after a message is sent', async () => {
  render(<SessionRoom initial={session()} />);
  fetchMock.mockImplementation(async (url, init) => (init?.method === 'POST' ? ok(message(3, true), 201) : ok(session())));
  type('hello');
  await send();
  expect(document.activeElement).toBe(screen.getByLabelText(/Message to Alex/));
  expect(screen.getByText('Message sent.')).toBeTruthy();
});

it('lets only the newest request change the screen, so a slow older poll cannot undo a newer one', async () => {
  render(<SessionRoom initial={session()} />);
  let releaseSlow!: (response: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { releaseSlow = resolve; }));
  await tick();
  fetchMock.mockResolvedValueOnce(ok(session({ messages: [message(1, true), message(2, false), message(3, false)] })));
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(screen.getByText(/line 3/)).toBeTruthy();
  await act(async () => { releaseSlow(ok(session())); });
  expect(screen.getByText(/line 3/)).toBeTruthy();
});

it.each([[401, 'unauthorized'], [404, 'not_found']])('stops polling and says so when the answer is permanent (%i)', async (status, code) => {
  render(<SessionRoom initial={session()} />);
  fetchMock.mockResolvedValue(fail(status, code, 'gone'));
  await tick();
  expect(screen.getByRole('alert').textContent).toContain('no longer available');
  expect(screen.queryByText('Reconnecting…')).toBeNull();
  await tick(POLL_MS * 3);
  expect(calls(`/api/sessions/${id}`)).toHaveLength(1);
});

it('shows the written answer as final when the loaded note is approved', () => {
  const note = { id: 'n', version: 1, revision: 1, body: 'x', status: 'approved' as const, declineComment: null, sentAt: '2026-11-07T15:00:00Z', decidedAt: '2026-11-07T16:00:00Z', updatedAt: '2026-11-07T16:00:00Z', private: true as const };
  render(<SessionRoom initial={session({ viewerRole: 'mentor', counterpartName: 'Sam Mentee', window: 'ended', answer: { body: 'Final', postedAt: '2026-11-07T14:00:00Z' } })} initialNote={{ current: note, history: [] }} />);
  expect(screen.getByText(/so this written answer is final/)).toBeTruthy();
});
