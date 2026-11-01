import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Card, CardContent, CardHeader } from '@mentio/ui/components/card';
import { Skeleton } from '@mentio/ui/components/skeleton';

// Shapes follow the content they replace: booking rows (`/rezerwacje`) and a mentor card (`/mentorzy`).
const meta = {
  title: 'Primitives/Skeleton',
  component: Skeleton,
  args: { className: 'h-4 w-48' },
  render: args => <div className="primitive-demo"><Skeleton {...args} /></div>,
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

const BookingRows = ({ rows = 3 }: { rows?: number }) => <div className="flex flex-col">
  {Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-between-groups border-b py-2">
    <Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-32" />
  </div>)}
</div>;

export const Playground: Story = {};
export const ListRows: Story = {
  render: () => <section className="primitive-demo flex flex-col gap-within-group" aria-busy="true" aria-labelledby="bookings-heading">
    <h2 id="bookings-heading" className="font-semibold">Your bookings</h2>
    <p role="status">Loading your bookings…</p>
    <BookingRows />
  </section>,
};
export const MentorCard: Story = {
  play: async () => {
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
  render: () => <div className="primitive-demo" aria-busy="true">
    <p role="status" className="sr-only">Loading mentors…</p>
    <Card><CardHeader><Skeleton className="h-6 w-full max-w-48" /><Skeleton className="h-4 w-full max-w-64" /></CardHeader><CardContent className="flex flex-col gap-within-group"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
  </div>,
};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p>A skeleton has one static state (user decision: no pulse). It is hidden from assistive technology; the region carries aria-busy and a status line says what is loading.</p>
    <Skeleton className="h-4 w-48" />
  </div>,
};
export const LongContent: Story = { render: () => <div className="primitive-demo"><BookingRows rows={8} /></div> };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const StaticAndHidden: Story = {
  ...ListRows,
  play: async ({ canvasElement }) => {
    const shapes = canvasElement.querySelectorAll('[data-slot=skeleton]');
    await expect(shapes.length).toBe(9);
    for (const shape of shapes) {
      await expect(shape).toHaveAttribute('aria-hidden', 'true');
      await expect(getComputedStyle(shape).animationName).toBe('none');
    }
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'var(--muted)';
    canvasElement.append(probe);
    await expect(getComputedStyle(shapes[0]).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.remove();
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('Loading your bookings…');
  },
};
