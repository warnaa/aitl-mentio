import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { EarningsSummary } from '@mentio/ui/components/earnings/EarningsSummary';
import { earningTotals } from '../../fixtures/earnings';

// Preliminary (E05 contract missing): R06 price − commission = share, stored per booking (R21); D13 mock.
const single = { price: { term: 'Price', amount: '240 zł' }, commission: { term: 'Mentio’s commission (20%)', amount: '−48 zł' }, share: { term: 'Your share', amount: '192 zł' } };
const meta = {
  title: 'Product/E05 — Mentor earnings/EarningsSummary',
  component: EarningsSummary,
  args: { title: 'Your earnings', context: '6 settled sessions', ...earningTotals, note: 'Simulated — no money is paid out yet. Payouts start once real payments are switched on.' },
  argTypes: { price: { control: false }, commission: { control: false }, share: { control: false } },
  render: args => <div className="primitive-demo"><EarningsSummary {...args} /></div>,
} satisfies Meta<typeof EarningsSummary>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const OneSession: Story = { args: { title: 'Earnings for this session', context: 'Session held on 4 November 2026', ...single, note: undefined } };
export const States: Story = {
  render: args => <div className="primitive-demo flex flex-col gap-between-groups">
    <p>The summary is static. Each reason a mentor earns has its own context line; a missed or declined session has no earning, so no summary is shown.</p>
    <EarningsSummary {...args} title="Earnings for this session" context="Mentee no-show — the session counts as held" {...single} note={undefined} />
    <EarningsSummary {...args} title="Earnings for this session" context="Late cancellation — less than 12 hours before the session" price={{ term: 'Price', amount: '120 zł' }} commission={{ term: 'Mentio’s commission (20%)', amount: '−24 zł' }} share={{ term: 'Your share', amount: '96 zł' }} note={undefined} />
  </div>,
};
export const LongContent: Story = { args: { title: 'Your earnings from text sessions since you published your page', context: '1,284 settled sessions, including 37 mentee no-shows and 12 late cancellations', price: { term: 'Paid by mentees for sessions that were held or counted as held', amount: '198,240 zł' }, commission: { term: 'Mentio’s commission (20%, stored with each booking)', amount: '−39,648 zł' }, share: { term: 'Your share', amount: '158,592 zł' } } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const ArithmeticOrder: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('term').map(term => term.textContent)).toEqual(['Paid by mentees', 'Mentio’s commission (20%)', 'Your share']);
    await expect(canvas.getAllByRole('definition').map(amount => amount.textContent)).toEqual(['1,020 zł', '−204 zł', '816 zł']);
    const share = canvas.getByText('Your share').parentElement!;
    await expect(getComputedStyle(share).fontWeight).toBe('600');
    await expect(getComputedStyle(canvas.getByText('816 zł')).fontVariantNumeric).toBe('tabular-nums');
  },
};
// WCAG 1.4.10 regression: long terms and amounts wrap inside a 320 px column.
export const LongLinesWrap: Story = {
  args: { ...LongContent.args },
  render: args => <div className="w-full max-w-(--viewport-small)"><EarningsSummary {...args} /></div>,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[data-slot=card]')!.getBoundingClientRect();
    for (const amount of within(canvasElement).getAllByRole('definition')) await expect(amount.getBoundingClientRect().right).toBeLessThanOrEqual(card.right);
  },
};
