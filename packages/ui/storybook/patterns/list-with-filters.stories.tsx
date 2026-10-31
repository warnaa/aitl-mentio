import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { X } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@mentio/ui/backend/tables';
import { EmptyState, StatusBadge } from '@mentio/ui/backend/feedback';
import { Link } from '@mentio/ui/backend/actions';
import { Button } from '@mentio/ui/components/button';
import { Label } from '@mentio/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mentio/ui/components/select';
import { bookingRows, manyBookingRows, type BookingRow } from '../fixtures/bookings';

// Illustration of the generic pattern on `/rezerwacje` data. The current specs define no filters
// (stage-0 decision: do not add filtering to the app); this shows how one must be built if added.
const columns: DataTableColumn<BookingRow>[] = [
  { id: 'time', header: 'Time', className: 'tabular-nums', cell: row => row.time },
  { id: 'mentor', header: 'Mentor', cell: row => row.mentor },
  { id: 'status', header: 'Status', cell: row => <StatusBadge tone={row.tone} label={row.status} /> },
  { id: 'link', header: <span className="sr-only">Details</span>, cell: row => <Link href={`#booking-${row.id}`}>View booking<span className="sr-only"> with {row.mentor} on {row.time}</span></Link> },
];
const ALL = 'all';

interface ListProps { rows?: BookingRow[]; initialStatus?: string; error?: string; isLoading?: boolean; pageSize?: number }
function BookingsList({ rows, initialStatus = ALL, error, isLoading, pageSize = 20 }: ListProps) {
  const [status, setStatus] = useState(initialStatus);
  const [offset, setOffset] = useState(0);
  // Options come from all known statuses, not the visible rows, so a filter from the URL stays shown.
  const statuses = [...new Set(bookingRows.map(row => row.status))];
  const filtered = rows?.filter(row => status === ALL || row.status === status);
  const hasNoBookings = rows !== undefined && rows.length === 0;
  const count = filtered?.length ?? 0;
  const choose = (next: string) => { setStatus(next); setOffset(0); };
  return <section className="primitive-demo flex flex-col gap-between-groups" aria-labelledby="list-title">
    <h1 id="list-title" className="text-2xl font-semibold">My bookings</h1>
    {!hasNoBookings && <div className="flex flex-wrap items-end gap-between-groups">
      <div className="flex flex-col gap-within-group">
        <Label htmlFor="status-filter">Status</Label>
        <Select value={status} onValueChange={choose}>
          <SelectTrigger id="status-filter"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All statuses</SelectItem>{statuses.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {status !== ALL && <Button type="button" variant="outline" size="sm" aria-label={`Remove filter Status: ${status}`} onClick={() => { choose(ALL); requestAnimationFrame(() => document.getElementById('status-filter')?.focus()); }}>Status: {status}<X aria-hidden="true" /></Button>}
      {filtered && <p role="status" className="text-muted-foreground">{count === 1 ? '1 booking' : `${count} bookings`}</p>}
    </div>}
    {hasNoBookings
      ? <EmptyState title="You have no bookings yet" description="When you book a text session with a mentor, it appears here." action={<Button asChild><a href="#mentorzy">Find a mentor</a></Button>} />
      : filtered && count === 0 && !error
        ? <EmptyState title="No bookings match these filters" description="Clear the filters to see all your bookings." action={<Button type="button" variant="outline" onClick={() => choose(ALL)}>Clear filters</Button>} />
        : <DataTable columns={columns} rows={filtered?.slice(offset, offset + pageSize)} getRowId={row => row.id} isLoading={isLoading} error={error} onRetry={() => undefined}
            pagination={filtered && count > pageSize ? { offset, limit: pageSize, total: count, onOffsetChange: setOffset } : undefined} />}
  </section>;
}

const meta = { title: 'Patterns/List with filters', render: (args: ListProps) => <BookingsList {...args} /> } satisfies Meta<typeof BookingsList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Results: Story = { args: { rows: bookingRows } };
export const FilterApplied: Story = { args: { rows: bookingRows, initialStatus: 'Awaiting payment' } };
export const NoResultsForFilters: Story = { args: { rows: bookingRows.filter(row => row.status !== 'Expired'), initialStatus: 'Expired' } };
export const NothingYet: Story = { args: { rows: [] } };
export const FirstLoad: Story = { args: { rows: undefined } };
export const Refreshing: Story = { args: { rows: bookingRows, isLoading: true } };
export const Failed: Story = { args: { rows: bookingRows, error: 'Check your connection, then try again.' } };
export const ManyResults: Story = { args: { rows: manyBookingRows } };
export const Narrow: Story = { ...FilterApplied, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const RemoveFilterReturnsFocus: Story = {
  ...FilterApplied,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('1 booking');
    await userEvent.click(canvas.getByRole('button', { name: 'Remove filter Status: Awaiting payment' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('5 bookings');
    await waitFor(() => expect(canvas.getByRole('combobox', { name: 'Status' })).toHaveFocus());
    await expect(canvas.queryByRole('button', { name: /Remove filter/ })).toBeNull();
  },
};
export const ClearFiltersFromNoResults: Story = {
  ...NoResultsForFilters,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No bookings match these filters')).toBeInTheDocument();
    await expect(canvas.queryByText('You have no bookings yet')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('4 bookings');
    await expect(canvas.getAllByRole('row')).toHaveLength(5);
  },
};
