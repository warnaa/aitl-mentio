import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { BookingSummary } from '@mentio/ui/components/bookings/BookingSummary';
import { Message } from '@mentio/ui/components/messages/Message';
import { ActionButton, Link } from '@mentio/ui/backend/actions';
import { DataTable } from '@mentio/ui/backend/tables';
import { StatusBadge, type StatusTone } from '@mentio/ui/backend/feedback';
import { apiCall } from '@mentio/ui/backend/api';
import { Alert, AlertDescription, AlertTitle } from '@mentio/ui/components/alert';
import { mentorSessionRows, questionMessage } from '../../fixtures/sessions';
import { bookingFacts, bookingQuestion } from '../../fixtures/bookings';
import { MenteeShell, MentorShell, Stack } from '../shells';

// E03 screens — PRELIMINARY. No E03 spec exists. Sources: E03-S01, R09, R12, R14, D19 and the
// book-and-pay spec's contract with E03 (`accepted`/`declined`, decline refunds through the booking's
// one refund, R12 applied before accepting, settle widened to the mentor). Decided 2026-11-01 (no spec yet): the routes
// `/mentor/sesje` and `/mentor/sesje/[id]`, `POST /api/bookings/[id]/accept|decline` and the
// 409 code `booking_not_decidable`. English story copy; success messages stand in for navigation.
const textOnly = 'The session takes place in text only — there is no video call.';
const Mentor = MentorShell;

// ---- My sessions (`/mentor/sesje`) ----
type ListState = 'rows' | 'empty' | 'loading' | 'error';
const SessionsList = ({ state = 'rows' }: { state?: ListState }) => <Mentor current="#/mentor/sesje"><Stack>
  <h1 className="mentio-public-title">My sessions</h1>
  <p className="mentio-public-lead">Paid questions waiting for your decision come first. A question you do not accept before its session starts is declined and refunded.</p>
  <DataTable rows={state === 'loading' ? undefined : state === 'empty' ? [] : mentorSessionRows} getRowId={row => row.id}
    error={state === 'error' ? 'We could not load your sessions. Check your connection, then try again.' : null} onRetry={() => undefined}
    emptyTitle="No paid questions yet" emptyDescription="When a mentee books one of your slots and pays, their question appears here. Share your page link to get the first booking."
    columns={[{ id: 'time', header: 'Time', className: 'tabular-nums', cell: row => <>{row.time}<span className="mentio-field-description"> · {row.length}</span></> }, { id: 'mentee', header: 'Mentee', cell: row => row.mentee },
      { id: 'status', header: 'Status', cell: row => <StatusBadge tone={row.tone} label={row.status} /> },
      { id: 'link', header: <span className="sr-only">Details</span>, cell: row => <Link href={`#/mentor/sesje/${row.id}`}>{row.tone === 'waiting' ? 'Read the question' : 'View'}<span className="sr-only"> from {row.mentee}, {row.time}</span></Link> }]} />
</Stack></Mentor>;

// ---- Decision (`/mentor/sesje/[id]`) ----
type DecisionState = 'awaiting' | 'accepted' | 'declined' | 'refundFailed' | 'notAccepted' | 'cancelledByMentee' | 'missing';
const decisionStatus: Record<Exclude<DecisionState, 'missing'>, { tone: StatusTone; label: string }> = {
  awaiting: { tone: 'waiting', label: 'Awaiting your decision' },
  accepted: { tone: 'success', label: 'Accepted' },
  declined: { tone: 'neutral', label: 'Declined — refund started' },
  refundFailed: { tone: 'danger', label: 'Declined — refund failed' },
  notAccepted: { tone: 'neutral', label: 'Not accepted in time — refund started' },
  cancelledByMentee: { tone: 'neutral', label: 'Cancelled by the mentee' },
};
const facts = [
  { term: 'Time', detail: 'Thursday, 6 November, 18:00 (Warsaw time)' },
  { term: 'Length', detail: '50 minutes' },
  { term: 'Price', detail: '240 zł' },
  { term: 'Your share', detail: '192 zł after Mentio’s 20% commission' },
];
function Decision({ state = 'awaiting' }: { state?: DecisionState }) {
  const [current, setCurrent] = useState<DecisionState>(state);
  if (current === 'missing') return <Mentor current="#/mentor/sesje"><Stack>
    <h1 className="mentio-public-title">This question is not available</h1>
    <p>It does not exist, or it was booked with another mentor.</p>
    <div><Link href="#/mentor/sesje">Back to my sessions</Link></div>
  </Stack></Mentor>;
  // A refused decision means the booking changed meanwhile (here: R12 applied at the start); the screen refreshes.
  const refresh = (code: string) => { if (code === 'booking_not_decidable') setCurrent('notAccepted'); };
  return <Mentor current="#/mentor/sesje"><Stack>
    <BookingSummary title="Question from Kasia" headingLevel={1} status={decisionStatus[current]} facts={current === 'awaiting' || current === 'accepted' ? facts : [...facts.slice(0, 3), { term: 'Payment', detail: current === 'refundFailed' ? 'Refund failed' : current === 'cancelledByMentee' ? 'Refunded to Kasia' : 'Refund of 240 zł to Kasia started' }]} textOnlyNote={textOnly} />
    {current === 'awaiting' && <section className="flex flex-col gap-within-group" aria-label="Your decision">
      <p className="mentio-field-description">Accept if you can answer in a 50-minute text session. If you do not accept before the session starts, the booking is declined and Kasia gets a full refund.</p>
      <div className="flex flex-wrap items-start gap-within-group">
        <ActionButton label="Accept question" pendingLabel="Accepting…" onSuccess={() => setCurrent('accepted')} onError={error => refresh(error.code)}
          run={() => apiCall('/api/bookings/b2/accept', { method: 'POST' })} />
        <ActionButton label="Decline" variant="outline" pendingLabel="Declining…" onSuccess={() => setCurrent('declined')} onError={error => refresh(error.code)}
          run={() => apiCall('/api/bookings/b2/decline', { method: 'POST' })}
          confirm={{ title: 'Decline Kasia’s question for 6 November at 18:00?', description: 'Kasia gets a full refund of 240 zł at once, and your slot becomes free to book again.', confirmLabel: 'Decline and refund', cancelLabel: 'Keep question' }} />
      </div>
    </section>}
    {current === 'accepted' && <Alert role="status"><AlertTitle>You accepted the question</AlertTitle><AlertDescription>The session starts on 6 November at 18:00. Kasia can still cancel free of charge until 06:00 that day; a later cancellation counts as a no-show, and you are paid.</AlertDescription></Alert>}
    {current === 'notAccepted' && <Alert variant="destructive"><AlertTitle>The session started before you accepted</AlertTitle><AlertDescription>The booking was declined, and Kasia’s refund of 240 zł has started.</AlertDescription></Alert>}
    {current === 'cancelledByMentee' && <Alert role="note"><AlertTitle>Kasia cancelled this booking before you decided</AlertTitle><AlertDescription>Nothing else to do. Your slot is free to book again.</AlertDescription></Alert>}
    {current === 'refundFailed' && <Stack><Alert variant="destructive"><AlertTitle>The refund to Kasia did not go through</AlertTitle><AlertDescription>The booking stays declined. Try again to retry the refund.</AlertDescription></Alert>
      <div><ActionButton label="Try again" variant="outline" pendingLabel="Checking…" run={() => apiCall('/api/bookings/b2/settle', { method: 'POST' })} /></div></Stack>}
    <section className="flex flex-col gap-within-group" aria-labelledby="question-heading">
      <h2 id="question-heading" className="mentio-public-heading">Kasia’s question</h2>
      <ol className="mentio-conversation"><li><Message {...questionMessage} /></li></ol>
    </section>
  </Stack></Mentor>;
}

// ---- The mentee's booking details after a decision (`/rezerwacje/[id]`, E02 screen) ----
type MenteeOutcome = 'accepted' | 'declined' | 'notAccepted';
const menteeOutcome: Record<MenteeOutcome, { status: { tone: StatusTone; label: string }; payment: string; notice?: ReactNode }> = {
  accepted: { status: { tone: 'success', label: 'Accepted' }, payment: 'Paid 240 zł',
    notice: <Alert role="note"><AlertTitle>Alex accepted your question</AlertTitle><AlertDescription>The session starts on 6 November at 18:00. You can cancel free of charge until 06:00 that day.</AlertDescription></Alert> },
  declined: { status: { tone: 'neutral', label: 'Declined — refund started' }, payment: 'Refund of 240 zł started',
    notice: <Alert role="note"><AlertTitle>Alex declined your question</AlertTitle><AlertDescription>Your refund of 240 zł has started. <Link href="#/mentorzy">Find another mentor</Link></AlertDescription></Alert> },
  notAccepted: { status: { tone: 'neutral', label: 'Not accepted in time — refund started' }, payment: 'Refund of 240 zł started',
    notice: <Alert role="note"><AlertTitle>Alex did not accept before the session started</AlertTitle><AlertDescription>The booking was declined, and your refund of 240 zł has started. <Link href="#/mentorzy/alex">Choose another time on Alex’s page</Link></AlertDescription></Alert> },
};
const MenteeBooking = ({ outcome }: { outcome: MenteeOutcome }) => <MenteeShell><Stack>
  <BookingSummary title="Booking with Alex" headingLevel={1} status={menteeOutcome[outcome].status} facts={[...bookingFacts, { term: 'Payment', detail: menteeOutcome[outcome].payment }]}
    question={{ heading: 'Your question', text: bookingQuestion }} textOnlyNote={textOnly} />
  {menteeOutcome[outcome].notice}
</Stack></MenteeShell>;

const ok = (data = {}, status = 200) => HttpResponse.json({ ok: true, data }, { status });
const fail = (status: number, code: string, message: string) => HttpResponse.json({ ok: false, error: { code, message } }, { status });
const meta = {
  title: 'Product/E03 — Mentor decides/Screens',
  parameters: { layout: 'fullscreen', msw: { handlers: [
    http.post('/api/bookings/:id/accept', () => ok({ id: 'b2', status: 'accepted' })), http.post('/api/bookings/:id/decline', () => ok({ id: 'b2', status: 'declined' })),
    http.post('/api/bookings/:id/settle', () => ok({ id: 'b2' })),
  ] } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ListSessions: Story = { name: 'My sessions — awaiting decisions first', render: () => <SessionsList /> };
export const ListEmpty: Story = { name: 'My sessions — none yet', render: () => <SessionsList state="empty" /> };
export const ListLoading: Story = { name: 'My sessions — loading', render: () => <SessionsList state="loading" /> };
export const ListError: Story = { name: 'My sessions — failed to load', render: () => <SessionsList state="error" /> };
export const ListNarrow: Story = { name: 'My sessions — narrow', render: () => <SessionsList />, globals: { viewport: { value: 'mobile1', isRotated: false } } };

export const DecisionAwaiting: Story = { name: 'Decision — awaiting your decision', render: () => <Decision />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const accept = canvas.getByRole('button', { name: 'Accept question' });
    // Task detail pattern: the main action is visible without scrolling; the question follows it.
    await expect(accept.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    await expect(canvas.getByRole('heading', { level: 2, name: 'Kasia’s question' }).getBoundingClientRect().top).toBeGreaterThan(accept.getBoundingClientRect().top);
    await expect(canvas.getByText('192 zł after Mentio’s 20% commission')).toBeInTheDocument();
  } };
export const DecisionAccept: Story = { name: 'Decision — accept', render: () => <Decision />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Accept question' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('You accepted the question');
    await expect(canvas.getByText('Accepted')).toHaveAttribute('data-tone', 'success');
    await expect(canvas.queryByRole('button', { name: 'Decline' })).toBeNull();
  } };
export const DecisionAcceptPending: Story = { name: 'Decision — accepting', render: () => <Decision />,
  parameters: { msw: { handlers: [http.post('/api/bookings/:id/accept', async () => { await delay('infinite'); return ok(); })] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Accept question' }));
    await expect(await canvas.findByRole('button', { name: 'Accepting…' })).toHaveAttribute('aria-busy', 'true');
  } };
export const DecisionDecline: Story = { name: 'Decision — decline with refund', render: () => <Decision />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Decline' }));
    const dialog = await within(document.body).findByRole('alertdialog', { name: 'Decline Kasia’s question for 6 November at 18:00?' });
    await expect(dialog).toHaveAccessibleDescription('Kasia gets a full refund of 240 zł at once, and your slot becomes free to book again.');
    await expect(within(dialog).getByRole('button', { name: 'Keep question' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Decline and refund' }));
    await expect(await canvas.findByText('Declined — refund started')).toBeInTheDocument();
    await expect(canvas.getByText('Refund of 240 zł to Kasia started')).toBeInTheDocument();
  } };
export const DecisionTooLate: Story = { name: 'Decision — session already started (R12)', render: () => <Decision />,
  parameters: { msw: { handlers: [http.post('/api/bookings/:id/accept', () => fail(409, 'booking_not_decidable', 'The session has already started, so the booking was declined and refunded.'))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Accept question' }));
    await expect(await canvas.findByText('Not accepted in time — refund started')).toBeInTheDocument();
    await expect(canvas.getByText('The session started before you accepted')).toBeInTheDocument();
  } };
export const DecisionNetworkError: Story = { name: 'Decision — network error', render: () => <Decision />,
  parameters: { msw: { handlers: [http.post('/api/bookings/:id/accept', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Accept question' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Check your connection, then try again.');
    await expect(canvas.getByText('Awaiting your decision')).toBeInTheDocument();
  } };
export const DecisionAccepted: Story = { name: 'Decision — accepted (before the session)', render: () => <Decision state="accepted" /> };
export const DecisionCancelledByMentee: Story = { name: 'Decision — cancelled by the mentee', render: () => <Decision state="cancelledByMentee" /> };
export const DecisionNotAccepted: Story = { name: 'Decision — not accepted in time (R12, next visit)', render: () => <Decision state="notAccepted" /> };
export const DecisionRefundFailed: Story = { name: 'Decision — declined, refund failed', render: () => <Decision state="refundFailed" /> };
export const DecisionMissing: Story = { name: 'Decision — not available', render: () => <Decision state="missing" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'This question is not available' })).toBeInTheDocument();
    await expect(canvas.queryByText(/Kasia/)).toBeNull();
  } };
export const DecisionNarrow: Story = { name: 'Decision — narrow', render: () => <Decision />, globals: { viewport: { value: 'mobile1', isRotated: false } } };

export const MenteeAccepted: Story = { name: 'Mentee — accepted', render: () => <MenteeBooking outcome="accepted" /> };
export const MenteeDeclined: Story = { name: 'Mentee — declined, refund started', render: () => <MenteeBooking outcome="declined" /> };
export const MenteeNotAccepted: Story = { name: 'Mentee — not accepted in time (R12, next visit)', render: () => <MenteeBooking outcome="notAccepted" /> };
