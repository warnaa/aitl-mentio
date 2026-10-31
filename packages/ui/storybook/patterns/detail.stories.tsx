import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { ActionButton, Link } from '@mentio/ui/backend/actions';
import { apiCall } from '@mentio/ui/backend/api';
import { ErrorMessage, StatusBadge } from '@mentio/ui/backend/feedback';
import { Alert, AlertTitle } from '@mentio/ui/components/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@mentio/ui/components/card';
import { Skeleton } from '@mentio/ui/components/skeleton';

// `/rezerwacje/[id]` (book-and-pay UI/UX): status, mentor, time, length, price, the full question
// (pre-wrapped, monospace code), N01 line; payment action for an unpaid booking. English story copy.
const question = `The ingress stopped responding after the cluster upgrade.

kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since=1h
W1031 18:02:11 controller.go:1214 Service "shop/api" does not have any active Endpoint

What I checked: the pods are Running and the Service selector matches.`;

function BookingDetail({ longQuestion = false }: { longQuestion?: boolean }) {
  return <article className="primitive-demo flex flex-col gap-between-groups" aria-labelledby="booking-title">
    <div className="flex flex-wrap items-center gap-within-group">
      <h1 id="booking-title" className="text-2xl font-semibold">Booking with Alex</h1>
      <StatusBadge tone="waiting" label="Awaiting payment" />
    </div>
    <p>Thursday, 6 November 2026, 18:00 (Warsaw time) · 50 minutes · 240 zł</p>
    <ActionButton label="Pay 240 zł" pendingLabel="Paying…" run={() => apiCall('/api/bookings/b1/pay', { method: 'POST' })} />
    <Alert role="note"><AlertTitle>The session takes place in text only — there is no video call.</AlertTitle></Alert>
    <Card><CardHeader><CardTitle><h2>Your question</h2></CardTitle></CardHeader>
      <CardContent><p className="font-mono whitespace-pre-wrap break-words">{longQuestion ? `${question}\n\n${question}\n\n${question}` : question}</p></CardContent></Card>
  </article>;
}

const meta = {
  title: 'Patterns/Detail',
  parameters: { msw: { handlers: [http.post('/api/bookings/b1/pay', () => HttpResponse.json({ ok: true, data: { status: 'paid' } }))] } },
  render: () => <BookingDetail />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Content: Story = {};
export const Loading: Story = {
  render: () => <section className="primitive-demo flex flex-col gap-between-groups" aria-busy="true" aria-labelledby="loading-title">
    <h1 id="loading-title" className="sr-only">Booking</h1>
    <p role="status">Loading the booking…</p>
    <Skeleton className="h-6 w-64" /><Skeleton className="h-4 w-80 max-w-full" /><Skeleton className="h-9 w-32" />
  </section>,
};
export const NotFoundOrNoAccess: Story = {
  render: () => <section className="primitive-demo flex flex-col gap-within-group" aria-labelledby="missing-title">
    <h1 id="missing-title" className="text-2xl font-semibold">This booking is not available</h1>
    <p>It does not exist, or it belongs to another account.</p>
    <Link href="#rezerwacje">Back to my bookings</Link>
  </section>,
};
export const Failed: Story = { render: () => <div className="primitive-demo"><ErrorMessage title="We could not load this booking" message="Check your connection, then try again. Your booking is not affected." onRetry={() => undefined} /></div> };
export const LongContent: Story = { render: () => <BookingDetail longQuestion /> };
export const Narrow: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const MainActionAboveTheFold: Story = {
  ...LongContent,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const action = canvas.getByRole('button', { name: 'Pay 240 zł' });
    await expect(action.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    await expect(canvas.getByRole('heading', { level: 1 }).getBoundingClientRect().top).toBeLessThan(action.getBoundingClientRect().top);
    await expect(canvas.getByText('Awaiting payment')).toBeInTheDocument();
  },
};
export const NotFoundDoesNotRevealExistence: Story = {
  ...NotFoundOrNoAccess,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'This booking is not available' })).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: 'Back to my bookings' })).toBeInTheDocument();
    await expect(canvas.queryByText(/Alex/)).toBeNull();
  },
};
