import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@mentio/ui/components/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@mentio/ui/components/card';
import { Link } from '@mentio/ui/backend/actions';

const meta = {
  title: 'Primitives/Card',
  component: Card,
  render: () => <div className="primitive-demo">
    <Card>
      <CardHeader>
        <CardTitle><h2>Booking summary</h2></CardTitle>
        <CardDescription>Text session with Alex, 6 November 2026 at 18:00 (Warsaw time).</CardDescription>
      </CardHeader>
      <CardContent><p>50 minutes — 240 PLN</p></CardContent>
    </Card>
  </div>,
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const WithActionAndFooter: Story = {
  render: () => <div className="primitive-demo">
    <Card>
      <CardHeader>
        <CardTitle><h2>Booking summary</h2></CardTitle>
        <CardDescription>Text session with Alex, 6 November 2026 at 18:00 (Warsaw time).</CardDescription>
        <CardAction><Button type="button" variant="ghost" size="sm">Edit question or length</Button></CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-within-group">
        <p>50 minutes — 240 PLN</p>
        <p>Simulated payment — no money is charged.</p>
      </CardContent>
      <CardFooter className="border-t"><Button type="button">Pay 240 PLN</Button></CardFooter>
    </Card>
  </div>,
};
export const EditorSection: Story = {
  render: () => <div className="primitive-demo">
    <Card>
      <CardHeader className="border-b">
        <CardTitle><h2>Public work</h2></CardTitle>
        <CardDescription>Links a mentee can open to judge your experience. Ratings are not shown on Mentio.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-within-group">
        <Link href="https://example.test/alex/ingress-upgrade-notes">example.test/alex/ingress-upgrade-notes</Link>
        <Link href="https://example.test/alex/postgres-locking-talk">example.test/alex/postgres-locking-talk</Link>
      </CardContent>
    </Card>
  </div>,
};
export const Metric: Story = {
  render: () => <div className="primitive-demo">
    <Card>
      <CardHeader>
        <CardDescription>Users</CardDescription>
        <CardTitle className="tabular-nums">128</CardTitle>
      </CardHeader>
    </Card>
  </div>,
};
export const States: Story = {
  render: () => <div className="primitive-demo flex flex-col gap-between-groups">
    <p>Card is a static surface: hover, focus, pressed, selected and disabled are not card states. Interactive children keep their own states.</p>
    <Card><CardHeader><CardTitle><h2>Draft — content only</h2></CardTitle></CardHeader><CardContent><p>Save your draft to keep the description and links.</p></CardContent></Card>
    <Card aria-busy="true"><CardHeader><CardTitle><h2>Loading</h2></CardTitle><CardDescription role="status">Loading your mentor page. The last saved content stays visible.</CardDescription></CardHeader></Card>
    <Card><CardHeader><CardTitle><h2>Error inside a card</h2></CardTitle><CardDescription>The panel stays neutral; the message names what happened and what to do.</CardDescription></CardHeader><CardContent><p role="alert" className="text-destructive">Your page could not be saved. Check your connection and save again.</p></CardContent></Card>
  </div>,
};
export const LongContent: Story = {
  render: () => <div className="primitive-demo">
    <Card>
      <CardHeader>
        <CardTitle><h2>Question about the Kubernetes ingress that stopped responding after the cluster upgrade to the new controller version</h2></CardTitle>
        <CardDescription>Text session with Aleksandra Wiśniewska-Kowalczyk, 6 November 2026 at 18:00 (Warsaw time). The mentor decides after payment.</CardDescription>
        <CardAction><Button type="button" variant="ghost" size="sm">Edit question or length</Button></CardAction>
      </CardHeader>
      <CardContent><p className="font-mono break-all">kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since=1h</p></CardContent>
      <CardFooter className="border-t"><Button type="button">Pay 240 PLN</Button><Button type="button" variant="outline">Cancel booking</Button></CardFooter>
    </Card>
  </div>,
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const StructureAndFocusOrder: Story = {
  ...WithActionAndFooter,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvasElement.querySelector('[data-slot=card]')!;
    const style = getComputedStyle(card);
    await expect(style.borderRadius).toBe('14px');
    await expect(style.paddingTop).toBe('24px');
    await expect(style.borderTopWidth).toBe('1px');
    const title = canvas.getByRole('heading', { level: 2, name: 'Booking summary' });
    await expect(getComputedStyle(title).fontSize).toBe('20px');
    await expect(getComputedStyle(title).lineHeight).toBe('28px');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Edit question or length' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Pay 240 PLN' })).toHaveFocus();
  },
};
// WCAG 1.4.10 regression: a header narrower than 24rem moves the action under the title.
export const NarrowHeaderReflow: Story = {
  render: () => <div className="w-(--viewport-small)"><Card>
    <CardHeader>
      <CardTitle><h2>Booking summary</h2></CardTitle>
      <CardDescription>Text session with Aleksandra Wiśniewska-Kowalczyk, 6 November 2026 at 18:00 (Warsaw time).</CardDescription>
      <CardAction><Button type="button" variant="ghost" size="sm">Edit question or length</Button></CardAction>
    </CardHeader>
  </Card></div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvasElement.querySelector('[data-slot=card]')!.getBoundingClientRect();
    const title = canvas.getByRole('heading', { name: 'Booking summary' }).getBoundingClientRect();
    const action = canvas.getByRole('button', { name: 'Edit question or length' }).getBoundingClientRect();
    await expect(action.top).toBeGreaterThan(title.bottom);
    await expect(action.right).toBeLessThanOrEqual(card.right);
    for (const part of canvasElement.querySelectorAll('[data-slot=card] *')) await expect(part.getBoundingClientRect().right).toBeLessThanOrEqual(card.right);
  },
};
