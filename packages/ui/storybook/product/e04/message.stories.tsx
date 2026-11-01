import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Message } from '@mentio/ui/components/messages/Message';
import { conversation, longCodeMessage, questionMessage } from '../../fixtures/sessions';

// Preliminary (E04 contract missing): R02.2 inline quote (approved Q5), R02.3 author and time, R01.2 code.
const meta = {
  title: 'Product/E04 — The text session/Message',
  component: Message,
  args: { ...conversation[1], reply: { label: 'Reply', onReply: fn() } },
  argTypes: { body: { control: 'text' }, replyTo: { control: false }, reply: { control: false } },
  render: args => <div className="primitive-demo"><Message {...args} /></div>,
} satisfies Meta<typeof Message>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const WithReplyQuote: Story = { args: { ...conversation[3] } };
export const Question: Story = { args: { ...questionMessage, reply: undefined } };
export const ReadOnly: Story = { name: 'Read-only (ended transcript)', args: { reply: undefined } };
export const States: Story = {
  render: args => <div className="primitive-demo flex flex-col gap-between-groups">
    {(['default', 'target', 'focus'] as const).map(state => <div key={state} className="flex flex-col gap-within-group">
      <p className="mentio-label">{{ default: 'Default', target: 'Linked from a reply (:target)', focus: 'Focused after following the link' }[state]}</p>
      <div data-preview-state={state}><Message {...args} id={`message-state-${state}`} /></div>
    </div>)}
  </div>,
};
export const LongContent: Story = { args: { ...longCodeMessage, author: 'Aleksandra Wiśniewska-Kowalczyk', replyTo: { author: 'Alex', excerpt: 'Can you paste the output of these two? kubectl -n shop get endpoints api -o wide and the pod labels, so we can compare them with the selector', href: '#message-2', goToLabel: 'Go to Alex’s message' } } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const ReplyAndLinkBack: Story = {
  args: { ...conversation[3] },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const article = canvas.getByRole('article', { name: 'Alex Mentor 18:09' });
    await expect(article).toHaveAttribute('id', 'message-4');
    // Following a #hash link would navigate the test frame; assert the target instead (lesson 2026-10-31).
    await expect(canvas.getByRole('link', { name: 'Go to Kasia’s message' })).toHaveAttribute('href', '#message-3');
    await userEvent.click(canvas.getByRole('button', { name: 'Reply' }));
    await expect(args.reply!.onReply).toHaveBeenCalledOnce();
  },
};
export const CodeKeepsLayout: Story = {
  args: { ...conversation[2] },
  play: async ({ canvasElement }) => {
    const pre = canvasElement.querySelector('pre.mentio-message-code')!;
    await expect(pre.textContent).toBe('NAME   ENDPOINTS   AGE\napi    <none>      41d');
    await expect(getComputedStyle(pre).fontFamily).toBe(getComputedStyle(canvasElement.querySelector('code.mentio-message-inline-code')!).fontFamily);
    await expect(getComputedStyle(pre).whiteSpace).toBe('pre-wrap');
  },
};
// WCAG 1.4.10 regression: long code lines and names wrap inside a 320 px column.
export const LongLinesWrap: Story = {
  args: { ...LongContent.args },
  render: args => <div className="w-full max-w-(--viewport-small)"><Message {...args} /></div>,
  play: async ({ canvasElement }) => {
    const column = canvasElement.querySelector('.mentio-message')!.getBoundingClientRect();
    for (const element of canvasElement.querySelectorAll('pre, .mentio-message-text, .mentio-message-quote, .mentio-message-meta')) {
      await expect(element.getBoundingClientRect().right).toBeLessThanOrEqual(column.right);
    }
  },
};
