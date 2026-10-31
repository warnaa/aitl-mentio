import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Copy, Ellipsis, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@mentio/ui/components/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@mentio/ui/components/dropdown-menu';

// Mentor-pages UI/UX: copy the share link (D02), view the public page, unpublish; availability: remove a slot.
const copyLink = fn();
const PageActions = ({ withStates = false }: { withStates?: boolean }) => <DropdownMenuContent align="end">
  <DropdownMenuLabel>Your mentor page</DropdownMenuLabel>
  <DropdownMenuGroup>
    <DropdownMenuItem onSelect={copyLink}><Copy aria-hidden="true" />Copy share link</DropdownMenuItem>
    <DropdownMenuItem data-preview-state={withStates ? 'hover' : undefined}><ExternalLink aria-hidden="true" />View public page</DropdownMenuItem>
    <DropdownMenuItem disabled={withStates}>Unpublish page{withStates ? ' — saving your draft first' : ''}</DropdownMenuItem>
  </DropdownMenuGroup>
</DropdownMenuContent>;

const meta = {
  title: 'Primitives/DropdownMenu',
  component: DropdownMenu,
  args: { onOpenChange: fn() },
  argTypes: { onOpenChange: { control: false }, modal: { control: 'boolean' } },
  render: args => <div className="primitive-demo flex justify-end"><DropdownMenu {...args}>
    <DropdownMenuTrigger asChild><Button type="button" variant="outline">Page actions</Button></DropdownMenuTrigger>
    <PageActions />
  </DropdownMenu></div>,
} satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const IconTrigger: Story = {
  render: args => <div className="primitive-demo flex items-center justify-between gap-between-groups">
    <span>Thursday, 6 November 2026, 18:00</span>
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" aria-label="Actions for the slot on 6 November 2026 at 18:00"><Ellipsis aria-hidden="true" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuItem variant="destructive"><Trash2 aria-hidden="true" />Remove slot</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
  </div>,
};
// Open menus render without a trigger and as non-modal, so the frozen states stay visible to axe.
export const StatesOpen: Story = {
  args: { defaultOpen: true, modal: false },
  parameters: { docs: { disable: true } },
  render: args => <DropdownMenu {...args}><DropdownMenuTrigger className="sr-only">Page actions</DropdownMenuTrigger><DropdownMenuContent align="start">
    <DropdownMenuLabel>Your mentor page</DropdownMenuLabel>
    <DropdownMenuItem><Copy aria-hidden="true" />Default: copy share link</DropdownMenuItem>
    <DropdownMenuItem data-preview-state="hover"><ExternalLink aria-hidden="true" />Highlighted: view public page</DropdownMenuItem>
    <DropdownMenuItem disabled>Disabled: unpublish page — saving your draft first</DropdownMenuItem>
    <DropdownMenuCheckboxItem checked>Selected: show me in the mentor list</DropdownMenuCheckboxItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive"><Trash2 aria-hidden="true" />Destructive: remove slot</DropdownMenuItem>
    <DropdownMenuItem variant="destructive" data-preview-state="hover"><Trash2 aria-hidden="true" />Destructive highlighted: remove slot</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>,
  play: async () => {
    const menu = await within(document.body).findByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    await expect(items[0].getBoundingClientRect().height).toBe(32);
    const probe = document.createElement('span');
    document.body.append(probe);
    probe.style.backgroundColor = 'var(--accent)';
    await expect(getComputedStyle(items[1]).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.style.backgroundColor = 'var(--error-surface)';
    await expect(getComputedStyle(items[4]).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.style.backgroundColor = 'var(--popover)';
    await expect(getComputedStyle(menu).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.remove();
    await expect(getComputedStyle(menu).animationName).toBe('none');
    await expect(items[2]).toHaveAttribute('aria-disabled', 'true');
    await expect(within(menu).getByRole('menuitemcheckbox')).toHaveAttribute('aria-checked', 'true');
  },
};
export const LongContent: Story = {
  args: { defaultOpen: true, modal: false },
  parameters: { docs: { disable: true } },
  render: args => <div className="primitive-demo"><DropdownMenu {...args}><DropdownMenuTrigger asChild><Button type="button" variant="outline">Page actions</Button></DropdownMenuTrigger><DropdownMenuContent align="start">
    <DropdownMenuItem><Copy aria-hidden="true" />Copy the share link to aleksandra-wisniewska-kowalczyk</DropdownMenuItem>
    <DropdownMenuItem>Unpublish the page; your draft and share link stay saved for later</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu></div>,
  play: async () => {
    const menu = await within(document.body).findByRole('menu');
    await expect(menu.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
  },
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };

// Radix menus close on window resize; the preceding Narrow story restores the width asynchronously.
const viewportSettled = () => new Promise<void>(resolve => {
  const done = () => { removeEventListener('resize', reset); resolve(); };
  let timer = setTimeout(done, 250);
  function reset() { clearTimeout(timer); timer = setTimeout(done, 250); }
  addEventListener('resize', reset);
});
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    await viewportSettled();
    const trigger = within(canvasElement).getByRole('button', { name: 'Page actions' });
    const body = within(document.body);
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const menu = await body.findByRole('menu', {}, { timeout: 3000 });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(body.getByRole('menuitem', { name: 'Copy share link' })).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await expect(body.getByRole('menuitem', { name: 'View public page' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect(body.getByRole('menuitem', { name: 'Unpublish page' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(body.getByRole('menuitem', { name: 'Copy share link' })).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await expect(copyLink).toHaveBeenCalled();
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
  },
};
