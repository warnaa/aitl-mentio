import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import { z } from 'zod';
import { BookingSummary } from '@mentio/ui/components/bookings/BookingSummary';
import { MentorProfile } from '@mentio/ui/components/mentors/MentorProfile';
import { AccountNav } from '@mentio/ui/components/auth/AccountNav';
import { PanelShell } from '@mentio/ui/backend/layout';
import { ActionButton, Link } from '@mentio/ui/backend/actions';
import { CrudForm } from '@mentio/ui/backend/forms';
import { DataTable } from '@mentio/ui/backend/tables';
import { StatusBadge, type StatusTone } from '@mentio/ui/backend/feedback';
import { apiCall } from '@mentio/ui/backend/api';
import { Alert, AlertDescription, AlertTitle } from '@mentio/ui/components/alert';
import { Button } from '@mentio/ui/components/button';
import { bookingFacts as facts, bookingQuestion as question, bookingRows } from '../../fixtures/bookings';
import { profile } from '../../fixtures/mentors';

// E02 screens (book-and-pay UI/UX, API contract, R14 cancellation table). English story copy; the
// status → tone/label map is passed in, as the E02 feature PR's F6 map will be. Success messages stand
// in for navigation. `accepted` (late cancellation) belongs to E03 and is preliminary.
const textOnly = 'The session takes place in text only — there is no video call.';
const Mentee = ({ children }: { children: ReactNode }) => <PanelShell title="Mentio" homeHref="#/rezerwacje" navLabel="Bookings" skipLabel="Skip to content" currentHref="#/rezerwacje"
  items={[{ href: '#/rezerwacje', label: 'My bookings' }]} actions={<Button type="button" variant="ghost" size="sm">Sign out</Button>}>{children}</PanelShell>;
const Stack = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-between-groups">{children}</div>;
const lengthOptions = [{ value: '25', label: '25 minutes — 120 zł' }, { value: '50', label: '50 minutes — 240 zł' }];
const bookingSchema = z.object({
  lengthMinutes: z.enum(['25', '50'], { error: 'Choose 25 or 50 minutes' }),
  question: z.string({ error: 'Write your question' }).trim().min(20, { message: 'Write at least 20 characters so the mentor can prepare' }).max(5000, { message: 'Keep the question under 5,000 characters' }),
});
const bookingFields = [
  { name: 'lengthMinutes' as const, label: 'Session length', type: 'select' as const, placeholder: 'Select a length', options: lengthOptions },
  { name: 'question' as const, label: 'Your question', type: 'textarea' as const, description: 'Paste error messages and code directly; remove passwords and tokens first.' },
];
const cancelRule = 'You can cancel free of charge until the mentor accepts, and after that up to 12 hours before the session.';

// ---- New booking (`/rezerwacje/nowa/[slotId]`) ----
type NewVariant = 'form' | 'unavailable' | 'unpaid' | 'disabled';
function NewBooking({ variant = 'form' }: { variant?: NewVariant }) {
  const [outcome, setOutcome] = useState<'created' | 'slot_taken' | 'unpaid_booking_exists' | null>(null);
  let body: ReactNode;
  if (variant === 'unavailable') body = <Alert variant="destructive"><AlertTitle>This slot is no longer available</AlertTitle><AlertDescription><Link href="#/mentorzy/alex">Back to Alex’s page</Link></AlertDescription></Alert>;
  else if (variant === 'unpaid' || outcome === 'unpaid_booking_exists') body = <Alert role={variant === 'unpaid' ? 'note' : 'alert'}><AlertTitle>You already have an unpaid booking</AlertTitle><AlertDescription>Pay for it or abandon it before booking another time. <Link href={variant === 'unpaid' ? '#/rezerwacje/b1/platnosc' : '#/rezerwacje'}>{variant === 'unpaid' ? 'Go to its payment' : 'Go to my bookings'}</Link></AlertDescription></Alert>;
  else if (variant === 'disabled') body = <Alert role="note"><AlertTitle>Bookings are temporarily switched off</AlertTitle><AlertDescription>Your existing bookings and payments are unaffected.</AlertDescription></Alert>;
  else if (outcome === 'slot_taken') body = <Alert variant="destructive"><AlertTitle>This slot was just taken</AlertTitle><AlertDescription><Link href="#/mentorzy/alex">Choose another time on Alex’s page</Link></AlertDescription></Alert>;
  else if (outcome === 'created') body = <Alert role="status"><AlertTitle>Booking created</AlertTitle><AlertDescription>Taking you to the payment.</AlertDescription></Alert>;
  else body = <><CrudForm schema={bookingSchema} fields={bookingFields} submitLabel="Continue to payment" onSuccess={() => setOutcome('created')}
      onSubmit={async values => {
        const result = await apiCall('/api/bookings', { method: 'POST', body: { slotId: 's1', lengthMinutes: Number(values.lengthMinutes), question: values.question, displayedPriceGrosze: values.lengthMinutes === '50' ? 24000 : 12000 } });
        if (!result.ok && (result.error.code === 'slot_taken' || result.error.code === 'unpaid_booking_exists')) setOutcome(result.error.code);
        return result;
      }} />
    <p className="mentio-field-description">{cancelRule}</p></>;
  return <Mentee><Stack>
    <BookingSummary title="Text session with Alex" headingLevel={1} facts={facts.slice(1, 2)} textOnlyNote={textOnly} />
    {body}
  </Stack></Mentee>;
}

// ---- Payment (`/rezerwacje/[id]/platnosc`) ----
type PayState = 'awaiting' | 'paying' | 'declined' | 'cutoff' | 'expired';
function Payment({ state = 'awaiting', priceNotice = false }: { state?: PayState; priceNotice?: boolean }) {
  const [current, setCurrent] = useState<PayState | 'paid' | 'abandoned'>(state);
  const [editing, setEditing] = useState(false);
  const price = priceNotice ? '300 zł' : '240 zł';
  const settle = <ActionButton label="Try again" variant="outline" pendingLabel="Checking…" run={() => apiCall('/api/bookings/b1/settle', { method: 'POST' })} />;
  const abandon = (pending: boolean) => <ActionButton label="Abandon booking" variant="outline" pendingLabel="Abandoning…" onSuccess={() => setCurrent('abandoned')}
    run={() => apiCall('/api/bookings/b1/cancel', { method: 'POST', body: { expectedOutcome: pending ? 'full_refund' : 'release' } })}
    confirm={{ title: 'Abandon this booking?', description: pending ? 'We will release the slot right away. If the payment is confirmed, you will get a full refund.' : 'We will release the slot right away.', confirmLabel: 'Abandon booking', cancelLabel: 'Keep booking' }} />;
  let body: ReactNode;
  if (current === 'paid') body = <Alert role="status"><AlertTitle>Paid</AlertTitle><AlertDescription>Taking you to the booking.</AlertDescription></Alert>;
  else if (current === 'abandoned') body = <Alert role="status"><AlertTitle>Booking abandoned</AlertTitle><AlertDescription>The slot was released. <Link href="#/mentorzy/alex">Back to Alex’s page</Link></AlertDescription></Alert>;
  else if (current === 'declined') body = <Alert variant="destructive"><AlertTitle>Payment declined — the slot was released</AlertTitle><AlertDescription>No money was taken. <Link href="#/mentorzy/alex">Choose a time again on Alex’s page</Link></AlertDescription></Alert>;
  else if (current === 'expired') body = <Alert variant="destructive"><AlertTitle>Payment time has run out</AlertTitle><AlertDescription>The slot was released. <Link href="#/mentorzy/alex">Back to Alex’s page</Link></AlertDescription></Alert>;
  else if (current === 'cutoff') body = <Stack><Alert variant="destructive"><AlertTitle>The payment was not confirmed before the session — the booking has ended</AlertTitle><AlertDescription>Charge: confirmed. Refund: in progress — we have not received its result yet.</AlertDescription></Alert>{settle}</Stack>;
  else if (current === 'paying') body = <Stack><Alert role="status"><AlertTitle>Payment in progress…</AlertTitle><AlertDescription>Your slot stays reserved until the session starts at 18:00. We have not received the result yet.</AlertDescription></Alert><div className="flex flex-wrap gap-within-group">{settle}{abandon(true)}</div></Stack>;
  else body = <Stack>
    {priceNotice && <Alert role="note"><AlertTitle>The price changed in the meantime: before 240 zł, now 300 zł</AlertTitle><AlertDescription>The mentor changed their rate. The new price applies to the length you chose.</AlertDescription></Alert>}
    <p>Your slot is held for you until 18:32.</p>
    <div className="flex flex-wrap items-start gap-within-group">
      <ActionButton label={`Pay ${price}`} pendingLabel="Paying…" onSuccess={() => setCurrent('paid')} run={() => apiCall('/api/bookings/b1/pay', { method: 'POST', body: { expectedRevision: 1 } })} />
      {abandon(false)}
      <Button type="button" variant="ghost" aria-expanded={editing} onClick={() => setEditing(open => !open)}>Edit question or length</Button>
    </div>
    {editing && <CrudForm schema={bookingSchema} fields={bookingFields} submitLabel="Save changes" initialValues={{ lengthMinutes: '50', question }} onCancel={() => setEditing(false)} onSuccess={() => setEditing(false)}
      onSubmit={values => apiCall('/api/bookings/b1', { method: 'PUT', body: { expectedRevision: 1, lengthMinutes: Number(values.lengthMinutes), question: values.question } })} />}
  </Stack>;
  return <Mentee><Stack>
    <Alert role="note"><AlertTitle>Simulated payment — no money is charged</AlertTitle></Alert>
    <BookingSummary title="Pay for your booking" headingLevel={1} facts={[...facts.slice(0, 3), { term: 'Price', detail: price }]} textOnlyNote={textOnly} />
    {body}
  </Stack></Mentee>;
}

// ---- Booking details (`/rezerwacje/[id]`) ----
type DetailState = 'paid' | 'acceptedLate' | 'refundPending' | 'refunded' | 'refundFailed' | 'abandonedPending' | 'started';
const detailStatus: Record<DetailState, { tone: StatusTone; label: string }> = {
  paid: { tone: 'waiting', label: 'Awaiting mentor decision' },
  acceptedLate: { tone: 'success', label: 'Accepted (E03 label pending)' },
  refundPending: { tone: 'waiting', label: 'Cancelled — refund in progress' },
  refunded: { tone: 'neutral', label: 'Cancelled — refunded' },
  refundFailed: { tone: 'danger', label: 'Refund failed' },
  abandonedPending: { tone: 'waiting', label: 'Abandoned — waiting for payment confirmation' },
  started: { tone: 'success', label: 'Accepted (E03 label pending)' },
};
function Details({ state = 'paid' }: { state?: DetailState }) {
  const [current, setCurrent] = useState<DetailState>(state);
  const moneyFact = { paid: 'Paid 240 zł', acceptedLate: 'Paid 240 zł', refundPending: 'Refund of 240 zł started', refunded: 'Refunded 240 zł', refundFailed: 'Refund failed', abandonedPending: 'Charge not confirmed yet', started: 'Paid 240 zł' }[current];
  const late = current === 'acceptedLate';
  return <Mentee><Stack>
    <BookingSummary title="Booking with Alex" headingLevel={1} status={detailStatus[current]} facts={[...facts, { term: 'Payment', detail: moneyFact }]} question={{ heading: 'Your question', text: question }} textOnlyNote={textOnly} />
    {(current === 'paid' || late) && <ActionButton label="Cancel booking" variant="outline" pendingLabel="Cancelling…" onSuccess={() => setCurrent(late ? 'refunded' : 'refundPending')}
      run={() => apiCall('/api/bookings/b1/cancel', { method: 'POST', body: { expectedOutcome: late ? 'no_refund' : 'full_refund' } })}
      confirm={{ title: 'Cancel your booking with Alex on 6 November at 18:00?', description: late ? 'Less than 12 hours remain before the session — cancelling gives no refund, and the mentor is paid.' : 'You will receive a full refund of 240 zł.', confirmLabel: 'Cancel booking', cancelLabel: 'Keep booking' }} />}
    {current === 'started' && <ActionButton label="Cancel booking" variant="outline" run={async () => ({ ok: true as const, data: null, status: 200 })} disabled disabledReason="The session has started, so the booking can no longer be cancelled." />}
    {current === 'refundFailed' && <Alert variant="destructive"><AlertTitle>Refund failed</AlertTitle><AlertDescription>The refund of 240 zł did not go through. Your booking stays cancelled.</AlertDescription></Alert>}
    {(current === 'refundPending' || current === 'abandonedPending') && <div><ActionButton label="Try again" variant="outline" pendingLabel="Checking…" run={() => apiCall('/api/bookings/b1/settle', { method: 'POST' })} /></div>}
  </Stack></Mentee>;
}

// ---- Bookings list (`/rezerwacje`) ----
const BookingsList = ({ rows = bookingRows }: { rows?: typeof bookingRows }) => <Mentee><Stack>
  <h1 className="mentio-public-title">My bookings</h1>
  <DataTable rows={rows} getRowId={row => row.id} emptyTitle="You have no bookings yet" emptyDescription="When you book a text session with a mentor, it appears here."
    columns={[{ id: 'time', header: 'Time', className: 'tabular-nums', cell: row => row.time }, { id: 'mentor', header: 'Mentor', cell: row => row.mentor },
      { id: 'status', header: 'Status', cell: row => <StatusBadge tone={row.tone} label={row.status} /> },
      { id: 'link', header: <span className="sr-only">Details</span>, cell: row => <Link href={`#/rezerwacje/${row.id}`}>View booking<span className="sr-only"> with {row.mentor} on {row.time}</span></Link> }]} />
</Stack></Mentee>;

const ok = (data: JsonBodyType = {}, status = 200) => HttpResponse.json({ ok: true, data }, { status });
const fail = (status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) => HttpResponse.json({ ok: false, error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } }, { status });
const meta = {
  title: 'Product/E02 — Book and pay/Screens',
  parameters: { layout: 'fullscreen', msw: { handlers: [
    http.post('/api/bookings', () => ok({ id: 'b1', status: 'awaiting_payment' }, 201)), http.put('/api/bookings/:id', () => ok({ id: 'b1' })),
    http.post('/api/bookings/:id/pay', () => ok({ id: 'b1', status: 'paid' })), http.post('/api/bookings/:id/cancel', () => ok({ id: 'b1' })), http.post('/api/bookings/:id/settle', () => ok({ id: 'b1' })),
  ] } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

async function fillBooking(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('combobox', { name: 'Session length' }));
  await userEvent.click(await within(document.body).findByRole('option', { name: '50 minutes — 240 zł' }));
  await userEvent.type(canvas.getByLabelText('Your question'), 'The ingress stopped responding after the cluster upgrade.');
  await userEvent.click(canvas.getByRole('button', { name: 'Continue to payment' }));
  return canvas;
}

export const MentorPageBookLinks: Story = { name: 'Mentor page — bookable slots link to booking',
  render: () => <div className="min-h-dvh bg-background text-foreground"><AccountNav brand={{ href: '#/', label: 'Mentio' }} navLabel="Account" signedIn signIn={{ href: '#', label: 'Sign in' }} signUp={{ href: '#', label: 'Create account' }} signOut={<Button type="button" variant="ghost" size="sm">Sign out</Button>} />
    <main><MentorProfile {...profile} slots={{ ...profile.slots, bookLabel: 'Book', days: profile.slots.days.map(day => ({ ...day, slots: day.slots.map(slot => ({ ...slot, href: `#/rezerwacje/nowa/${slot.id}` })) })) }} /></main></div> };
export const NewBookingForm: Story = { name: 'New booking — form', render: () => <NewBooking /> };
export const NewBookingValidation: Story = { name: 'New booking — validation', render: () => <NewBooking />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Your question'), 'Ingress is down');
    await userEvent.click(canvas.getByRole('button', { name: 'Continue to payment' }));
    await expect(await canvas.findByText('Choose 25 or 50 minutes')).toBeInTheDocument();
    await expect(canvas.getByText('Write at least 20 characters so the mentor can prepare')).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByRole('combobox', { name: 'Session length' })).toHaveFocus());
  } };
export const NewBookingPending: Story = { name: 'New booking — pending', render: () => <NewBooking />,
  parameters: { msw: { handlers: [http.post('/api/bookings', async () => { await delay('infinite'); return ok(); })] } },
  play: async ({ canvasElement }) => { await expect(await (await fillBooking(canvasElement)).findByRole('button', { name: 'Saving…' })).toBeDisabled(); } };
export const NewBookingCreated: Story = { name: 'New booking — created (stands in for navigation)', render: () => <NewBooking />,
  play: async ({ canvasElement }) => { await expect(await (await fillBooking(canvasElement)).findByRole('status')).toHaveTextContent('Booking created'); } };
export const NewBookingSlotTaken: Story = { name: 'New booking — slot just taken', render: () => <NewBooking />,
  parameters: { msw: { handlers: [http.post('/api/bookings', () => fail(409, 'slot_taken', 'This slot was just taken.'))] } },
  play: async ({ canvasElement }) => {
    const canvas = await fillBooking(canvasElement);
    await expect(await canvas.findByRole('alert')).toHaveTextContent('This slot was just taken');
    await expect(canvas.getByRole('link', { name: 'Choose another time on Alex’s page' })).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Continue to payment' })).toBeNull();
  } };
export const NewBookingUnpaidRace: Story = { name: 'New booking — unpaid booking found on submit', render: () => <NewBooking />,
  parameters: { msw: { handlers: [http.post('/api/bookings', () => fail(409, 'unpaid_booking_exists', 'You already have an unpaid booking.'))] } },
  play: async ({ canvasElement }) => {
    const canvas = await fillBooking(canvasElement);
    await expect(await canvas.findByRole('alert')).toHaveTextContent('You already have an unpaid booking');
    await expect(canvas.getByRole('link', { name: 'Go to my bookings' })).toBeInTheDocument();
  } };
export const NewBookingNetworkError: Story = { name: 'New booking — network error', render: () => <NewBooking />,
  parameters: { msw: { handlers: [http.post('/api/bookings', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => { await expect(await (await fillBooking(canvasElement)).findByRole('alert')).toHaveTextContent('Check your connection, then try again.'); } };
export const NewBookingUnavailable: Story = { name: 'New booking — slot no longer available', render: () => <NewBooking variant="unavailable" /> };
export const NewBookingUnpaidExists: Story = { name: 'New booking — unpaid booking exists (no form)', render: () => <NewBooking variant="unpaid" /> };
export const NewBookingDisabled: Story = { name: 'New booking — bookings switched off', render: () => <NewBooking variant="disabled" /> };
export const NewBookingNarrow: Story = { name: 'New booking — narrow', render: () => <NewBooking />, globals: { viewport: { value: 'mobile1', isRotated: false } } };

export const PaymentAwaiting: Story = { name: 'Payment — awaiting payment', render: () => <Payment /> };
export const PaymentPriceChanged: Story = { name: 'Payment — price changed notice', render: () => <Payment priceNotice /> };
export const PaymentPaid: Story = { name: 'Payment — paid (stands in for navigation)', render: () => <Payment />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 240 zł' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('Paid');
  } };
export const PaymentEditInline: Story = { name: 'Payment — edit question or length', render: () => <Payment />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: 'Edit question or length' });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByLabelText('Your question')).toHaveValue(question);
  } };
export const PaymentBookingChanged: Story = { name: 'Payment — changed in another tab', render: () => <Payment />,
  parameters: { msw: { handlers: [http.put('/api/bookings/:id', () => fail(409, 'booking_changed', 'This booking changed in another tab. We refreshed it — check the details and save again.'))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Edit question or length' }));
    await userEvent.type(canvas.getByLabelText('Your question'), '\nAlso: the TLS secret was rotated.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('changed in another tab');
    await expect(canvas.getByLabelText('Your question')).toHaveValue(`${question}\nAlso: the TLS secret was rotated.`);
  } };
export const PaymentPayFailed: Story = { name: 'Payment — pay request failed', render: () => <Payment />,
  parameters: { msw: { handlers: [http.post('/api/bookings/:id/pay', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 240 zł' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Check your connection, then try again.');
  } };
export const PaymentAbandon: Story = { name: 'Payment — abandon with confirmation', render: () => <Payment />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Abandon booking' }));
    const dialog = await within(document.body).findByRole('alertdialog', { name: 'Abandon this booking?' });
    await expect(dialog).toHaveAccessibleDescription('We will release the slot right away.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Abandon booking' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('Booking abandoned');
  } };
export const PaymentInProgress: Story = { name: 'Payment — in progress', render: () => <Payment state="paying" /> };
export const PaymentInProgressAbandon: Story = { name: 'Payment — abandon while in progress', render: () => <Payment state="paying" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Abandon booking' }));
    const dialog = await within(document.body).findByRole('alertdialog');
    await expect(dialog).toHaveAccessibleDescription('We will release the slot right away. If the payment is confirmed, you will get a full refund.');
  } };
export const PaymentDeclined: Story = { name: 'Payment — declined', render: () => <Payment state="declined" /> };
export const PaymentCutoff: Story = { name: 'Payment — not confirmed before the session', render: () => <Payment state="cutoff" /> };
export const PaymentExpired: Story = { name: 'Payment — time ran out', render: () => <Payment state="expired" /> };
export const PaymentNarrow: Story = { name: 'Payment — narrow, price changed', render: () => <Payment priceNotice />, globals: { viewport: { value: 'mobile1', isRotated: false } } };

export const DetailsAwaitingDecision: Story = { name: 'Details — awaiting mentor decision', render: () => <Details /> };
export const DetailsCancelFullRefund: Story = { name: 'Details — cancel with full refund', render: () => <Details />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel booking' }));
    const dialog = await within(document.body).findByRole('alertdialog');
    await expect(dialog).toHaveAccessibleDescription('You will receive a full refund of 240 zł.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));
    await expect(await canvas.findByText('Cancelled — refund in progress')).toBeInTheDocument();
    await expect(canvas.getByText('Refund of 240 zł started')).toBeInTheDocument();
  } };
export const DetailsCancelLate: Story = { name: 'Details — late cancellation, no refund (E03 preliminary)', render: () => <Details state="acceptedLate" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Cancel booking' }));
    await expect(await within(document.body).findByRole('alertdialog')).toHaveAccessibleDescription(/no refund, and the mentor is paid/);
  } };
export const DetailsOutcomeChanged: Story = { name: 'Details — cancellation terms changed', render: () => <Details />,
  parameters: { msw: { handlers: [http.post('/api/bookings/:id/cancel', () => fail(409, 'cancel_outcome_changed', 'The cancellation terms changed. Check the new terms and confirm again.'))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(within(await within(document.body).findByRole('alertdialog')).getByRole('button', { name: 'Cancel booking' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The cancellation terms changed');
    await expect(canvas.getByText('Awaiting mentor decision')).toBeInTheDocument();
  } };
export const DetailsRefundPending: Story = { name: 'Details — refund in progress', render: () => <Details state="refundPending" /> };
export const DetailsRefunded: Story = { name: 'Details — refunded', render: () => <Details state="refunded" /> };
export const DetailsRefundFailed: Story = { name: 'Details — refund failed', render: () => <Details state="refundFailed" /> };
export const DetailsAbandonedPending: Story = { name: 'Details — abandoned, payment unconfirmed', render: () => <Details state="abandonedPending" /> };
export const DetailsStarted: Story = { name: 'Details — session started, cancel unavailable', render: () => <Details state="started" />,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Cancel booking' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAccessibleDescription('The session has started, so the booking can no longer be cancelled.');
  } };
export const DetailsNarrow: Story = { name: 'Details — narrow', render: () => <Details />, globals: { viewport: { value: 'mobile1', isRotated: false } } };

export const ListBookings: Story = { name: 'Bookings list — unpaid first', render: () => <BookingsList /> };
export const ListEmpty: Story = { name: 'Bookings list — none yet', render: () => <BookingsList rows={[]} /> };
export const ListNarrow: Story = { name: 'Bookings list — narrow', render: () => <BookingsList />, globals: { viewport: { value: 'mobile1', isRotated: false } } };
