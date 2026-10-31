import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@mentio/ui/components/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@mentio/ui/components/alert-dialog';
import { Button } from '@mentio/ui/components/button';

// Mentor-pages UI/UX + F5: removing a slot; book-and-pay UI/UX: cancelling a booking (full refund of 120 zł).
const RemoveSlot = ({ onRemove }: { onRemove?: () => void }) => <AlertDialogContent>
  <AlertDialogHeader>
    <AlertDialogTitle>Remove the slot on Thursday, 6 November 2026 at 18:00?</AlertDialogTitle>
    <AlertDialogDescription>Mentees will no longer see this time on your page. A slot with a booking in progress cannot be removed.</AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel>Keep slot</AlertDialogCancel>
    <AlertDialogAction variant="destructive" onClick={onRemove}>Remove slot</AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>;

const meta = {
  title: 'Primitives/AlertDialog',
  component: AlertDialog,
  args: { onOpenChange: fn() },
  argTypes: { onOpenChange: { control: false } },
  render: args => <div className="primitive-demo"><AlertDialog {...args}>
    <AlertDialogTrigger asChild><Button type="button" variant="outline">Remove slot</Button></AlertDialogTrigger>
    <RemoveSlot />
  </AlertDialog></div>,
} satisfies Meta<typeof AlertDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const CancelBookingTrigger: Story = {
  render: args => <div className="primitive-demo"><AlertDialog {...args}>
    <AlertDialogTrigger asChild><Button type="button" variant="outline">Cancel booking</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancel your booking with Alex on 6 November 2026 at 18:00?</AlertDialogTitle>
        <AlertDialogDescription>You will receive a full refund of 120 zł. The slot becomes available to other mentees.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Keep booking</AlertDialogCancel><AlertDialogAction variant="destructive">Cancel booking</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog></div>,
};
// Open states render without a trigger, so nothing focusable sits behind the modal.
export const RemoveSlotOpen: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <AlertDialog {...args}><RemoveSlot /></AlertDialog>,
  play: async () => {
    const dialog = await within(document.body).findByRole('alertdialog', { name: /Remove the slot/ });
    const style = getComputedStyle(dialog);
    await expect(style.borderRadius).toBe('10px');
    await expect(style.animationName).toBe('none');
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'var(--background)';
    document.body.append(probe);
    await expect(style.backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.style.backgroundColor = 'var(--overlay-scrim)';
    await expect(getComputedStyle(document.querySelector('[data-slot=alert-dialog-overlay]')!).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.remove();
    const title = within(dialog).getByRole('heading');
    await expect(getComputedStyle(title).fontSize).toBe('16px');
    await expect(getComputedStyle(title).lineHeight).toBe('24px');
    await expect(getComputedStyle(title).textAlign).toBe('start');
  },
};
export const PendingAction: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <AlertDialog {...args}><AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remove the slot on Thursday, 6 November 2026 at 18:00?</AlertDialogTitle>
      <AlertDialogDescription>Mentees will no longer see this time on your page.</AlertDialogDescription>
    </AlertDialogHeader>
    <p role="status" id="remove-pending">Removing the slot. You can close this once it is done.</p>
    <AlertDialogFooter>
      <AlertDialogCancel disabled>Keep slot</AlertDialogCancel>
      <Button type="button" variant="destructive" disabled aria-busy="true" aria-describedby="remove-pending">Removing slot…</Button>
    </AlertDialogFooter>
  </AlertDialogContent></AlertDialog>,
};
export const ErrorInDialog: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <AlertDialog {...args}><AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remove the slot on Thursday, 6 November 2026 at 18:00?</AlertDialogTitle>
      <AlertDialogDescription>Mentees will no longer see this time on your page.</AlertDialogDescription>
    </AlertDialogHeader>
    <Alert variant="destructive"><CircleAlert aria-hidden="true" /><AlertTitle>This slot is held by a booking in progress</AlertTitle><AlertDescription>It cannot be removed until that booking is paid, cancelled or expires.</AlertDescription></Alert>
    <AlertDialogFooter><AlertDialogCancel>Keep slot</AlertDialogCancel></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>,
};
export const LongContent: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <AlertDialog {...args}><AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Cancel your booking with Aleksandra Wiśniewska-Kowalczyk on Thursday, 6 November 2026 at 18:00 (Warsaw time)?</AlertDialogTitle>
      <AlertDialogDescription>The mentor has not accepted yet, so you will receive a full refund of 240 zł. The slot becomes available to other mentees once the booking is cancelled.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter><AlertDialogCancel>Keep my booking and question</AlertDialogCancel><AlertDialogAction variant="destructive">Cancel booking and refund 240 zł</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>,
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };

function RemoveFlow({ onRemove }: { onRemove: () => void }) {
  const [removed, setRemoved] = useState(false);
  return <div className="primitive-demo flex flex-col gap-between-groups">
    <AlertDialog>
      <AlertDialogTrigger asChild><Button type="button" variant="outline">Remove slot</Button></AlertDialogTrigger>
      <RemoveSlot onRemove={() => { setRemoved(true); onRemove(); }} />
    </AlertDialog>
    {removed && <p role="status">The slot on 6 November 2026 at 18:00 was removed.</p>}
  </div>;
}
const remove = fn();
export const KeyboardConfirmAndCancel: Story = {
  render: () => <RemoveFlow onRemove={remove} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: 'Remove slot' });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const dialog = await body.findByRole('alertdialog');
    const keep = within(dialog).getByRole('button', { name: 'Keep slot' });
    const confirm = within(dialog).getByRole('button', { name: 'Remove slot' });
    // WAI-ARIA alertdialog: the least destructive action receives focus first.
    await waitFor(() => expect(keep).toHaveFocus());
    await userEvent.tab();
    await expect(confirm).toHaveFocus();
    await userEvent.tab();
    await expect(keep).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(remove).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await within(await body.findByRole('alertdialog')).findByRole('button', { name: 'Remove slot' }));
    await expect(remove).toHaveBeenCalledTimes(1);
    await expect(await canvas.findByRole('status')).toHaveTextContent('was removed');
  },
};
