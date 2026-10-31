import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Badge } from '@mentio/ui/components/badge';

// Labels: book-and-pay UI/UX status list and mentor-pages draft/published status, in English.
const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  args: { children: 'Awaiting payment', variant: 'secondary' },
  argTypes: { variant: { control: 'select', options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] }, asChild: { control: false } },
  render: args => <div className="primitive-demo"><Badge {...args} /></div>,
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Primary: Story = { args: { variant: 'default', children: 'Published' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Draft' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Payment declined' } };
export const Outline: Story = { args: { variant: 'outline', children: 'Awaiting mentor decision' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'Cancelled — refunded' } };
export const LinkVariant: Story = { name: 'Link', args: { variant: 'link', asChild: true, children: <a href="#booking-details">Cancelled — refund in progress</a> } };
export const StatusInContext: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p className="flex flex-wrap items-center gap-within-group">Booking with Alex, 6 November 2026 at 18:00 <Badge variant="outline">Awaiting mentor decision</Badge></p>
    <p className="flex flex-wrap items-center gap-within-group">Booking with Marta, 7 November 2026 at 09:30 <Badge variant="destructive">Payment declined</Badge></p>
    <p className="flex flex-wrap items-center gap-within-group">Booking with Piotr, 3 November 2026 at 17:00 <Badge variant="secondary">Cancelled after the deadline — no refund</Badge></p>
  </div>,
};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">
    <p>A static badge has no interaction states. A badge rendered as a link with asChild has hover, focus and pressed states:</p>
    <div className="flex flex-wrap items-center gap-between-groups">
      <Badge variant="secondary">Static: Draft</Badge>
      {(['default', 'hover', 'focus', 'pressed'] as const).map(state => <Badge key={state} asChild variant="outline"><a href={`#booking-${state}`} data-preview-state={state}>Link {state}: Awaiting payment</a></Badge>)}
      <Badge variant="outline" aria-invalid="true">Refund failed</Badge>
    </div>
    <p>Disabled, loading and selected do not apply: a status is a read-only label. The refund-failed label uses text, not colour alone.</p>
  </div>,
};
export const LongContent: Story = { args: { variant: 'secondary', className: 'whitespace-normal text-left', children: 'Cancelled less than 12 hours before the session — no refund' } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const ShapeAndLinkFocus: Story = {
  render: () => <div className="primitive-demo flex flex-wrap items-center gap-between-groups">
    <Badge variant="secondary">Draft</Badge>
    <Badge asChild variant="outline"><a href="#booking-details">Awaiting payment</a></Badge>
    <p id="booking-details">Booking details</p>
  </div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Draft');
    await expect(getComputedStyle(badge).borderRadius).toBe('6px');
    await expect(getComputedStyle(badge).fontSize).toBe('12px');
    const link = canvas.getByRole('link', { name: 'Awaiting payment' });
    await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    await userEvent.tab();
    await expect(link).toHaveFocus();
    await expect(getComputedStyle(link).outlineWidth).toBe('3px');
    await expect(getComputedStyle(link).outlineOffset).toBe('2px');
  },
};
