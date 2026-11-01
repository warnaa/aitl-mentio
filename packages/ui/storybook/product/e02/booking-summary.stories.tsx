import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { BookingSummary } from '@mentio/ui/components/bookings/BookingSummary';

import { bookingFacts as facts, bookingQuestion as question } from '../../fixtures/bookings';

const meta = {
  title: 'Product/E02 — Book and pay/BookingSummary',
  component: BookingSummary,
  args: { title: 'Booking with Alex', status: { tone: 'waiting', label: 'Awaiting mentor decision' }, facts, question: { heading: 'Your question', text: question }, textOnlyNote: 'The session takes place in text only — there is no video call.' },
  argTypes: { facts: { control: false }, question: { control: false } },
  render: args => <div className="primitive-demo"><BookingSummary {...args} /></div>,
} satisfies Meta<typeof BookingSummary>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const BeforeBooking: Story = { args: { title: 'Text session with Alex', status: undefined, question: undefined, facts: facts.slice(0, 2) } };
export const PageHeading: Story = { args: { headingLevel: 1 } };
export const States: Story = {
  render: args => <div className="primitive-demo flex flex-col gap-between-groups">
    <p>The summary is static; its status comes from the booking. Each booking state is a screen story on the E02 screen map.</p>
    <BookingSummary {...args} status={{ tone: 'danger', label: 'Payment declined' }} question={undefined} />
    <BookingSummary {...args} status={{ tone: 'neutral', label: 'Cancelled — refunded' }} question={undefined} />
  </div>,
};
export const LongContent: Story = { args: { title: 'Booking with Aleksandra Wiśniewska-Kowalczyk', facts: [{ term: 'Mentor', detail: 'Aleksandra Wiśniewska-Kowalczyk' }, ...facts.slice(1)], question: { heading: 'Your question', text: `${question}\n\n${'helm upgrade --install shop ./charts/shop --namespace shop --values values.production.yaml --set image.tag=2026.10.31-build.4812 --atomic --timeout 10m0s'}\n\n${question}` } } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const QuestionKeepsLayout: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const text = canvas.getByText(/The ingress stopped responding/);
    await expect(getComputedStyle(text).whiteSpace).toBe('pre-wrap');
    await expect(text.textContent).toContain('\n\nkubectl');
    await expect(canvas.getAllByRole('term').map(term => term.textContent)).toEqual(['Mentor', 'Time', 'Length', 'Price']);
    await expect(canvas.getByText('Awaiting mentor decision')).toHaveAttribute('data-tone', 'waiting');
  },
};
// WCAG 1.4.10 regression: the longest status wraps inside a 320 px column.
export const LongStatusWraps: Story = {
  args: { status: { tone: 'waiting', label: 'Abandoned — waiting for payment confirmation' } },
  render: args => <div className="w-full max-w-(--viewport-small)"><BookingSummary {...args} /></div>,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[data-slot=card]')!.getBoundingClientRect();
    const badge = within(canvasElement).getByText('Abandoned — waiting for payment confirmation').getBoundingClientRect();
    await expect(badge.right).toBeLessThanOrEqual(card.right);
  },
};

