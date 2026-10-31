import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Label } from '@mentio/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@mentio/ui/components/radio-group';

// Approved inventory: RadioGroup documents the visible alternative for the two booking lengths.
// The book-and-pay spec still uses Select for that screen.
const durations = [{ value: '25', label: '25 minutes — 120 PLN' }, { value: '50', label: '50 minutes — 240 PLN' }];

const meta = {
  title: 'Primitives/RadioGroup',
  component: RadioGroup,
  args: { disabled: false, onValueChange: fn(), 'aria-labelledby': 'length-legend' },
  argTypes: { disabled: { control: 'boolean' }, defaultValue: { control: 'select', options: [undefined, '25', '50'] }, orientation: { control: 'select', options: ['vertical', 'horizontal'] }, onValueChange: { control: false } },
  render: args => <div className="primitive-demo flex flex-col gap-within-group">
    <p id="length-legend" className="font-medium">Session length</p>
    <RadioGroup {...args}>{durations.map(option => <div key={option.value} className="flex items-center gap-within-group">
      <RadioGroupItem id={`length-${option.value}`} value={option.value} /><Label htmlFor={`length-${option.value}`}>{option.label}</Label>
    </div>)}</RadioGroup>
  </div>,
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Selected: Story = { args: { defaultValue: '50' } };
export const Horizontal: Story = { args: { orientation: 'horizontal', defaultValue: '25', className: 'flex flex-wrap gap-between-groups' } };
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">
    {(['default', 'hover', 'focus', 'selected', 'disabled', 'error'] as const).map(state => <div key={state} className="flex flex-col gap-within-group">
      <p id={`length-${state}-legend`} className="font-medium">Session length — {state}</p>
      <RadioGroup aria-labelledby={`length-${state}-legend`} aria-describedby={`length-${state}-hint`} defaultValue={state === 'selected' ? '25' : undefined} disabled={state === 'disabled'} aria-invalid={state === 'error'}>
        {durations.map(option => <div key={option.value} className="flex items-center gap-within-group">
          <RadioGroupItem id={`length-${state}-${option.value}`} value={option.value} data-preview-state={option.value === '25' ? state : undefined} aria-invalid={state === 'error'} />
          <Label htmlFor={`length-${state}-${option.value}`}>{option.label}</Label>
        </div>)}
      </RadioGroup>
      <p id={`length-${state}-hint`}>{state === 'disabled' ? 'Bookings are temporarily switched off. Your saved question stays here.' : state === 'error' ? 'Choose 25 or 50 minutes.' : 'The price follows the mentor’s current rate.'}</p>
    </div>)}
  </div>,
};
export const LongContent: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p id="length-long-legend" className="font-medium">How much time do you need for the question about the ingress that stopped responding after the cluster upgrade?</p>
    <RadioGroup aria-labelledby="length-long-legend" defaultValue="50">
      <div className="flex items-start gap-within-group"><RadioGroupItem id="length-long-25" value="25" className="mt-1" /><Label htmlFor="length-long-25">25 minutes — 120 PLN, enough for one focused error message</Label></div>
      <div className="flex items-start gap-within-group"><RadioGroupItem id="length-long-50" value="50" className="mt-1" /><Label htmlFor="length-long-50">50 minutes — 240 PLN, time to read the pasted configuration, logs and the change made before the failure</Label></div>
    </RadioGroup>
  </div>,
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const ArrowKeySelection: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('radiogroup', { name: 'Session length' });
    const short = canvas.getByRole('radio', { name: '25 minutes — 120 PLN' });
    const long = canvas.getByRole('radio', { name: '50 minutes — 240 PLN' });
    await expect(group).toBeInTheDocument();
    await expect(getComputedStyle(short).borderRadius).toBe('50%');
    await userEvent.tab();
    await expect(short).toHaveFocus();
    // Radix checks on focus while the arrow key is held, as with a physical key press.
    await userEvent.keyboard('{ArrowDown>}');
    await waitFor(() => expect(long).toHaveFocus());
    await waitFor(() => expect(long).toHaveAttribute('aria-checked', 'true'));
    await userEvent.keyboard('{/ArrowDown}');
    await expect(args.onValueChange).toHaveBeenLastCalledWith('50');
    await userEvent.click(canvas.getByText('25 minutes — 120 PLN'));
    await expect(short).toHaveAttribute('aria-checked', 'true');
    await expect(long).toHaveAttribute('aria-checked', 'false');
    await userEvent.tab();
    await expect(group.contains(document.activeElement)).toBe(false);
  },
};
