import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LogOut } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { WorkflowAction, type WorkflowActionProps } from './WorkflowAction';

const endpoint = (scenario: string) => `/storybook-api/workflow/${scenario}`;
// A unique URL per scenario keeps several Docs canvases independent.
const handlers = [
  http.post(endpoint('pending'), async () => { await delay(2500); return HttpResponse.json({ ok: true, data: null }); }),
  http.post(endpoint('refused'), () => HttpResponse.json({ ok: false, error: { code: 'conflict', message: 'This note was already approved by another operator. Reload the page to see its current state.' } }, { status: 409 })),
  http.post(endpoint('network'), () => HttpResponse.error()),
  http.post('/storybook-api/workflow/:scenario', () => HttpResponse.json({ ok: true, data: null })),
];

function ActionExample(args: WorkflowActionProps) {
  const [done, setDone] = useState(false);
  return <div className="w-full max-w-md space-y-4">
    <WorkflowAction {...args} onSuccess={data => { setDone(true); return args.onSuccess?.(data); }} />
    {done && <p className="text-sm" role="status">Done. The page would now reload or refresh its data.</p>}
  </div>;
}

const meta = {
  title: 'Backend/Actions/WorkflowAction', component: WorkflowAction, tags: ['autodocs'],
  render: (args: WorkflowActionProps) => <ActionExample {...args} />,
  args: { endpoint: endpoint('success'), label: 'Approve note', pendingLabel: 'Approving…', onSuccess: fn() },
  parameters: {
    msw: { handlers },
    controls: { exclude: ['endpoint', 'body', 'onSuccess'] },
    docs: { description: { component: 'A button that changes server state: sign out, approve, cancel, pay. It sends one request, disables itself with a pending label until the server answers, shows a refusal next to the button and calls onSuccess only after a confirmed result. The host decides what happens next, such as a full page reload after sign-out. Stories use local mock responses.' } },
  },
} satisfies Meta<WorkflowActionProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SignOut: Story = {
  args: { endpoint: endpoint('signout'), label: 'Sign out', pendingLabel: 'Signing out…', intent: 'neutral', appearance: 'stroke', size: 'sm', leadingIcon: <LogOut /> },
};
export const Pending: Story = {
  args: { endpoint: endpoint('pending') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Approve note' }));
    await expect(canvas.getByRole('button', { name: 'Approving…' })).toBeDisabled();
  },
};
export const Success: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Approve note' }));
    await expect(await canvas.findByRole('status')).toBeVisible();
    await expect(args.onSuccess).toHaveBeenCalled();
  },
};
export const Refused: Story = {
  args: { endpoint: endpoint('refused') },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Approve note' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('already approved by another operator');
    await expect(args.onSuccess).not.toHaveBeenCalled();
  },
};
export const NetworkError: Story = {
  args: { endpoint: endpoint('network') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Approve note' }));
    await expect(await canvas.findByText(/failed to fetch|network.*(?:error|failed)|load failed/i)).toBeVisible();
  },
};
export const Disabled: Story = { args: { disabled: true } };
