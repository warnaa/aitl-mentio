import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { BookingSummary } from '@mentio/ui/components/bookings/BookingSummary';
import { Message } from '@mentio/ui/components/messages/Message';
import { MessageComposer } from '@mentio/ui/components/messages/MessageComposer';
import { EarningsSummary } from '@mentio/ui/components/earnings/EarningsSummary';
import { Link } from '@mentio/ui/backend/actions';
import { ErrorMessage, LoadingMessage, StatusBadge, type StatusTone } from '@mentio/ui/backend/feedback';
import { apiCall } from '@mentio/ui/backend/api';
import { Alert, AlertDescription, AlertTitle } from '@mentio/ui/components/alert';
import { conversation, longCodeMessage, questionMessage, sentReply, type SessionMessage } from '../../fixtures/sessions';
import { MenteeShell, MentorShell, Stack } from '../shells';

// E04 screens — PRELIMINARY. No E04 spec exists. Sources: E04-S01/S02, R01, R02, R09, R10, D07, N01,
// references R02.1–R02.6, approved Q3 (conversation first; details after it on narrow screens) and Q5
// (inline quoted reply). Decided 2026-11-01 (no spec yet): one route `/sesje/[id]` for both participants,
// `POST /api/bookings/[id]/messages` with `{ body, replyToId }`, the 409 code `session_ended`, and the
// copy. Settlement on the next visit is application behavior; its visible results are shown here.
type Viewer = 'mentee' | 'mentor';
type RoomState = 'before' | 'active' | 'firstReply' | 'ended' | 'settling' | 'settleFailed' | 'mentorNoShow' | 'menteeNoShow' | 'missing';
const statusFor = (state: RoomState, viewer: Viewer) => {
  const map: Record<RoomState, { tone: StatusTone; label: string }> = {
    before: { tone: 'waiting', label: 'Starts at 18:00' },
    active: { tone: 'success', label: 'In progress — ends at 18:50' },
    firstReply: { tone: 'success', label: 'In progress — ends at 18:50' },
    ended: { tone: 'neutral', label: 'Ended' },
    settling: { tone: 'waiting', label: 'Checking…' },
    settleFailed: { tone: 'waiting', label: 'Not checked yet' },
    mentorNoShow: { tone: 'neutral', label: viewer === 'mentee' ? 'Missed by the mentor — refund started' : 'Missed — no first reply in time' },
    menteeNoShow: { tone: 'neutral', label: viewer === 'mentor' ? 'Mentee no-show — you are paid' : 'Missed — counts as held' },
    missing: { tone: 'neutral', label: '' },
  };
  return map[state];
};
const excerptOf = (message: SessionMessage) => {
  const line = message.body.replace(/```[^\n]*\n?/g, '').split('\n').find(text => text.trim())!.trim();
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
};
const notices: Partial<Record<RoomState, Record<Viewer, ReactNode>>> = {
  before: {
    mentee: <Alert role="note"><AlertTitle>The session starts on 6 November at 18:00</AlertTitle><AlertDescription>You can write from then. If Alex does not post within 10 minutes of the start, the session counts as missed and you get a full refund.</AlertDescription></Alert>,
    mentor: <Alert role="note"><AlertTitle>The session starts on 6 November at 18:00</AlertTitle><AlertDescription>Post your first reply within 10 minutes of the start. Otherwise the session counts as missed and Kasia gets a full refund.</AlertDescription></Alert>,
  },
  firstReply: {
    mentee: <Alert role="note"><AlertTitle>Alex has until 18:10 to post the first reply</AlertTitle><AlertDescription>You can add details now.</AlertDescription></Alert>,
    mentor: <Alert role="note"><AlertTitle>Post your first reply by 18:10</AlertTitle><AlertDescription>Otherwise the session counts as missed and Kasia gets a full refund.</AlertDescription></Alert>,
  },
  ended: {
    mentee: <Alert role="note"><AlertTitle>The session ended at 18:50</AlertTitle><AlertDescription>The conversation is read-only. Only you and Alex can see it.</AlertDescription></Alert>,
    mentor: <Alert role="note"><AlertTitle>The session ended at 18:50</AlertTitle><AlertDescription>The conversation is read-only. Only you and Kasia can see it, and nothing from it is published without her approval.</AlertDescription></Alert>,
  },
  mentorNoShow: {
    mentee: <Alert role="note"><AlertTitle>Alex did not post within 10 minutes of the start</AlertTitle><AlertDescription>The session counts as missed. Your refund of 240 zł has started.</AlertDescription></Alert>,
    mentor: <Alert variant="destructive"><AlertTitle>You did not post within 10 minutes of the start</AlertTitle><AlertDescription>The session counts as missed, and Kasia’s refund of 240 zł has started. Nothing is earned for it.</AlertDescription></Alert>,
  },
  menteeNoShow: {
    mentee: <Alert role="note"><AlertTitle>You did not open the session</AlertTitle><AlertDescription>Alex answered, so the session counts as held and the 240 zł is not refunded. Alex’s answer stays here for you.</AlertDescription></Alert>,
    mentor: <Alert role="note"><AlertTitle>Kasia did not open the session</AlertTitle><AlertDescription>You answered, so the session counts as held and you are paid.</AlertDescription></Alert>,
  },
};

function SessionRoom({ viewer = 'mentee', state = 'active', initial }: { viewer?: Viewer; state?: RoomState; initial?: SessionMessage[] }) {
  const [messages, setMessages] = useState<SessionMessage[]>(initial ?? (state === 'before' || state === 'firstReply' || state === 'mentorNoShow' ? [questionMessage] : state === 'menteeNoShow' ? conversation.slice(0, 2) : conversation));
  const [replyTo, setReplyTo] = useState<SessionMessage | undefined>(undefined);
  // A function, not a component declared in render: that would remount the composer on every change.
  const shell = (children: ReactNode) => viewer === 'mentee' ? <MenteeShell>{children}</MenteeShell> : <MentorShell current="#/mentor/sesje">{children}</MentorShell>;
  const other = viewer === 'mentee' ? 'Alex' : 'Kasia';
  if (state === 'missing') return shell(<Stack>
    <h1 className="mentio-public-title">This session is not available</h1>
    <p>It does not exist, or you are not one of its participants.</p>
    <div><Link href={viewer === 'mentee' ? '#/rezerwacje' : '#/mentor/sesje'}>{viewer === 'mentee' ? 'Back to my bookings' : 'Back to my sessions'}</Link></div>
  </Stack>);
  const writable = state === 'active' || state === 'firstReply';
  const status = statusFor(state, viewer);
  const settled = state === 'settling' || state === 'settleFailed';
  return shell(<Stack>
    <div className="mentio-status-heading"><h1 className="mentio-public-title">Session with {other}</h1><StatusBadge {...status} /></div>
    <div className="mentio-session">
      <div className="mentio-session-main">
        {state === 'settling' && <LoadingMessage label="Checking what happened in this session…" />}
        {state === 'settleFailed' && <ErrorMessage title="We could not check this session" message="Check your connection, then try again. Nothing about the session or its payment has changed." onRetry={() => undefined} />}
        {notices[state]?.[viewer]}
        {state === 'menteeNoShow' && viewer === 'mentor' && <EarningsSummary title="Earnings for this session" context="Mentee no-show — the session counts as held" price={{ term: 'Price', amount: '240 zł' }} commission={{ term: 'Mentio’s commission (20%)', amount: '−48 zł' }} share={{ term: 'Your share', amount: '192 zł' }} />}
        {!settled && <section className="mentio-session-main" aria-labelledby="conversation-heading">
          <h2 id="conversation-heading" className="sr-only">Conversation</h2>
          <ol className="mentio-conversation">
            {messages.map(message => <li key={message.id}><Message {...message} reply={writable ? { label: 'Reply', onReply: () => setReplyTo(message) } : undefined} /></li>)}
          </ol>
          {writable && <MessageComposer label="Your message" description="Put code between lines of three backticks (```). Enter adds a line; Ctrl+Enter sends."
            sendLabel="Send" pendingLabel="Sending…" emptyError="Write a message first"
            replyTo={replyTo && { id: replyTo.id, heading: `Replying to ${replyTo.author}`, excerpt: excerptOf(replyTo), cancelLabel: 'Cancel reply', onCancel: () => setReplyTo(undefined) }}
            onSend={body => apiCall('/api/bookings/b2/messages', { method: 'POST', body: { body, replyToId: replyTo?.id ?? null } })}
            onSent={data => {
              // The confirmed message comes back from the server (the mock echoes it).
              const { id, body } = data as { id: string; body: string };
              const author = viewer === 'mentee' ? 'Kasia' : 'Alex';
              const source = replyTo;
              setMessages(list => [...list, { id, author, role: viewer === 'mentee' ? 'Mentee' : 'Mentor', dateTime: '2026-11-06T17:15:00Z', time: '18:15', body,
                replyTo: source && { author: source.author, excerpt: excerptOf(source), href: `#${source.id}`, goToLabel: `Go to ${source.author}’s message` } }]);
              setReplyTo(undefined);
            }} />}
        </section>}
      </div>
      <aside className="mentio-session-aside" aria-label="Session details">
        <BookingSummary title="Session details" facts={[{ term: viewer === 'mentee' ? 'Mentor' : 'Mentee', detail: other }, { term: 'Time', detail: 'Thursday, 6 November, 18:00–18:50 (Warsaw time)' }, { term: 'Length', detail: '50 minutes' }, { term: 'Price', detail: '240 zł' }]}
          textOnlyNote="The session takes place in text only — there is no video call." />
      </aside>
    </div>
  </Stack>);
}

const ok = (data = {}, status = 200) => HttpResponse.json({ ok: true, data }, { status });
const meta = {
  title: 'Product/E04 — The text session/Screens',
  parameters: { layout: 'fullscreen', msw: { handlers: [
    http.post('/api/bookings/:id/messages', async ({ request }) => ok({ id: `message-${Date.now()}`, body: ((await request.json()) as { body: string }).body }, 201)),
  ] } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

async function send(canvasElement: HTMLElement, text: string) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText(/Your message/), text);
  await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
  return canvas;
}

export const MenteeBefore: Story = { name: 'Mentee — before the start', render: () => <SessionRoom state="before" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText(/Your message/)).toBeNull();
    await expect(canvas.getByRole('article', { name: /^Kasia Question sent with the booking/ })).toBeInTheDocument();
  } };
export const MentorBefore: Story = { name: 'Mentor — before the start', render: () => <SessionRoom viewer="mentor" state="before" /> };
export const MentorFirstReply: Story = { name: 'Mentor — started, first reply due (R10)', render: () => <SessionRoom viewer="mentor" state="firstReply" /> };
export const MenteeWaitingForReply: Story = { name: 'Mentee — started, waiting for the first reply', render: () => <SessionRoom state="firstReply" /> };
export const Active: Story = { name: 'Mentee — conversation in progress', render: () => <SessionRoom /> };
export const SendMessage: Story = { name: 'Mentee — send a message', render: () => <SessionRoom />,
  play: async ({ canvasElement }) => {
    const canvas = await send(canvasElement, sentReply);
    await expect(await canvas.findByText(sentReply)).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByLabelText(/Your message/)).toHaveValue(''));
    await expect(canvas.getAllByRole('article')).toHaveLength(5);
  } };
export const ReplyToMessage: Story = { name: 'Mentee — reply to a message', render: () => <SessionRoom />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const source = canvas.getByRole('article', { name: 'Alex Mentor 18:09' });
    await userEvent.click(within(source).getByRole('button', { name: 'Reply' }));
    const field = canvas.getByLabelText(/Your message/);
    await waitFor(() => expect(field).toHaveFocus());
    await expect(field).toHaveAccessibleDescription(/^Replying to Alex\./);
    await userEvent.type(field, sentReply);
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    const sent = await canvas.findByRole('article', { name: 'Kasia Mentee 18:15' });
    await expect(within(sent).getByRole('link', { name: 'Go to Alex’s message' })).toHaveAttribute('href', '#message-4');
    await expect(canvas.queryByText('Replying to Alex')).toBeNull();
  } };
export const CancelReply: Story = { name: 'Mentee — cancel a reply', render: () => <SessionRoom />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(within(canvas.getByRole('article', { name: 'Alex Mentor 18:02' })).getByRole('button', { name: 'Reply' }));
    await expect(await canvas.findByText('Replying to Alex')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel reply' }));
    await expect(canvas.queryByText('Replying to Alex')).toBeNull();
    await expect(canvas.getByLabelText(/Your message/)).toHaveFocus();
  } };
export const SendPending: Story = { name: 'Mentee — sending', render: () => <SessionRoom />,
  parameters: { msw: { handlers: [http.post('/api/bookings/:id/messages', async () => { await delay('infinite'); return ok(); })] } },
  play: async ({ canvasElement }) => { await expect(await (await send(canvasElement, sentReply)).findByRole('button', { name: 'Sending…' })).toHaveAttribute('aria-busy', 'true'); } };
export const SendFailed: Story = { name: 'Mentee — send failed, text kept', render: () => <SessionRoom />,
  parameters: { msw: { handlers: [http.post('/api/bookings/:id/messages', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => {
    const canvas = await send(canvasElement, sentReply);
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Check your connection, then try again.');
    await expect(canvas.getByLabelText(/Your message/)).toHaveValue(sentReply);
    await expect(canvas.getAllByRole('article')).toHaveLength(4);
  } };
export const SendAfterEnd: Story = { name: 'Mentee — session ended while writing', render: () => <SessionRoom />,
  parameters: { msw: { handlers: [http.post('/api/bookings/:id/messages', () => HttpResponse.json({ ok: false, error: { code: 'session_ended', message: 'The session ended at 18:50, so this message was not sent. Your text is still in the field.' } }, { status: 409 }))] } },
  play: async ({ canvasElement }) => {
    const canvas = await send(canvasElement, sentReply);
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The session ended at 18:50');
    await expect(canvas.getByLabelText(/Your message/)).toHaveValue(sentReply);
  } };
export const MentorActive: Story = { name: 'Mentor — conversation in progress', render: () => <SessionRoom viewer="mentor" /> };
export const LongCode: Story = { name: 'Mentee — long code', render: () => <SessionRoom initial={[...conversation, longCodeMessage]} /> };
export const Narrow: Story = { name: 'Mentee — narrow (details after the conversation)', render: () => <SessionRoom initial={[...conversation, longCodeMessage]} />, globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const composer = canvas.getByRole('button', { name: 'Send' });
    const details = canvas.getByRole('complementary', { name: 'Session details' });
    // Q3: details follow the conversation in reading order at every width…
    await expect(composer.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // …and sit below it while there is one column (the side column starts at Tailwind xl, 80rem).
    if (!matchMedia('(min-width: 80rem)').matches) await expect(details.getBoundingClientRect().top).toBeGreaterThan(composer.getBoundingClientRect().bottom);
  } };
export const Ended: Story = { name: 'Ended — read-only transcript', render: () => <SessionRoom state="ended" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText(/Your message/)).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Reply' })).toBeNull();
    await expect(canvas.getByRole('link', { name: 'Go to Alex’s message' })).toHaveAttribute('href', '#message-2');
  } };
export const MentorEnded: Story = { name: 'Mentor — ended transcript', render: () => <SessionRoom viewer="mentor" state="ended" /> };
export const Settling: Story = { name: 'Next visit — checking the outcome', render: () => <SessionRoom state="settling" /> };
export const SettleFailed: Story = { name: 'Next visit — check failed', render: () => <SessionRoom state="settleFailed" /> };
export const MenteeMentorNoShow: Story = { name: 'Next visit — mentee sees a mentor no-show', render: () => <SessionRoom state="mentorNoShow" /> };
export const MentorMentorNoShow: Story = { name: 'Next visit — mentor sees their no-show', render: () => <SessionRoom viewer="mentor" state="mentorNoShow" /> };
export const MentorMenteeNoShow: Story = { name: 'Next visit — mentor sees a mentee no-show', render: () => <SessionRoom viewer="mentor" state="menteeNoShow" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 2, name: 'Earnings for this session' })).toBeInTheDocument();
    await expect(canvas.getByText('192 zł')).toBeInTheDocument();
  } };
export const MenteeMenteeNoShow: Story = { name: 'Next visit — mentee sees their no-show', render: () => <SessionRoom state="menteeNoShow" /> };
export const Missing: Story = { name: 'Not available', render: () => <SessionRoom state="missing" /> };
