import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { AccountNav } from '@mentio/ui/components/auth/AccountNav';
import { Button } from '@mentio/ui/components/button';

// Accounts UI/UX header: signed out → sign in + create account; signed in → sign out (no name shown).
const meta = {
  title: 'Product/Platform and accounts/AccountNav',
  component: AccountNav,
  parameters: { layout: 'fullscreen' },
  args: { brand: { href: '#/', label: 'Mentio' }, navLabel: 'Account', signedIn: false, signIn: { href: '#/logowanie', label: 'Sign in' }, signUp: { href: '#/rejestracja', label: 'Create account' }, signOut: <Button type="button" variant="ghost" size="sm">Sign out</Button> },
  argTypes: { signOut: { control: false }, linkComponent: { control: false } },
} satisfies Meta<typeof AccountNav>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {};
export const SignedIn: Story = { args: { signedIn: true } };
export const SignOutFailed: Story = { args: { signedIn: true, signOut: <span className="flex flex-wrap items-center gap-within-group"><Button type="button" variant="ghost" size="sm">Sign out</Button><span role="alert" className="mentio-field-error">You are still signed in. Try again.</span></span> } };
export const States: Story = { args: { signedIn: false } };
export const LongContent: Story = { args: { brand: { href: '#/', label: 'Mentio — text sessions with experienced mentors' }, signIn: { href: '#/logowanie', label: 'Sign in to your account' }, signUp: { href: '#/rejestracja', label: 'Create a free account' } } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const KeyboardOrder: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'Mentio' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'Sign in' })).toHaveFocus();
    await userEvent.tab();
    const cta = canvas.getByRole('link', { name: 'Create account' });
    await expect(cta).toHaveFocus();
    await expect(getComputedStyle(cta).outlineWidth).toBe('3px');
    await expect(cta.getBoundingClientRect().height).toBeGreaterThanOrEqual(36);
  },
};
