import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Separator } from '@mentio/ui/components/separator';

// R01.3: thin separators between adjacent records; R02.3: author and time stay together.
const slots = ['Thursday, 6 November 2026, 18:00', 'Friday, 7 November 2026, 09:30', 'Monday, 10 November 2026, 17:00'];

const meta = {
  title: 'Primitives/Separator',
  component: Separator,
  args: { orientation: 'horizontal', decorative: true },
  argTypes: { orientation: { control: 'select', options: ['horizontal', 'vertical'] }, decorative: { control: 'boolean' } },
  render: args => <div className="primitive-demo flex flex-col gap-within-group"><p>Availability</p><Separator {...args} /><p>Thursday, 6 November 2026, 18:00</p></div>,
} satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const ListRows: Story = {
  render: () => <div className="primitive-demo">
    <ul aria-label="Your availability">{slots.map((slot, index) => <li key={slot}>{index > 0 && <Separator />}<p className="py-2">{slot} (Warsaw time)</p></li>)}</ul>
  </div>,
};
export const Vertical: Story = {
  render: () => <div className="primitive-demo"><div className="flex h-5 items-center gap-within-group"><span>Alex</span><Separator orientation="vertical" /><span>18:04</span></div></div>,
};
export const Semantic: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group"><p>Booking details</p><Separator decorative={false} /><p>Payment</p></div>,
};
export const States: Story = {
  render: () => <div className="primitive-demo"><p>Separator is not interactive. Hover, focus, pressed, disabled, loading, selected and error do not apply; it always uses the border role at 1 px.</p></div>,
};
export const LongContent: Story = {
  render: () => <div className="primitive-demo">
    <ul aria-label="Your availability">{['Thursday, 6 November 2026, 18:00 — visible on your page and bookable by a mentee who has your share link', 'Friday, 7 November 2026, 09:30 — outside the booking window, visible but not bookable yet'].map((slot, index) => <li key={slot}>{index > 0 && <Separator />}<p className="py-2">{slot}</p></li>)}</ul>
  </div>,
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const SemanticsAndThickness: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p>Booking details</p><Separator decorative={false} /><p>Payment</p><Separator /><div className="flex h-5 items-center gap-within-group"><span>Alex</span><Separator orientation="vertical" /><span>18:04</span></div>
  </div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const semantic = canvas.getByRole('separator');
    await expect(semantic.hasAttribute('aria-orientation')).toBe(false);
    await expect(semantic.getBoundingClientRect().height).toBe(1);
    const all = canvasElement.querySelectorAll('[data-slot=separator]');
    await expect(all).toHaveLength(3);
    await expect(all[1]).toHaveAttribute('role', 'none');
    await expect(all[2].getBoundingClientRect().width).toBe(1);
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'var(--border)';
    canvasElement.append(probe);
    await expect(getComputedStyle(all[0]).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.remove();
  },
};
