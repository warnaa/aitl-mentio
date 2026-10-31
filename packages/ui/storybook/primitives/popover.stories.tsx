import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@mentio/ui/components/button';
import { Input } from '@mentio/ui/components/input';
import { Label } from '@mentio/ui/components/label';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@mentio/ui/components/popover';

// Illustrations from current rules: D02 share link (copy feedback stays local, R02.4) and R11 booking window.
const shareUrl = 'https://mentio.example/mentorzy/alex';

function ShareLink({ onCopy }: { onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  return <div className="flex flex-col gap-within-group">
    <Label htmlFor="share-url">Share link</Label>
    <Input id="share-url" readOnly value={shareUrl} />
    <div className="flex flex-wrap items-center gap-within-group">
      <Button type="button" size="sm" onClick={() => { setCopied(true); onCopy?.(); }}>Copy link</Button>
      <span role="status">{copied ? 'Link copied.' : ''}</span>
    </div>
  </div>;
}

const meta = {
  title: 'Primitives/Popover',
  component: Popover,
  args: { onOpenChange: fn() },
  argTypes: { onOpenChange: { control: false }, modal: { control: 'boolean' } },
  render: args => <div className="primitive-demo"><Popover {...args}>
    <PopoverTrigger asChild><Button type="button" variant="outline">Share your page</Button></PopoverTrigger>
    <PopoverContent align="start" aria-label="Share your page"><ShareLink /></PopoverContent>
  </Popover></div>,
} satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Explanation: Story = {
  render: args => <div className="primitive-demo"><Popover {...args}>
    <PopoverTrigger asChild><Button type="button" variant="link" className="h-auto whitespace-normal text-left">Why can’t I book this time?</Button></PopoverTrigger>
    <PopoverContent align="start" aria-labelledby="window-title"><PopoverHeader>
      <PopoverTitle id="window-title">Booking window</PopoverTitle>
      <PopoverDescription>A slot can be booked from 2 hours to 14 days before it starts. This time is outside that window.</PopoverDescription>
    </PopoverHeader></PopoverContent>
  </Popover></div>,
};
export const Open: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <div className="primitive-demo"><Popover {...args}>
    <PopoverTrigger asChild><Button type="button" variant="outline">Share your page</Button></PopoverTrigger>
    <PopoverContent align="start" aria-label="Share your page"><ShareLink /></PopoverContent>
  </Popover></div>,
  play: async () => {
    const content = await within(document.body).findByRole('dialog', { name: 'Share your page' });
    await waitFor(() => expect(content).toBeVisible());
    const style = getComputedStyle(content);
    await expect(style.borderRadius).toBe('8px');
    await expect(style.width).toBe('288px');
    await expect(style.animationName).toBe('none');
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'var(--popover)';
    document.body.append(probe);
    await expect(style.backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.remove();
  },
};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p>Closed and open are the popover’s states. The trigger and controls inside keep their own states. Open states: Open, Long content and Narrow stories.</p>
  </div>,
};
export const LongContent: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <div className="primitive-demo"><Popover {...args}>
    <PopoverTrigger asChild><Button type="button" variant="link" className="h-auto whitespace-normal text-left">Why can’t I book this time?</Button></PopoverTrigger>
    <PopoverContent align="start" aria-labelledby="window-long-title"><PopoverHeader>
      <PopoverTitle id="window-long-title">This time is outside the booking window for text sessions with this mentor</PopoverTitle>
      <PopoverDescription>A slot can be booked from 2 hours to 14 days before it starts. Times closer than 2 hours or further than 14 days ahead stay visible on the mentor’s page so you can plan, but they cannot be booked yet.</PopoverDescription>
    </PopoverHeader></PopoverContent>
  </Popover></div>,
  play: async () => {
    const content = document.querySelector('[data-slot=popover-content]')!;
    await waitFor(() => expect(content).toBeVisible());
    await expect(content.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
  },
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
const copied = fn();
export const KeyboardAndLocalFeedback: Story = {
  render: args => <div className="primitive-demo"><Popover {...args}>
    <PopoverTrigger asChild><Button type="button" variant="outline">Share your page</Button></PopoverTrigger>
    <PopoverContent align="start" aria-label="Share your page"><ShareLink onCopy={copied} /></PopoverContent>
  </Popover></div>,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Share your page' });
    const body = within(document.body);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const field = await body.findByRole('textbox', { name: 'Share link' });
    await waitFor(() => expect(field).toHaveFocus());
    await userEvent.tab();
    await expect(body.getByRole('button', { name: 'Copy link' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(copied).toHaveBeenCalledTimes(1);
    await expect(body.getByRole('status')).toHaveTextContent('Link copied.');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('textbox', { name: 'Share link' })).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
