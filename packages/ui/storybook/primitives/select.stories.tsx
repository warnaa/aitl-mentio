import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Label } from '@mentio/ui/components/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@mentio/ui/components/select';
import { FormField } from '@mentio/ui/backend/forms';

// Book-and-pay UI/UX: duration options carry their price (25 minutes — 120 zł, 50 minutes — 240 zł).
const durations = [{ value: '25', label: '25 minutes — 120 zł' }, { value: '50', label: '50 minutes — 240 zł' }];

const meta = {
  title: 'Primitives/Select',
  component: Select,
  args: { disabled: false, onValueChange: fn() },
  argTypes: { disabled: { control: 'boolean' }, defaultValue: { control: 'select', options: [undefined, '25', '50'] }, onValueChange: { control: false } },
  render: args => <div className="primitive-demo flex flex-col gap-within-group">
    <Label htmlFor="duration-playground">Session length</Label>
    <Select {...args}><SelectTrigger id="duration-playground"><SelectValue placeholder="Choose 25 or 50 minutes" /></SelectTrigger>
      <SelectContent>{durations.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
  </div>,
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const WithValue: Story = { args: { defaultValue: '25' } };
// FormField wraps the trigger, not the Select root: the root renders no element to label.
export const InFormField: Story = {
  render: args => <div className="primitive-demo"><Select {...args} name="lengthMinutes" required defaultValue="50">
    <FormField label="Session length" required description="The price follows the mentor's current rate for the chosen length.">
      <SelectTrigger><SelectValue /></SelectTrigger>
    </FormField>
    <SelectContent>{durations.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
  </Select></div>,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('combobox', { name: 'Session length' });
    await expect(trigger).toHaveAttribute('aria-required', 'true');
    const described = (trigger.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent).join(' ');
    await expect(described).toContain("mentor's current rate");
  },
};
export const GroupedOptions: Story = {
  render: args => <div className="primitive-demo flex flex-col gap-within-group">
    <Label htmlFor="duration-grouped">Session length</Label>
    <Select {...args} defaultValue="25"><SelectTrigger id="duration-grouped"><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup><SelectLabel>Text session, price in zł</SelectLabel>{durations.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select>
  </div>,
};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">
    {(['default', 'hover', 'focus', 'disabled', 'loading', 'error'] as const).map(state => <div key={state} className="flex flex-col gap-within-group">
      <Label htmlFor={`duration-${state}`}>Session length — {state}</Label>
      <Select defaultValue={state === 'default' ? undefined : '25'} disabled={state === 'disabled'}>
        <SelectTrigger id={`duration-${state}`} data-preview-state={state} aria-busy={state === 'loading'} aria-invalid={state === 'error'} aria-describedby={`duration-${state}-hint`}><SelectValue placeholder="Choose 25 or 50 minutes" /></SelectTrigger>
        <SelectContent>{durations.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
      <p id={`duration-${state}-hint`}>{state === 'disabled' ? 'Bookings are temporarily switched off. Your saved question stays here.' : state === 'error' ? 'Choose 25 or 50 minutes.' : state === 'loading' ? 'Loading the mentor’s current prices; the last shown prices stay visible.' : 'The price is shown next to each length.'}</p>
    </div>)}
  </div>,
};
// Described a11y exception (aria-hidden-focus): the open list is modal. Radix hides the page
// behind it with aria-hidden and keeps focus inside, so the hidden trigger is unreachable;
// the play function proves Tab cannot leave the list. Every closed-state story runs all rules.
export const OpenList: Story = {
  args: { defaultValue: '25', defaultOpen: true },
  parameters: { docs: { disable: true }, a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } } },
  play: async () => {
    const body = within(document.body);
    const selected = await body.findByRole('option', { name: '25 minutes — 120 zł' });
    await waitFor(() => expect(selected).toHaveFocus());
    await expect(selected).toHaveAttribute('aria-selected', 'true');
    await expect(selected).toHaveAttribute('data-highlighted');
    await userEvent.keyboard('{Tab}');
    await expect(body.getByRole('listbox').contains(document.activeElement)).toBe(true);
  },
};
export const LongContent: Story = {
  render: args => <div className="primitive-demo flex flex-col gap-within-group">
    <Label htmlFor="duration-long">Session length for the question about the Kubernetes ingress that stopped responding after the cluster upgrade</Label>
    <Select {...args} defaultValue="long"><SelectTrigger id="duration-long"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="long">50 minutes — 240 zł, including time to read the pasted configuration and logs</SelectItem><SelectItem value="25">25 minutes — 120 zł</SelectItem></SelectContent></Select>
  </div>,
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
// Radix closes an open list on window resize. The preceding Narrow story restores the
// iframe width asynchronously, so wait until the viewport has been stable for 250 ms.
const viewportSettled = () => new Promise<void>(resolve => {
  const done = () => { removeEventListener('resize', reset); resolve(); };
  let timer = setTimeout(done, 250);
  function reset() { clearTimeout(timer); timer = setTimeout(done, 250); }
  addEventListener('resize', reset);
});
export const KeyboardSelection: Story = {
  play: async ({ canvasElement, args }) => {
    await viewportSettled();
    const trigger = within(canvasElement).getByRole('combobox', { name: 'Session length' });
    await expect(trigger.getBoundingClientRect().height).toBe(36);
    await expect(getComputedStyle(trigger).borderRadius).toBe('8px');
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const body = within(document.body);
    const listbox = await body.findByRole('listbox', {}, { timeout: 3000 });
    await expect(getComputedStyle(listbox.closest('[data-slot=select-content]')!).animationName).toBe('none');
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(body.getByRole('option', { name: '50 minutes — 240 zł' })).toHaveAttribute('data-highlighted'));
    await userEvent.keyboard('{Enter}');
    await expect(args.onValueChange).toHaveBeenCalledWith('50');
    await waitFor(() => expect(trigger).toHaveTextContent('50 minutes — 240 zł'));
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
export const PointerSelection: Story = {
  play: async ({ canvasElement, args }) => {
    await viewportSettled();
    const trigger = within(canvasElement).getByRole('combobox', { name: 'Session length' });
    await userEvent.click(trigger);
    await userEvent.click(await within(document.body).findByRole('option', { name: '25 minutes — 120 zł' }));
    await expect(args.onValueChange).toHaveBeenCalledWith('25');
    await waitFor(() => expect(trigger).toHaveTextContent('25 minutes — 120 zł'));
  },
};
