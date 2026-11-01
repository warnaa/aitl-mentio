import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { CrudForm } from '@mentio/ui/backend/forms';
import { apiCall } from '@mentio/ui/backend/api';

// Field contracts: accounts registration, mentor-pages editor/rate/listing/slots and
// book-and-pay new booking (F4 kinds). Messages are English story copy (decision: copy via props).
const registration = z.object({
  name: z.string({ error: 'Enter your name' }).trim().min(1, { message: 'Enter your name' }),
  email: z.email({ error: 'Enter an email address like alex@example.test' }),
  password: z.string({ error: 'Enter a password of at least 10 characters' }).min(10, { message: 'Use at least 10 characters' }),
});
const registrationFields = [
  { name: 'name' as const, label: 'Full name', autoComplete: 'name' },
  { name: 'email' as const, label: 'Email address', type: 'email' as const, autoComplete: 'email' },
  { name: 'password' as const, label: 'Password', type: 'password' as const, autoComplete: 'new-password', description: 'At least 10 characters.' },
];
const register = (values: z.output<typeof registration>) => apiCall('/api/auth/register', { method: 'POST', body: values });
const created = http.post('/api/auth/register', () => HttpResponse.json({ ok: true, data: { id: 'u1' } }, { status: 201 }));

const meta = {
  title: 'Primitives/CrudForm',
  component: CrudForm,
  parameters: { msw: { handlers: [created] } },
  args: { schema: registration, fields: registrationFields, submitLabel: 'Create account', onSubmit: values => register(values as z.output<typeof registration>), onSuccess: fn() },
  argTypes: { schema: { control: false }, fields: { control: false }, onSubmit: { control: false }, submitLabel: { control: 'text' } },
  render: args => <div className="primitive-demo"><CrudForm {...args} /></div>,
} satisfies Meta<typeof CrudForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const editor = z.object({
  slug: z.string({ error: 'Enter a page address' }).regex(/^[a-z0-9-]{3,60}$/, { message: 'Use 3–60 lowercase letters, digits or hyphens' }),
  displayName: z.string({ error: 'Enter the name mentees will see' }).trim().min(1, { message: 'Enter the name mentees will see' }),
  description: z.string().trim().min(50, { message: 'Write at least 50 characters' }).optional(),
  publicWorkLinks: z.array(z.string()).transform(rows => rows.filter(Boolean)).pipe(z.array(z.url({ message: 'Enter a full address starting with https://' })).max(5)),
});
const editorArgs = {
    schema: editor,
    submitLabel: 'Save draft',
    fields: [
      { name: 'slug', label: 'Page address', description: 'mentio.example/mentorzy/alex — changing it breaks the old link.' },
      { name: 'displayName', label: 'Display name' },
      { name: 'description', label: 'Description', type: 'textarea', description: 'What you can help with and how you work.' },
      { name: 'publicWorkLinks', label: 'Public work', type: 'urlList', max: 5, description: 'Up to 5 links to repositories, talks or articles.' },
    ],
    initialValues: { slug: 'alex', displayName: 'Alex', publicWorkLinks: ['https://example.test/alex/ingress-upgrade-notes'] },
    onSubmit: fn(async () => ({ ok: true as const, data: null, status: 200 })),
} satisfies Story['args'];
export const MentorPageEditor: Story = { args: editorArgs };
const rate = z.object({ ratePln: z.coerce.number({ message: 'Enter a whole amount' }).int({ message: 'Enter a whole amount' }).min(90, { message: 'The lowest rate is 90 zł' }).max(600, { message: 'The highest rate is 600 zł' }) });
export const Money: Story = {
  args: { schema: rate, submitLabel: 'Save rate', fields: [{ name: 'ratePln', label: 'Rate per 25 minutes', type: 'money', description: '50 minutes costs twice the rate.' }], initialValues: { ratePln: 120 }, onSubmit: fn(async () => ({ ok: true as const, data: null, status: 200 })) },
};
const listing = z.object({ isListed: z.boolean() });
export const Checkbox: Story = {
  args: { schema: listing, submitLabel: 'Save listing', fields: [{ name: 'isListed', label: 'Show me in the mentor list', type: 'checkbox', description: 'Your page stays reachable through its share link either way.' }], onSubmit: fn(async () => ({ ok: true as const, data: null, status: 200 })) },
};
const slot = z.object({ startsAt: z.string({ message: 'Choose a date and time' }).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { message: 'Choose a date and time' }) });
export const DateTime: Story = {
  args: { schema: slot, submitLabel: 'Add slot', fields: [{ name: 'startsAt', label: 'Session start, Warsaw time', type: 'datetime', description: 'Slots are at least one hour apart; each one reserves 50 minutes.' }], onSubmit: fn(async () => ({ ok: true as const, data: null, status: 201 })) },
};
const booking = z.object({
  lengthMinutes: z.enum(['25', '50'], { message: 'Choose 25 or 50 minutes' }),
  question: z.string({ error: 'Write your question' }).trim().min(20, { message: 'Write at least 20 characters' }).max(5000, { message: 'Keep the question under 5,000 characters' }),
});
export const SelectAndTextarea: Story = {
  args: {
    schema: booking,
    submitLabel: 'Continue to payment',
    fields: [
      { name: 'lengthMinutes', label: 'Session length', type: 'select', placeholder: 'Select a length', options: [{ value: '25', label: '25 minutes — 120 zł' }, { value: '50', label: '50 minutes — 240 zł' }] },
      { name: 'question', label: 'Your question', type: 'textarea', description: 'Paste error messages and code directly; the mentor reads them before the session.' },
    ],
    onSubmit: fn(async () => ({ ok: true as const, data: null, status: 201 })),
  },
};
export const ExternalErrors: Story = {
  args: { ...editorArgs, externalFieldErrors: { publicWorkLinks: ['Add at least one public-work link before publishing'] } },
};
export const States: Story = {
  ...MentorPageEditor,
  render: args => <div className="primitive-demo flex flex-col gap-between-groups">
    <p>The form’s states are reached by interaction, so each one is its own story with a play function: Blur validation, Focus first error, Pending and duplicate guard, Server field error. API outcomes live on the Form pattern page. Disabled fields during saving keep their values.</p>
    <CrudForm {...args} />
  </div>,
};
export const BlurValidation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText('Email address'));
    await userEvent.type(canvas.getByLabelText('Email address'), 'alex@');
    await userEvent.tab();
    const error = await canvas.findByText('Enter an email address like alex@example.test');
    await expect(canvas.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByLabelText('Email address').getAttribute('aria-describedby')).toContain(error.id);
    await userEvent.type(canvas.getByLabelText('Email address'), 'example.test');
    await waitFor(() => expect(canvas.queryByText('Enter an email address like alex@example.test')).toBeNull());
  },
};
export const FocusFirstError: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Password'), 'short');
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(canvas.getByLabelText('Full name')).toHaveFocus());
    await expect(canvas.getByText('Use at least 10 characters')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Password')).toHaveValue('short');
    await expect(args.onSuccess).not.toHaveBeenCalled();
  },
};
let requests = 0;
export const PendingAndDuplicateGuard: Story = {
  parameters: { msw: { handlers: [http.post('/api/auth/register', async () => { requests += 1; await new Promise(resolve => setTimeout(resolve, 400)); return HttpResponse.json({ ok: true, data: { id: 'u1' } }, { status: 201 }); })] } },
  play: async ({ canvasElement, args }) => {
    requests = 0;
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Full name'), 'Alex Kowalski');
    await userEvent.type(canvas.getByLabelText('Email address'), 'alex@example.test');
    await userEvent.type(canvas.getByLabelText('Password'), 'a-long-passphrase');
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));
    const saving = await canvas.findByRole('button', { name: 'Saving…' });
    await expect(saving).toBeDisabled();
    await expect(saving).toHaveAttribute('aria-busy', 'true');
    await expect(canvas.getByLabelText('Email address')).toBeDisabled();
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalledWith({ id: 'u1' }));
    await expect(requests).toBe(1);
  },
};
export const ServerFieldError: Story = {
  parameters: { msw: { handlers: [http.post('/api/auth/register', () => HttpResponse.json({ ok: false, error: { code: 'email_taken', message: 'Check the highlighted field.', fieldErrors: { email: ['This email address is already taken'] } } }, { status: 409 }))] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Full name'), 'Alex Kowalski');
    await userEvent.type(canvas.getByLabelText('Email address'), 'alex@example.test');
    await userEvent.type(canvas.getByLabelText('Password'), 'a-long-passphrase');
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));
    await expect(await canvas.findByText('This email address is already taken')).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByLabelText('Email address')).toHaveFocus());
    await expect(canvas.getByRole('alert')).toHaveTextContent('Check the highlighted field.');
    await expect(canvas.getByLabelText('Password')).toHaveValue('a-long-passphrase');
  },
};
export const UrlListKeyboard: Story = {
  ...MentorPageEditor,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Add link' }));
    const second = canvas.getByRole('textbox', { name: 'Link 2' });
    await waitFor(() => expect(second).toHaveFocus());
    await userEvent.type(second, 'not a link');
    await userEvent.click(canvas.getByRole('button', { name: 'Save draft' }));
    await expect(await canvas.findByText(/Enter a full address starting with https:\/\//)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Remove link 2' }));
    await waitFor(() => expect(canvas.getByRole('textbox', { name: 'Link 1' })).toHaveFocus());
  },
};
export const LongContent: Story = {
  args: {
    ...SelectAndTextarea.args,
    fields: [
      { name: 'lengthMinutes', label: 'How long a text session do you need for this question about the Kubernetes ingress?', type: 'select', placeholder: 'Select a length', options: [{ value: '25', label: '25 minutes — 120 zł, enough for one focused error message' }, { value: '50', label: '50 minutes — 240 zł, time to read the pasted configuration and logs' }] },
      { name: 'question', label: 'Your question, including what you expected, what happened and what you already checked', type: 'textarea', description: 'Paste error messages and code directly; the mentor reads them before the session. Remove passwords and tokens first.' },
    ],
  },
};
export const Narrow: Story = { ...LongContent, globals: { viewport: { value: 'mobile1', isRotated: false } } };
