import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import { z } from 'zod';
import { CrudForm } from '@mentio/ui/backend/forms';
import { apiCall } from '@mentio/ui/backend/api';
import { Alert, AlertDescription, AlertTitle } from '@mentio/ui/components/alert';

// Accounts registration (`POST /api/auth/register`): name, email, password ≥ 10; `409 email_taken`,
// `429 too_many_attempts`. English story copy; the app's Polish copy comes from the accounts spec.
const schema = z.object({
  name: z.string({ error: 'Enter your name' }).trim().min(1, { message: 'Enter your name' }),
  email: z.email({ error: 'Enter an email address like alex@example.test' }),
  password: z.string({ error: 'Enter a password of at least 10 characters' }).min(10, { message: 'Use at least 10 characters' }),
});
const fields = [
  { name: 'name' as const, label: 'Full name', autoComplete: 'name' },
  { name: 'email' as const, label: 'Email address', type: 'email' as const, autoComplete: 'email', placeholder: 'alex@example.test' },
  { name: 'password' as const, label: 'Password', type: 'password' as const, autoComplete: 'new-password', description: 'At least 10 characters.' },
];
const respond = (status: number, body: JsonBodyType) => http.post('/api/auth/register', () => HttpResponse.json(body, { status }));

function Registration() {
  const [created, setCreated] = useState(false);
  return <div className="primitive-demo flex flex-col gap-between-groups">
    <h1 className="text-2xl font-semibold">Create an account</h1>
    {created
      ? <Alert role="status"><AlertTitle>Your account was created</AlertTitle><AlertDescription>You are signed in. We are taking you back to the page you came from.</AlertDescription></Alert>
      : <CrudForm schema={schema} fields={fields} submitLabel="Create account" onSubmit={values => apiCall('/api/auth/register', { method: 'POST', body: values })} onSuccess={() => setCreated(true)} />}
  </div>;
}

const meta = {
  title: 'Patterns/Form',
  parameters: { msw: { handlers: [respond(201, { ok: true, data: { id: 'u1' } })] } },
  render: () => <Registration />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

async function fillValid(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText('Full name'), 'Alex Kowalski');
  await userEvent.type(canvas.getByLabelText('Email address'), 'alex@example.test');
  await userEvent.type(canvas.getByLabelText('Password'), 'a-long-passphrase');
  await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));
  return canvas;
}

export const Empty: Story = {};
export const ValidationOnBlur: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Email address'), 'alex');
    await userEvent.tab();
    await expect(await canvas.findByText('Enter an email address like alex@example.test')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Password')).toHaveFocus();
  },
};
export const ValidationOnSubmit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Email address'), 'alex@example.test');
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(canvas.getByLabelText('Full name')).toHaveFocus());
    await expect(canvas.getByText('Enter your name')).toBeInTheDocument();
    await expect(canvas.getByText('Enter a password of at least 10 characters')).toBeInTheDocument();
    await expect(canvas.queryByText(/Invalid input/)).toBeNull();
    await expect(canvas.getByLabelText('Email address')).toHaveValue('alex@example.test');
  },
};
export const Pending: Story = {
  parameters: { msw: { handlers: [http.post('/api/auth/register', async () => { await delay('infinite'); return HttpResponse.json({}); })] } },
  play: async ({ canvasElement }) => {
    const canvas = await fillValid(canvasElement);
    const button = await canvas.findByRole('button', { name: 'Saving…' });
    await expect(button).toBeDisabled();
    await expect(canvas.queryByText('Your account was created')).toBeNull();
  },
};
export const Success: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await fillValid(canvasElement);
    await expect(await canvas.findByRole('status')).toHaveTextContent('Your account was created');
  },
};
export const FieldError: Story = {
  parameters: { msw: { handlers: [respond(409, { ok: false, error: { code: 'email_taken', message: 'Check the highlighted field.', fieldErrors: { email: ['This email address is already taken. If you created the account, sign in with your password.'] } } })] } },
  play: async ({ canvasElement }) => {
    const canvas = await fillValid(canvasElement);
    await expect(await canvas.findByText(/This email address is already taken/)).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByLabelText('Email address')).toHaveFocus());
    await expect(canvas.getByLabelText('Password')).toHaveValue('a-long-passphrase');
  },
};
export const ServerError: Story = {
  parameters: { msw: { handlers: [respond(500, { ok: false, error: { code: 'internal_error', message: 'Something went wrong on our side. Try again in a moment.' } })] } },
  play: async ({ canvasElement }) => {
    const canvas = await fillValid(canvasElement);
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('Something went wrong on our side. Try again in a moment.');
    await waitFor(() => expect(alert).toHaveFocus());
    await expect(canvas.getByRole('button', { name: 'Create account' })).toBeEnabled();
  },
};
export const TooManyAttempts: Story = {
  parameters: { msw: { handlers: [respond(429, { ok: false, error: { code: 'too_many_attempts', message: 'Too many attempts. Wait a few minutes, then try again.' } })] } },
  play: async ({ canvasElement }) => {
    const canvas = await fillValid(canvasElement);
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Too many attempts');
  },
};
export const NetworkError: Story = {
  parameters: { msw: { handlers: [http.post('/api/auth/register', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => {
    const canvas = await fillValid(canvasElement);
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('Check your connection, then try again.');
    await expect(canvas.getByLabelText('Full name')).toHaveValue('Alex Kowalski');
  },
};
export const Narrow: Story = { ...FieldError, globals: { viewport: { value: 'mobile1', isRotated: false } } };
