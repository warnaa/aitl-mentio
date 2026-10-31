import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { PanelShell } from '@mentio/ui/backend/layout';
import { Button } from '@mentio/ui/components/button';

// F8: `(mentor)` routes `/mentor/strona`, `/mentor/terminy`; `(mentee)` `/rezerwacje`. English story copy.
const mentorItems = [{ href: '#/mentor/strona', label: 'My page' }, { href: '#/mentor/terminy', label: 'My slots' }];

const meta = {
  title: 'Primitives/PanelShell',
  component: PanelShell,
  parameters: { layout: 'fullscreen' },
  args: { title: 'Mentio — mentor', homeHref: '#/mentor/strona', items: mentorItems, currentHref: '#/mentor/terminy', navLabel: 'Mentor', skipLabel: 'Skip to content', actions: <Button type="button" variant="ghost" size="sm">Sign out</Button>, children: <section className="flex flex-col gap-within-group"><h1 className="text-2xl font-semibold">My slots</h1><p>Times are Warsaw time. Each slot reserves 50 minutes.</p></section> },
  argTypes: { items: { control: false }, actions: { control: false }, children: { control: false }, linkComponent: { control: false } },
} satisfies Meta<typeof PanelShell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Mentee: Story = { args: { title: 'Mentio', homeHref: '#/rezerwacje', items: [{ href: '#/rezerwacje', label: 'My bookings' }], currentHref: '#/rezerwacje', navLabel: 'Bookings', children: <h1 className="text-2xl font-semibold">My bookings</h1> } };
export const WithoutHeaderActions: Story = { args: { actions: undefined } };
export const States: Story = { args: { children: <p>The current page link is marked with aria-current and an inset bar plus the accent surface (not colour alone). Hover uses the accent surface; focus uses the sidebar ring. The skip link appears on the first Tab.</p> } };
export const LongContent: Story = { args: { title: 'Mentio — mentor panel for Aleksandra Wiśniewska-Kowalczyk', items: [...mentorItems, { href: '#/mentor/zarobki', label: 'My earnings per session (preliminary)' }] } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const SkipLinkAndCurrentPage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    const skip = canvas.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toHaveFocus();
    await expect(skip.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    await expect(canvas.getByRole('navigation', { name: 'Mentor' })).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: 'My slots' })).toHaveAttribute('aria-current', 'page');
    // Activating the hash link would navigate the test frame; assert its target instead.
    const main = canvas.getByRole('main');
    await expect(skip.getAttribute('href')).toBe(`#${main.id}`);
    await expect(main).toHaveAttribute('tabindex', '-1');
  },
};
