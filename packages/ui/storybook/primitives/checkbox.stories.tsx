import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Checkbox } from '@mentio/ui/components/checkbox';
import { Label } from '@mentio/ui/components/label';

// Mentor-pages UI/UX Phase 4 and D02: listing on the mentor list is an explicit opt-in.
const meta = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  args: { id: 'listing-playground', disabled: false, onCheckedChange: fn() },
  argTypes: { checked: { control: 'select', options: [undefined, true, false] }, disabled: { control: 'boolean' }, 'aria-invalid': { control: 'boolean' }, onCheckedChange: { control: false } },
  render: args => <div className="primitive-demo flex flex-col gap-within-group">
    <div className="flex items-center gap-within-group"><Checkbox {...args} aria-describedby={`${args.id}-hint`} /><Label htmlFor={args.id}>Show me in the mentor list</Label></div>
    <p id={`${args.id}-hint`}>Your page stays reachable through its share link either way.</p>
  </div>,
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Checked: Story = { args: { id: 'listing-checked', defaultChecked: true } };
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">
    {(['default', 'hover', 'focus', 'selected', 'disabled', 'error'] as const).map(state => <div key={state} className="flex flex-col gap-within-group">
      <div className="flex items-center gap-within-group">
        <Checkbox id={`listing-${state}`} data-preview-state={state} defaultChecked={state === 'selected'} disabled={state === 'disabled'} aria-invalid={state === 'error'} aria-describedby={`listing-${state}-hint`} />
        <Label htmlFor={`listing-${state}`}>Show me in the mentor list — {state}</Label>
      </div>
      <p id={`listing-${state}-hint`}>{state === 'disabled' ? 'Saving your listing choice. You can change it again once it is saved.' : state === 'error' ? 'Your listing choice could not be saved. Try again.' : 'Your page stays reachable through its share link either way.'}</p>
    </div>)}
  </div>,
};
export const LongContent: Story = {
  render: () => <div className="primitive-demo flex items-start gap-within-group">
    <Checkbox id="listing-long" className="mt-1" />
    <Label htmlFor="listing-long">Show me in the public mentor list so that developers who do not have my share link can find my page, my public work and my next available text sessions</Label>
  </div>,
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const ClickLabelAndKeyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const box = canvas.getByRole('checkbox', { name: 'Show me in the mentor list' });
    await expect(box.getBoundingClientRect().height).toBe(16);
    await expect(getComputedStyle(box).borderRadius).toBe('6px');
    await expect(canvas.getByText('Show me in the mentor list').getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    await userEvent.click(canvas.getByText('Show me in the mentor list'));
    await expect(box).toHaveAttribute('aria-checked', 'true');
    await expect(args.onCheckedChange).toHaveBeenLastCalledWith(true);
    await expect(box).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(box).toHaveAttribute('aria-checked', 'false');
    await expect(args.onCheckedChange).toHaveBeenLastCalledWith(false);
    await expect(getComputedStyle(box).outlineWidth).toBe('3px');
  },
};
