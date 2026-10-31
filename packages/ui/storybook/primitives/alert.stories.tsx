import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { CircleAlert, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@mentio/ui/components/alert';
import { Button } from '@mentio/ui/components/button';

// Messages: book-and-pay UI/UX (slot conflict, simulated payment, declined payment, refund failure).
const meta = {
  title: 'Primitives/Alert',
  component: Alert,
  args: { variant: 'destructive' },
  argTypes: { variant: { control: 'select', options: ['default', 'destructive'] } },
  render: args => <div className="primitive-demo"><Alert {...args}>
    <CircleAlert aria-hidden="true" />
    <AlertTitle>This slot was just taken</AlertTitle>
    <AlertDescription>Another mentee booked it a moment ago. Choose another time; your question is still here.</AlertDescription>
  </Alert></div>,
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Notice: Story = {
  render: () => <div className="primitive-demo"><Alert role="note">
    <Info aria-hidden="true" />
    <AlertTitle>Simulated payment — no money is charged</AlertTitle>
    <AlertDescription>Your slot is held for you until 18:32.</AlertDescription>
  </Alert></div>,
};
export const Destructive: Story = {
  render: () => <div className="primitive-demo"><Alert variant="destructive">
    <CircleAlert aria-hidden="true" />
    <AlertTitle>Payment declined — the slot was released</AlertTitle>
    <AlertDescription>No money was taken. Choose a time again to book this mentor.</AlertDescription>
  </Alert></div>,
};
export const WithoutIcon: Story = {
  render: () => <div className="primitive-demo"><Alert role="note">
    <AlertTitle>Bookings are temporarily switched off</AlertTitle>
    <AlertDescription>Your existing bookings and payments are unaffected.</AlertDescription>
  </Alert></div>,
};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">
    <p>An alert is not interactive: hover, focus, pressed, disabled and selected do not apply. What changes is how it is announced.</p>
    <Alert role="note"><Info aria-hidden="true" /><AlertTitle>Static notice (role “note”)</AlertTitle><AlertDescription>Present when the page loads; read in order, not announced.</AlertDescription></Alert>
    <Alert role="status"><Info aria-hidden="true" /><AlertTitle>Payment in progress… (role “status”)</AlertTitle><AlertDescription>Announced politely when it appears. Keep this page open.</AlertDescription></Alert>
    <Alert variant="destructive"><CircleAlert aria-hidden="true" /><AlertTitle>Refund failed (role “alert”, default)</AlertTitle><AlertDescription>Announced at once when it appears after an action. We will retry the refund; you do not need to do anything now.</AlertDescription></Alert>
  </div>,
};
export const LongContent: Story = {
  render: () => <div className="primitive-demo"><Alert variant="destructive">
    <CircleAlert aria-hidden="true" />
    <AlertTitle>You already have an unpaid booking with this mentor for Thursday, 6 November 2026 at 18:00 (Warsaw time)</AlertTitle>
    <AlertDescription><p>Pay for it or cancel it before booking another time. The held slot stays reserved for you until the payment deadline shown on the booking.</p></AlertDescription>
  </Alert></div>,
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };

function PayWithFailure() {
  const [failed, setFailed] = useState(false);
  return <div className="primitive-demo flex flex-col gap-between-groups">
    <Button type="button" onClick={() => setFailed(true)}>Pay 240 zł</Button>
    {failed && <Alert variant="destructive"><CircleAlert aria-hidden="true" /><AlertTitle>Payment declined — the slot was released</AlertTitle><AlertDescription>No money was taken. Choose a time again to book this mentor.</AlertDescription></Alert>}
  </div>;
}
export const AnnouncedAfterAction: Story = {
  render: () => <PayWithFailure />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('alert')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Pay 240 zł' }));
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('Payment declined — the slot was released');
    const style = getComputedStyle(alert);
    await expect(style.borderRadius).toBe('10px');
    await expect(style.borderTopWidth).toBe('1px');
    const probe = document.createElement('span');
    probe.style.color = 'var(--destructive)';
    canvasElement.append(probe);
    await expect(style.color).toBe(getComputedStyle(probe).color);
    probe.remove();
  },
};
