import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Badge } from '@mentio/ui/components/badge';
import { Checkbox } from '@mentio/ui/components/checkbox';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@mentio/ui/components/table';
import { Link } from '@mentio/ui/backend/actions';

// Book-and-pay UI/UX `/rezerwacje`: time, mentor, status badge and a link; unpaid booking first.
const bookings = [
  { id: 'b1', time: '6 Nov, 18:00', mentor: 'Alex', status: 'Awaiting payment', tone: 'outline' as const },
  { id: 'b2', time: '4 Nov, 09:30', mentor: 'Marta', status: 'Awaiting mentor decision', tone: 'outline' as const },
  { id: 'b3', time: '3 Nov, 17:00', mentor: 'Piotr', status: 'Cancelled — refunded', tone: 'secondary' as const },
];

const BookingsTable = ({ rows = bookings }: { rows?: typeof bookings }) => <Table>
  <TableCaption>Your bookings, newest first. Times are Warsaw time.</TableCaption>
  <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Mentor</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Details</span></TableHead></TableRow></TableHeader>
  <TableBody>{rows.map(row => <TableRow key={row.id}>
    <TableCell className="tabular-nums">{row.time}</TableCell>
    <TableCell>{row.mentor}</TableCell>
    <TableCell><Badge variant={row.tone}>{row.status}</Badge></TableCell>
    <TableCell><Link href={`#booking-${row.id}`}>View booking<span className="sr-only"> with {row.mentor} on {row.time}</span></Link></TableCell>
  </TableRow>)}</TableBody>
</Table>;

const meta = {
  title: 'Primitives/Table',
  component: Table,
  render: () => <div className="primitive-demo"><BookingsTable /></div>,
} satisfies Meta<typeof Table>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const WithFooter: Story = {
  render: () => <div className="primitive-demo"><Table>
    <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Mentor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
    <TableBody>{bookings.map(row => <TableRow key={row.id}><TableCell className="tabular-nums">{row.time}</TableCell><TableCell>{row.mentor}</TableCell><TableCell>{row.status}</TableCell></TableRow>)}</TableBody>
    <TableFooter><TableRow><TableCell colSpan={3}>3 bookings</TableCell></TableRow></TableFooter>
  </Table></div>,
};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">
    <p>Rows are not interactive: no hover highlight (user decision). A selected row uses the auxiliary surface and is also marked by its checked checkbox. Focus belongs to the links and controls inside cells. The selection column is an illustration; no current screen selects rows.</p>
    <Table>
      <TableHeader><TableRow><TableHead><Checkbox aria-label="Select all bookings" /></TableHead><TableHead>Time</TableHead><TableHead>Mentor</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
      <TableBody>
        <TableRow><TableCell><Checkbox aria-label="Select booking with Alex" /></TableCell><TableCell className="tabular-nums">6 Nov, 18:00</TableCell><TableCell>Alex</TableCell><TableCell>Default</TableCell></TableRow>
        <TableRow data-state="selected"><TableCell><Checkbox aria-label="Select booking with Marta" defaultChecked /></TableCell><TableCell className="tabular-nums">4 Nov, 09:30</TableCell><TableCell>Marta</TableCell><TableCell>Selected</TableCell></TableRow>
        <TableRow><TableCell><Checkbox aria-label="Select booking with Piotr" /></TableCell><TableCell className="tabular-nums">3 Nov, 17:00</TableCell><TableCell>Piotr</TableCell><TableCell><Link href="#piotr">Focusable link inside a cell</Link></TableCell></TableRow>
      </TableBody>
    </Table>
  </div>,
};
export const LongContent: Story = {
  render: () => <div className="primitive-demo"><BookingsTable rows={[{ id: 'long', time: '6 Nov, 18:00', mentor: 'Aleksandra Wiśniewska-Kowalczyk', status: 'Cancelled after the deadline — no refund', tone: 'secondary' }, ...bookings]} /></div>,
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const SemanticsAndDensity: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole('table', { name: /Your bookings/ });
    await expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
    const firstRow = within(table).getAllByRole('row')[1];
    const style = getComputedStyle(firstRow);
    await expect(style.borderBottomWidth).toBe('1px');
    const cell = within(firstRow).getAllByRole('cell')[0];
    await expect(getComputedStyle(cell).paddingTop).toBe('8px');
    await expect(getComputedStyle(within(table).getAllByRole('columnheader')[0]).height).toBe('40px');
    const before = style.backgroundColor;
    await userEvent.hover(cell);
    await expect(getComputedStyle(firstRow).backgroundColor).toBe(before);
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'View booking with Alex on 6 Nov, 18:00' })).toHaveFocus();
  },
};
export const ScrollsInsideContainer: Story = {
  ...Narrow,
  play: async ({ canvasElement }) => {
    const container = canvasElement.querySelector('[data-slot=table-container]')!;
    await expect(getComputedStyle(container).overflowX).toBe('auto');
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};
