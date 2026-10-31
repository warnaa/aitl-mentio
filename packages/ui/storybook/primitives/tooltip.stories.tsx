import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Copy } from 'lucide-react';
import { Button } from '@mentio/ui/components/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@mentio/ui/components/tooltip';

// A tooltip repeats a visible control's name or adds non-essential detail; never required information.
const meta = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  decorators: [Story => <TooltipProvider><Story /></TooltipProvider>],
  render: args => <div className="primitive-demo"><Tooltip {...args}>
    <TooltipTrigger asChild><Button type="button" variant="outline" size="icon" aria-label="Copy share link"><Copy aria-hidden="true" /></Button></TooltipTrigger>
    <TooltipContent>Copy share link</TooltipContent>
  </Tooltip></div>,
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Open: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  play: async () => {
    const tip = await within(document.body).findByRole('tooltip');
    const content = document.querySelector('[data-slot=tooltip-content]')!;
    const style = getComputedStyle(content);
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'var(--foreground)';
    probe.style.color = 'var(--background)';
    document.body.append(probe);
    await expect(style.backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    await expect(style.color).toBe(getComputedStyle(probe).color);
    probe.remove();
    await expect(style.fontSize).toBe('12px');
    await expect(style.borderRadius).toBe('8px');
    await expect(style.animationName).toBe('none');
    await expect(tip).toHaveTextContent('Copy share link');
  },
};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p>Hidden and shown are the tooltip’s states; it has no hover, pressed, disabled or error appearance. It appears on pointer hover and on keyboard focus of its trigger. The Open story shows it shown.</p>
  </div>,
};
export const LongContent: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { disable: true } },
  render: args => <div className="primitive-demo"><Tooltip {...args}>
    <TooltipTrigger asChild><Button type="button" variant="outline" size="icon" aria-label="Copy share link"><Copy aria-hidden="true" /></Button></TooltipTrigger>
    <TooltipContent>Copy the share link to your mentor page so you can send it to developers who asked you for help</TooltipContent>
  </Tooltip></div>,
  play: async () => {
    await within(document.body).findByRole('tooltip');
    const content = document.querySelector('[data-slot=tooltip-content]')!;
    await expect(content.getBoundingClientRect().width).toBeLessThanOrEqual(288);
    await expect(content.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
  },
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const KeyboardFocusAndEscape: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Copy share link' });
    const body = within(document.body);
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    const tip = await body.findByRole('tooltip');
    await expect(tip).toHaveTextContent('Copy share link');
    await expect(trigger.getAttribute('aria-describedby')).toBe(tip.id);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());
    await expect(trigger).toHaveFocus();
    await userEvent.tab({ shift: true });
    await userEvent.hover(trigger);
    await expect(await body.findByRole('tooltip')).toBeInTheDocument();
    await userEvent.unhover(trigger);
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());
  },
};
