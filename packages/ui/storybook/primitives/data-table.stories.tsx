import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { DataTable, type DataTableColumn } from '@mentio/ui/backend/tables';
import { StatusBadge } from '@mentio/ui/backend/feedback';
import { Link } from '@mentio/ui/backend/actions';
import { bookingRows, manyBookingRows, type BookingRow } from '../fixtures/bookings';

const columns: DataTableColumn<BookingRow>[] = [
  { id: 'time', header: 'Time', className: 'tabular-nums', cell: row => row.time },
  { id: 'mentor', header: 'Mentor', cell: row => row.mentor },
  { id: 'status', header: 'Status', cell: row => <StatusBadge tone={row.tone} label={row.status} /> },
  { id: 'link', header: <span className="sr-only">Details</span>, cell: row => <Link href={`#booking-${row.id}`}>View booking<span className="sr-only"> with {row.mentor} on {row.time}</span></Link> },
];

const meta = {
  title: 'Primitives/DataTable',
  component: DataTable<BookingRow>,
  args: { columns, rows: bookingRows, getRowId: row => row.id, emptyTitle: 'You have no bookings yet', emptyDescription: 'When you book a text session with a mentor, it appears here.', onRetry: fn() },
  argTypes: { columns: { control: false }, rows: { control: false }, getRowId: { control: false }, isLoading: { control: 'boolean' }, error: { control: 'text' } },
  render: args => <div className="primitive-demo"><DataTable {...args} /></div>,
} satisfies Meta<typeof DataTable<BookingRow>>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const FirstLoad: Story = { args: { rows: undefined } };
export const Refreshing: Story = { args: { isLoading: true } };
export const Empty: Story = { args: { rows: [] } };
export const Failed: Story = { args: { error: 'Check your connection, then try again.' } };
export const States: Story = {
  render: args => <div className="primitive-demo flex flex-col gap-section">
    <p>Each data state is also its own story: First load, Refreshing (rows kept, aria-busy), Empty, Failed, Paginated.</p>
    <DataTable {...args} rows={undefined} />
    <DataTable {...args} rows={[]} />
    <DataTable {...args} error="Check your connection, then try again." />
  </div>,
};
function Paged() {
  const [offset, setOffset] = useState(0);
  return <DataTable columns={columns} rows={manyBookingRows.slice(offset, offset + 20)} getRowId={row => row.id} pagination={{ offset, limit: 20, total: manyBookingRows.length, onOffsetChange: setOffset }} />;
}
export const Paginated: Story = {
  render: () => <div className="primitive-demo"><Paged /></div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('1–20 of 45')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await expect(canvas.getByText('41–45 of 45')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Next' })).toBeDisabled();
    await expect(canvas.getAllByRole('row')).toHaveLength(6);
  },
};
export const RetryAfterFailure: Story = {
  args: { error: 'Check your connection, then try again.' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Try again' }));
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};
export const LongContent: Story = { args: { rows: [{ id: 'long', time: '6 Nov, 18:00', mentor: 'Aleksandra Wiśniewska-Kowalczyk', status: 'Cancelled after the deadline — no refund', tone: 'neutral' }, ...bookingRows] } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };

// User decision 2026-11-01: below 48rem of its own width each row stacks, values under their column names.
export const StackedRows: Story = {
  ...LongContent,
  render: args => <div className="w-full max-w-(--viewport-small)"><DataTable {...args} /></div>,
  play: async ({ canvasElement }) => {
    const container = canvasElement.querySelector('.mentio-table-container')!;
    await expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    const row = canvasElement.querySelector('tbody tr')!;
    await expect(getComputedStyle(row).display).toBe('grid');
    const label = row.querySelector('.mentio-table-cell-label')!;
    await expect(getComputedStyle(label).display).toBe('block');
    await expect(label).toHaveAttribute('aria-hidden', 'true');
    await expect(within(canvasElement).getAllByRole('columnheader').length).toBeGreaterThan(0);
    await expect(within(canvasElement).getByText('Cancelled after the deadline — no refund').getBoundingClientRect().right).toBeLessThanOrEqual(container.getBoundingClientRect().right);
  },
};
export const WideKeepsTable: Story = {
  render: args => <div className="w-full max-w-(--viewport-large)"><DataTable {...args} /></div>,
  play: async ({ canvasElement }) => {
    if (canvasElement.querySelector('.mentio-data-table')!.getBoundingClientRect().width < 768) return;
    await expect(getComputedStyle(canvasElement.querySelector('tbody tr')!).display).toBe('table-row');
    await expect(getComputedStyle(canvasElement.querySelector('.mentio-table-cell-label')!).display).toBe('none');
  },
};
