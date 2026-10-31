import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@mentio/ui/components/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@mentio/ui/components/dialog';

// Illustration only: no current screen spec opens a non-confirmation dialog (booking edits are inline).
// Content comes from the brief: text-only sessions (N01) and the cancellation rule (R14).
const SessionRules = ({ showCloseButton = true }: { showCloseButton?: boolean }) => <DialogContent showCloseButton={showCloseButton}>
  <DialogHeader>
    <DialogTitle>How a text session works</DialogTitle>
    <DialogDescription>The session takes place in text only — there is no video call.</DialogDescription>
  </DialogHeader>
  <p>You can cancel free of charge until the mentor accepts, and after that up to 12 hours before the session.</p>
  <DialogFooter><DialogClose asChild><Button type="button">Got it</Button></DialogClose></DialogFooter>
</DialogContent>;

const meta = {
  title: 'Primitives/Dialog',
  component: Dialog,
  args: { onOpenChange: fn() },
  argTypes: { onOpenChange: { control: false }, modal: { control: 'boolean' } },
  render: args => <div className="primitive-demo"><Dialog {...args}>
    <DialogTrigger asChild><Button type="button" variant="link">How a text session works</Button></DialogTrigger>
    <SessionRules />
  </Dialog></div>,
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Open: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <Dialog {...args}><SessionRules /></Dialog>,
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog', { name: 'How a text session works' });
    const style = getComputedStyle(dialog);
    await expect(style.borderRadius).toBe('10px');
    await expect(style.paddingTop).toBe('24px');
    await expect(style.animationName).toBe('none');
    const close = within(dialog).getByRole('button', { name: 'Close' });
    await expect(close.getBoundingClientRect().height).toBe(32);
    await expect(close.getBoundingClientRect().width).toBe(32);
    const header = dialog.querySelector('[data-slot=dialog-header]')!;
    // The header's content box ends before the close button, so titles never run under it.
    const contentRight = header.getBoundingClientRect().right - parseFloat(getComputedStyle(header).paddingRight);
    await expect(contentRight).toBeLessThanOrEqual(close.getBoundingClientRect().left);
  },
};
export const WithoutCloseButton: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <Dialog {...args}><SessionRules showCloseButton={false} /></Dialog>,
};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p>Closed and open are the dialog’s states. Its controls keep their own hover, focus, disabled and loading states (see Button). The open states are separate stories: Open, Without close button, Long content and Narrow.</p>
    <Dialog><DialogTrigger asChild><Button type="button" variant="outline">Open the dialog</Button></DialogTrigger><SessionRules /></Dialog>
  </div>,
};
export const LongContent: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <Dialog {...args}><DialogContent>
    <DialogHeader>
      <DialogTitle>How a text session with a mentor works, from the booking to the end of the conversation</DialogTitle>
      <DialogDescription>The session takes place in text only — there is no video call. Paste error messages, configuration and code directly into the conversation.</DialogDescription>
    </DialogHeader>
    {Array.from({ length: 6 }, (_, index) => <p key={index}>You can cancel free of charge until the mentor accepts, and after that up to 12 hours before the session. A later cancellation is not refunded.</p>)}
    <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Back to the booking</Button></DialogClose><DialogClose asChild><Button type="button">I understand how text sessions work</Button></DialogClose></DialogFooter>
  </DialogContent></Dialog>,
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog');
    await expect(dialog.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    await expect(dialog.scrollHeight).toBeGreaterThanOrEqual(dialog.clientHeight);
  },
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const KeyboardFocusTrapAndReturn: Story = {
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'How a text session works' });
    const body = within(document.body);
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const dialog = await body.findByRole('dialog');
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true);
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    for (let step = 0; step < 4; step += 1) {
      await userEvent.tab();
      await expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.click(trigger);
    await userEvent.click(await body.findByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
  },
};
