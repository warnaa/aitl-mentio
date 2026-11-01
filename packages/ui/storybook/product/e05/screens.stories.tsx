import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { EarningsSummary } from '@mentio/ui/components/earnings/EarningsSummary';
import { BookingSummary } from '@mentio/ui/components/bookings/BookingSummary';
import { Link } from '@mentio/ui/backend/actions';
import { DataTable } from '@mentio/ui/backend/tables';
import { EmptyState, ErrorMessage, LoadingMessage } from '@mentio/ui/backend/feedback';
import { earningRows, earningTotals, manyEarningRows, type EarningRow } from '../../fixtures/earnings';
import { MentorShell, Stack } from '../shells';

// E05 screens — PRELIMINARY. No E05 spec exists. Sources: E05-S01, R06, R10, R14, R16, R21, D11–D14 and the
// book-and-pay `MentorEarning` (price, commission, share, reason; one per booking). Decided 2026-11-01 (no spec yet): the route
// `/mentor/zarobki`, the columns and copy. No money moves (D13), so the page says so; payouts wait for D14.
const note = 'Simulated — no money is paid out yet. Payouts start once real payments are switched on.';
type State = 'rows' | 'empty' | 'loading' | 'error' | 'many';
const columns = [
  { id: 'session', header: 'Session', className: 'tabular-nums', cell: (row: EarningRow) => <Link href={`#/mentor/sesje/${row.id}`}>{row.session}<span className="sr-only">, {row.length}</span></Link> },
  { id: 'outcome', header: 'Outcome', cell: (row: EarningRow) => row.outcome },
  { id: 'price', header: 'Price', className: 'tabular-nums', cell: (row: EarningRow) => row.price },
  { id: 'share', header: 'Your share', className: 'tabular-nums', cell: (row: EarningRow) => row.share },
];

function Earnings({ state = 'rows' }: { state?: State }) {
  const [offset, setOffset] = useState(0);
  const rows = state === 'many' ? manyEarningRows : earningRows;
  let body;
  if (state === 'loading') body = <LoadingMessage label="Loading your earnings…" />;
  else if (state === 'error') body = <ErrorMessage title="We could not load your earnings" message="Check your connection, then try again. Your earnings are not affected." onRetry={() => undefined} />;
  else if (state === 'empty') body = <EmptyState title="No earnings yet" description="Your share appears here after a session is held, or when a mentee misses it or cancels less than 12 hours before it." />;
  else body = <>
    <EarningsSummary title="Your earnings" context={state === 'many' ? '45 settled sessions' : '6 settled sessions'} {...(state === 'many' ? { price: { term: 'Paid by mentees', amount: '7,200 zł' }, commission: { term: 'Mentio’s commission (20%)', amount: '−1,440 zł' }, share: { term: 'Your share', amount: '5,760 zł' } } : earningTotals)} note={note} />
    <section className="flex flex-col gap-within-group" aria-labelledby="per-session">
      <h2 id="per-session" className="mentio-public-heading">Per session</h2>
      <p className="mentio-field-description">Your share is the price minus Mentio’s 20% commission, as stored when the mentee paid.</p>
      <DataTable rows={state === 'many' ? rows.slice(offset, offset + 20) : rows} getRowId={row => row.id} columns={columns}
        pagination={state === 'many' ? { offset, limit: 20, total: rows.length, onOffsetChange: setOffset } : undefined} />
    </section>
  </>;
  return <MentorShell current="#/mentor/zarobki"><Stack>
    <h1 className="mentio-public-title">Earnings</h1>
    {body}
  </Stack></MentorShell>;
}

// A settled session's details on the mentor side (`/mentor/sesje/[id]`), linked from each row.
const SessionEarning = ({ late = false }: { late?: boolean }) => <MentorShell current="#/mentor/sesje"><Stack>
  <BookingSummary title="Session with Kasia" headingLevel={1} status={{ tone: 'neutral', label: late ? 'Cancelled late — you are paid' : 'Held' }}
    facts={[{ term: 'Time', detail: late ? 'Wednesday, 29 October, 17:00 (Warsaw time)' : 'Tuesday, 4 November, 18:00–18:50 (Warsaw time)' }, { term: 'Length', detail: late ? '25 minutes' : '50 minutes' }]}
    textOnlyNote="The session takes place in text only — there is no video call." />
  <EarningsSummary title="Earnings for this session" context={late ? 'Late cancellation — Kasia cancelled less than 12 hours before the session' : 'Session held'}
    price={{ term: 'Price', amount: late ? '120 zł' : '240 zł' }} commission={{ term: 'Mentio’s commission (20%)', amount: late ? '−24 zł' : '−48 zł' }} share={{ term: 'Your share', amount: late ? '96 zł' : '192 zł' }} note={note} />
  {!late && <div><Link href="#/sesje/e1">Open the conversation</Link></div>}
</Stack></MentorShell>;

const meta = { title: 'Product/E05 — Mentor earnings/Screens', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const EarningsList: Story = { name: 'Earnings — settled sessions', render: () => <Earnings />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Session', 'Outcome', 'Price', 'Your share']);
    await expect(canvas.getByRole('link', { name: /^29 Oct, 17:00\s*, 25 min$/ })).toHaveAttribute('href', '#/mentor/sesje/e4');
    await expect(canvas.getByText('816 zł')).toBeInTheDocument();
  } };
export const EarningsEmpty: Story = { name: 'Earnings — none yet', render: () => <Earnings state="empty" /> };
export const EarningsLoading: Story = { name: 'Earnings — loading', render: () => <Earnings state="loading" /> };
export const EarningsError: Story = { name: 'Earnings — failed to load', render: () => <Earnings state="error" /> };
export const EarningsMany: Story = { name: 'Earnings — many sessions, page 1 of 3', render: () => <Earnings state="many" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('row')).toHaveLength(21);
    await userEvent.click(canvas.getByRole('button', { name: /next/i }));
    await expect(canvas.getByRole('link', { name: /^3 Oct, / })).toBeInTheDocument();
  } };
export const EarningsNarrow: Story = { name: 'Earnings — narrow', render: () => <Earnings />, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const SessionHeld: Story = { name: 'Session details — held, with earnings', render: () => <SessionEarning /> };
export const SessionLateCancel: Story = { name: 'Session details — late cancellation, with earnings', render: () => <SessionEarning late /> };
