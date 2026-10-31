import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StatusBadge } from '@mentio/ui/backend/feedback';

// F6 tones; labels are English story copy for book-and-pay statuses (the Polish map is built with E02).
const meta = {
  title: 'Primitives/StatusBadge',
  component: StatusBadge,
  args: { tone: 'waiting', label: 'Awaiting mentor decision' },
  argTypes: { tone: { control: 'select', options: ['neutral', 'waiting', 'success', 'danger'] }, label: { control: 'text' } },
  render: args => <div className="primitive-demo"><StatusBadge {...args} /></div>,
} satisfies Meta<typeof StatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Neutral: Story = { args: { tone: 'neutral', label: 'Cancelled — refunded' } };
export const Waiting: Story = { args: { tone: 'waiting', label: 'Awaiting payment' } };
export const Success: Story = { args: { tone: 'success', label: 'Published' } };
export const Danger: Story = { args: { tone: 'danger', label: 'Payment declined' } };
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p>A status is read-only: no hover, focus, disabled or selected state. The tone sets weight; the label always names the state.</p>
    <div className="flex flex-wrap gap-within-group">
      <StatusBadge tone="waiting" label="Payment in progress" />
      <StatusBadge tone="neutral" label="Abandoned" />
      <StatusBadge tone="danger" label="Refund failed" />
      <StatusBadge tone="success" label="Published" />
    </div>
  </div>,
};
export const LongContent: Story = { args: { tone: 'neutral', label: 'Cancelled after the deadline — no refund', className: 'whitespace-normal text-left' } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const TextNotColour: Story = {
  ...Danger,
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByText('Payment declined');
    await expect(badge).toHaveAttribute('data-tone', 'danger');
    await expect(badge).toHaveAttribute('data-variant', 'destructive');
    await expect(getComputedStyle(badge).borderRadius).toBe('6px');
  },
};
