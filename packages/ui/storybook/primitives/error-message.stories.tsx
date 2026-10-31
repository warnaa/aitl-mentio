import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ErrorMessage } from '@mentio/ui/backend/feedback';

// Copy: platform F defaults (“Coś poszło nie tak”, “Spróbuj ponownie”) in English; product example `/rezerwacje`.
const meta = {
  title: 'Primitives/ErrorMessage',
  component: ErrorMessage,
  args: { title: 'We could not load your bookings', message: 'Check your connection, then try again. Your bookings are not affected.', onRetry: fn() },
  argTypes: { title: { control: 'text' }, message: { control: 'text' }, onRetry: { control: false } },
  render: args => <div className="primitive-demo"><ErrorMessage {...args} /></div>,
} satisfies Meta<typeof ErrorMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const DefaultTitle: Story = { args: { title: undefined, message: 'Check your connection, then try again.' } };
export const WithoutRetry: Story = { args: { title: 'Database unavailable', message: 'Check DATABASE_URL in .env and run npm run db:migrate. Details are in the server log.', onRetry: undefined } };
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p>One state: failed. Retry is available only when trying again can help; the button keeps Button states (hover, focus, disabled while retrying).</p>
    <ErrorMessage title="We could not load your bookings" message="Check your connection, then try again." />
  </div>,
};
export const LongContent: Story = { args: { title: 'We could not load the mentors on the list because the connection to the server was interrupted', message: 'Check your connection, then try again. If the problem continues, wait a few minutes: nothing you saved has been lost and your bookings are not affected by this error.' } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const RetryAndTokens: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole('alert');
    const style = getComputedStyle(alert);
    const probe = document.createElement('span');
    canvasElement.append(probe);
    probe.style.backgroundColor = 'var(--error-surface)';
    await expect(style.backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.style.borderColor = 'var(--destructive)';
    probe.style.borderStyle = 'solid';
    await expect(style.borderTopColor).toBe(getComputedStyle(probe).borderTopColor);
    probe.remove();
    await expect(style.borderTopWidth).toBe('1px');
    await userEvent.tab();
    const retry = canvas.getByRole('button', { name: 'Try again' });
    await expect(retry).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};
