import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ArrowRight, Bookmark, Trash2 } from 'lucide-react';
import { Button } from '@mentio/ui/components/button';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Save mentor page', type: 'button', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] },
    size: { control: 'select', options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] },
    disabled: { control: 'boolean' },
    asChild: { control: false },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Primary: Story = { args: { variant: 'default' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Remove availability' } };
export const Outline: Story = { args: { variant: 'outline', children: 'Keep availability' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Preview mentor page' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'Edit question' } };
export const TextAction: Story = { args: { variant: 'link', children: 'Copy share link' } };
export const ExtraSmall: Story = { args: { size: 'xs' } };
export const Small: Story = { args: { size: 'sm' } };
export const DefaultSize: Story = { args: { size: 'default' } };
export const Large: Story = { args: { size: 'lg' } };
export const Icon: Story = { args: { size: 'icon', 'aria-label': 'Save mentor page', children: <Bookmark aria-hidden="true" /> } };
export const IconExtraSmall: Story = { args: { size: 'icon-xs', 'aria-label': 'Save mentor page', children: <Bookmark aria-hidden="true" /> } };
export const IconSmall: Story = { args: { size: 'icon-sm', 'aria-label': 'Save mentor page', children: <Bookmark aria-hidden="true" /> } };
export const IconLarge: Story = { args: { size: 'icon-lg', 'aria-label': 'Save mentor page', children: <Bookmark aria-hidden="true" /> } };
export const WithIcon: Story = { args: { children: <>Continue to payment <ArrowRight aria-hidden="true" /></> } };
export const StateMatrix: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">
    <div className="flex flex-wrap gap-between-groups">
      <Button type="button">Save page</Button>
      <Button type="button" data-preview-state="hover">Hover: save page</Button>
      <Button type="button" data-preview-state="focus">Focus: save page</Button>
      <Button type="button" data-preview-state="pressed">Pressed: save page</Button>
      <Button type="button" aria-pressed="true">Listed mentor page</Button>
      <Button type="button" disabled aria-describedby="publish-reason">Publish page</Button>
      <Button type="button" disabled aria-busy="true" aria-describedby="save-reason">Saving page…</Button>
      <Button type="button" aria-invalid="true" aria-describedby="publish-error">Retry publication</Button>
    </div>
    <p id="publish-reason">Add a public-work link and save your draft before publishing.</p>
    <p id="save-reason" role="status">Saving the draft. Your draft remains visible.</p>
    <p id="publish-error" role="alert">The page could not be published. Review the public-work links, then retry.</p>
  </div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const normal = canvas.getByRole('button', { name: 'Save page' });
    const frozenHover = canvas.getByRole('button', { name: 'Hover: save page' });
    const frozenFocus = canvas.getByRole('button', { name: 'Focus: save page' });
    await expect(normal.getBoundingClientRect().height).toBe(36);
    await expect(getComputedStyle(normal).borderRadius).toBe('8px');
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'var(--primary-hover)';
    canvasElement.append(probe);
    await expect(getComputedStyle(probe).backgroundColor).toBe(getComputedStyle(frozenHover).backgroundColor);
    probe.remove();
    normal.focus();
    await userEvent.keyboard('{Tab}');
    const active = document.activeElement;
    await expect(active).toBe(frozenHover);
    await expect(getComputedStyle(frozenHover).outlineWidth).toBe('3px');
    await expect(getComputedStyle(frozenHover).outlineColor).toBe(getComputedStyle(frozenFocus).outlineColor);
    await expect(getComputedStyle(frozenFocus).outlineOffset).toBe('2px');
  },
};
export const LongContent: Story = {
  args: { children: 'Save the mentor page and keep the updated public-work links', className: 'h-auto max-w-full whitespace-normal text-left' },
  parameters: { layout: 'fullscreen' },
  render: args => <div className="primitive-demo"><Button {...args} /></div>,
};
export const AsNavigation: Story = {
  render: () => <div className="primitive-demo"><Button asChild><a href="#mentor-public-work">View mentor page</a></Button><p id="mentor-public-work">Public work and availability</p></div>,
};
export const GoodAndBad: Story = {
  render: () => <div className="primitive-demo flex flex-wrap gap-between-groups">
    <div><p>Good: the action names its object.</p><Button type="button" variant="destructive"><Trash2 aria-hidden="true" /> Remove availability</Button></div>
    <div><p>Bad wording: “OK”.</p><p>The ambiguous label hides which availability record will be removed. This is explanatory text rather than an active destructive example.</p></div>
  </div>,
};
export const KeyboardAndClick: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Save mentor page' });
    await userEvent.click(button);
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
};
