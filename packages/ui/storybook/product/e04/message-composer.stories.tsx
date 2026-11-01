import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { MessageComposer } from '@mentio/ui/components/messages/MessageComposer';
import { NETWORK_ERROR_MESSAGE, type ApiResult } from '@mentio/ui/backend/api';

// Preliminary (E04 contract missing). The message appears in the conversation only after the server
// confirms it, as in every form (task form rules); the field keeps the text on failure.
const sent = async (): Promise<ApiResult<unknown>> => ({ ok: true, data: { id: 'message-5' }, status: 201 });
const meta = {
  title: 'Product/E04 — The text session/MessageComposer',
  component: MessageComposer,
  args: {
    label: 'Your message', description: 'Put code between lines of three backticks (```). Enter adds a line; Ctrl+Enter sends.',
    sendLabel: 'Send', pendingLabel: 'Sending…', emptyError: 'Write a message first', onSend: fn(sent), onSent: fn(),
  },
  argTypes: { replyTo: { control: false }, onSend: { control: false } },
  render: args => <div className="primitive-demo"><MessageComposer {...args} /></div>,
} satisfies Meta<typeof MessageComposer>;
export default meta;
type Story = StoryObj<typeof meta>;

const reply = { id: 'message-2', heading: 'Replying to Alex', excerpt: 'Can you paste the output of these two?', cancelLabel: 'Cancel reply', onCancel: fn() };

export const Playground: Story = {};
export const Replying: Story = { args: { replyTo: reply } };
export const States: Story = {
  render: args => <div className="primitive-demo flex flex-col gap-section">
    <p>Pending, failed and empty states come from sending; each is an interaction story below. The text field and button have their own state matrices on the Textarea and Button pages.</p>
    <MessageComposer {...args} />
    <MessageComposer {...args} replyTo={reply} />
  </div>,
};
export const LongContent: Story = { args: { label: 'Your message to Aleksandra Wiśniewska-Kowalczyk about the ingress upgrade', replyTo: { ...reply, heading: 'Replying to Aleksandra Wiśniewska-Kowalczyk', excerpt: 'Can you paste the output of kubectl -n shop get endpoints api -o wide and the pod labels, so we can compare them with the selector in values.production.yaml?' } } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };

export const SendsAndClears: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByLabelText(/Your message/);
    await userEvent.type(field, 'Endpoints are back. Thank you!');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(field).toHaveValue(''));
    await expect(args.onSend).toHaveBeenCalledWith('Endpoints are back. Thank you!');
    await expect(args.onSent).toHaveBeenCalledWith({ id: 'message-5' });
    await expect(field).toHaveFocus();
  },
};
export const CtrlEnterSends: Story = {
  play: async ({ args, canvasElement }) => {
    const field = within(canvasElement).getByLabelText(/Your message/);
    await userEvent.type(field, 'line one{Enter}line two');
    await expect(args.onSend).not.toHaveBeenCalled();
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await expect(args.onSend).toHaveBeenCalledWith('line one\nline two');
  },
};
export const EmptyMessage: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('Write a message first');
    await expect(canvas.getByLabelText(/Your message/)).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByLabelText(/Your message/)).toHaveFocus();
    await expect(args.onSend).not.toHaveBeenCalled();
  },
};
export const Pending: Story = {
  args: { onSend: fn((): Promise<ApiResult<unknown>> => new Promise(() => {})) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Your message/), 'Does the readiness probe matter here?');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    const button = await canvas.findByRole('button', { name: 'Sending…' });
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);
    await expect(args.onSend).toHaveBeenCalledTimes(1);
  },
};
export const SendFailed: Story = {
  args: { onSend: fn(async (): Promise<ApiResult<unknown>> => ({ ok: false, error: { code: 'network_error', message: NETWORK_ERROR_MESSAGE }, status: 0 })) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Your message/), 'kubectl rollout restart deploy/api');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(NETWORK_ERROR_MESSAGE);
    await expect(canvas.getByLabelText(/Your message/)).toHaveValue('kubectl rollout restart deploy/api');
    await expect(canvas.getByLabelText(/Your message/)).not.toHaveAttribute('aria-invalid');
  },
};
export const CancelReply: Story = {
  args: { replyTo: reply },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/Your message/)).toHaveAccessibleDescription(/^Replying to Alex\./);
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel reply' }));
    await expect(args.replyTo!.onCancel).toHaveBeenCalledOnce();
    await expect(canvas.getByLabelText(/Your message/)).toHaveFocus();
  },
};
