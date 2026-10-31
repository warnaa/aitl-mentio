import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { ActionButton } from '@mentio/ui/backend/actions';
import { apiCall } from '@mentio/ui/backend/api';

// F5 consumers: publish/unpublish (`POST /api/mentors/me/page/publish`), remove slot. English story copy.
const publish = () => apiCall('/api/mentors/me/page/publish', { method: 'POST' });
const published = http.post('/api/mentors/me/page/publish', () => HttpResponse.json({ ok: true, data: { status: 'published' } }));

const meta = {
  title: 'Primitives/ActionButton',
  component: ActionButton,
  parameters: { msw: { handlers: [published] } },
  args: { label: 'Publish page', pendingLabel: 'Publishing…', run: publish, onSuccess: fn(), onError: fn() },
  argTypes: { run: { control: false }, confirm: { control: false }, variant: { control: 'select', options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] }, disabled: { control: 'boolean' }, disabledReason: { control: 'text' } },
  render: args => <div className="primitive-demo"><ActionButton {...args} /></div>,
} satisfies Meta<typeof ActionButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const WithConfirmation: Story = {
  parameters: { msw: { handlers: [http.delete('/api/availability/slots/s1', () => HttpResponse.json({ ok: true, data: null }))] } },
  args: {
    label: 'Remove slot', pendingLabel: 'Removing slot…', variant: 'destructive',
    run: () => apiCall('/api/availability/slots/s1', { method: 'DELETE' }),
    confirm: { title: 'Remove the slot on Thursday, 6 November 2026 at 18:00?', description: 'Mentees will no longer see this time on your page.', confirmLabel: 'Remove slot', cancelLabel: 'Keep slot' },
  },
};
export const DisabledWithReason: Story = { args: { disabled: true, disabledReason: 'Save your changes before publishing.' } };
export const States: Story = {
  render: args => <div className="primitive-demo flex flex-col gap-between-groups">
    <p>Default and disabled-with-reason are shown here. Pending, failed and confirmed states are reached by interaction in their own stories. Hover, focus and pressed come from Button.</p>
    <ActionButton {...args} />
    <ActionButton {...args} disabled disabledReason="Save your changes before publishing." />
  </div>,
};
export const PendingKeepsFocus: Story = {
  parameters: { msw: { handlers: [http.post('/api/mentors/me/page/publish', async () => { await delay('infinite'); return HttpResponse.json({ ok: true, data: null }); })] } },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Publish page' });
    await userEvent.click(button);
    await expect(button).toHaveTextContent('Publishing…');
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button).toHaveFocus();
    await userEvent.click(button);
    await expect(args.onSuccess).not.toHaveBeenCalled();
  },
};
export const FailureInline: Story = {
  parameters: { msw: { handlers: [http.post('/api/mentors/me/page/publish', () => HttpResponse.json({ ok: false, error: { code: 'validation_error', message: 'Add a public-work link before publishing.', fieldErrors: { publicWorkLinks: ['Add at least one link'] } } }, { status: 400 }))] } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Publish page' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Add a public-work link before publishing.');
    await expect(args.onError).toHaveBeenCalledTimes(1);
    await expect(args.onSuccess).not.toHaveBeenCalled();
  },
};
export const NetworkFailure: Story = {
  parameters: { msw: { handlers: [http.post('/api/mentors/me/page/publish', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Publish page' }));
    await expect(await within(canvasElement).findByRole('alert')).toBeInTheDocument();
  },
};
export const ConfirmKeyboard: Story = {
  ...WithConfirmation,
  play: async ({ args }) => {
    const body = within(document.body);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    const dialog = await body.findByRole('alertdialog', { name: /Remove the slot/ });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Keep slot' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull());
    await userEvent.keyboard('{Enter}');
    await userEvent.click(within(await body.findByRole('alertdialog')).getByRole('button', { name: 'Remove slot' }));
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull());
  },
};
export const LongContent: Story = { args: { label: 'Publish the mentor page with the updated public-work links' } };
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
// WCAG 1.4.10 regression: the label wraps inside a 320 px column instead of widening the page.
export const LongLabelWraps: Story = {
  ...LongContent,
  render: args => <div className="w-full max-w-(--viewport-small)"><ActionButton {...args} /></div>,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    const column = canvasElement.firstElementChild!.getBoundingClientRect();
    await expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(column.right);
    await expect(button.getBoundingClientRect().height).toBeGreaterThan(36);
  },
};
