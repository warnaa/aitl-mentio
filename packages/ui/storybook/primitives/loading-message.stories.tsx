import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { LoadingMessage } from '@mentio/ui/backend/feedback';

// Default label: platform F shared ui defaults (“Loading…”); product example: `/rezerwacje`.
const loadingMeta = {
  title: 'Primitives/LoadingMessage',
  component: LoadingMessage,
  args: { label: 'Loading your bookings…' },
  argTypes: { label: { control: 'text' } },
  render: args => <div className="primitive-demo"><LoadingMessage {...args} /></div>,
} satisfies Meta<typeof LoadingMessage>;
export default loadingMeta;
type Story = StoryObj<typeof loadingMeta>;

export const Playground: Story = {};
export const DefaultLabel: Story = { args: { label: undefined } };
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-within-group">
    <p>One state: in progress. The spinner turns (user decision) and stops when the reduced-motion setting is on; the text alone carries the meaning.</p>
    <LoadingMessage label="Loading mentors…" />
  </div>,
};
export const LongContent: Story = { args: { label: 'Loading your bookings and the latest payment status for each of them…' } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const AnnouncesAndSpins: Story = {
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveTextContent('Loading your bookings…');
    const spinner = canvasElement.querySelector('.mentio-spinner')!;
    await expect(spinner).toHaveAttribute('aria-hidden', 'true');
    await expect(getComputedStyle(spinner).animationName).toBe('spin');
    const keyframes = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules]; } catch { return []; } })
      .flatMap(rule => rule instanceof CSSLayerBlockRule ? [...rule.cssRules] : [rule]);
    await expect(keyframes.some(rule => rule instanceof CSSKeyframesRule && rule.name === 'spin')).toBe(true);
    // Story tests run with prefers-reduced-motion: reduce; the global rule stops the spinner.
    await expect(getComputedStyle(spinner).animationDuration).toBe('0s');
  },
};
