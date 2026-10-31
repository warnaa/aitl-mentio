import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import { z } from 'zod';
import { AccountNav } from '@mentio/ui/components/auth/AccountNav';
import { AuthPanel } from '@mentio/ui/components/auth/AuthPanel';
import { ActionButton, Link } from '@mentio/ui/backend/actions';
import { CrudForm } from '@mentio/ui/backend/forms';
import { apiCall } from '@mentio/ui/backend/api';
import { Alert, AlertDescription, AlertTitle } from '@mentio/ui/components/alert';

// Accounts UI/UX screens (`/logowanie`, `/rejestracja`, `?jako=mentor`, `/zostan-mentorem`) and the
// API contract (`401 invalid_credentials`, `409 email_taken`, `429 too_many_attempts`). English story
// copy; a success message stands in for the redirect to the validated `returnTo`.
const returnTo = '%2Fmentorzy%2Falex';
const nav = <AccountNav brand={{ href: '#/', label: 'Mentio' }} navLabel="Account" signedIn={false} signIn={{ href: `#/logowanie?returnTo=${returnTo}`, label: 'Sign in' }} signUp={{ href: `#/rejestracja?returnTo=${returnTo}`, label: 'Create account' }} />;
const bytes = (value: string) => new TextEncoder().encode(value).length;

const loginSchema = z.object({
  email: z.email({ error: 'Enter your email address' }),
  password: z.string({ error: 'Enter your password' }).min(1, { message: 'Enter your password' }).refine(value => bytes(value) <= 72, { message: 'The password is too long' }),
});
const registerSchema = z.object({
  name: z.string({ error: 'Enter your name' }).trim().min(1, { message: 'Enter your name' }).max(80, { message: 'Use at most 80 characters' }),
  email: z.email({ error: 'Enter an email address like alex@example.test' }),
  password: z.string({ error: 'Enter a password of at least 10 characters' }).refine(value => Array.from(value).length >= 10, { message: 'Use at least 10 characters' }).refine(value => bytes(value) <= 72, { message: 'The password is longer than 72 bytes; Polish letters take 2 bytes each' }),
});
const passwordHelp = 'At least 10 characters, at most 72 bytes in UTF-8. Polish letters can take 2 bytes, other characters more.';

function Screen({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-background text-foreground">{nav}{children}</div>;
}

function SignIn() {
  const [done, setDone] = useState(false);
  return <Screen><AuthPanel title="Sign in" footer={<Link href={`#/rejestracja?returnTo=${returnTo}`}>No account? Create one</Link>}>
    {done ? <Alert role="status"><AlertTitle>You are signed in</AlertTitle><AlertDescription>Taking you back to the page you came from.</AlertDescription></Alert>
      : <CrudForm schema={loginSchema} submitLabel="Sign in" onSuccess={() => setDone(true)}
          fields={[{ name: 'email', label: 'Email address', type: 'email', autoComplete: 'username' }, { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' }]}
          onSubmit={values => apiCall('/api/auth/login', { method: 'POST', body: values })} />}
  </AuthPanel></Screen>;
}

function Registration({ asMentor = false }: { asMentor?: boolean }) {
  const [done, setDone] = useState(false);
  const [taken, setTaken] = useState(false);
  return <Screen><AuthPanel title={asMentor ? 'Create a mentor account' : 'Create an account'}
    footer={<>{taken && <p>If the account was already created, sign in with the password you set.</p>}<Link href={`#/logowanie?returnTo=${returnTo}`}>Already have an account? Sign in</Link></>}>
    {done ? <Alert role="status"><AlertTitle>Your account was created</AlertTitle><AlertDescription>Taking you back to the page you came from.</AlertDescription></Alert>
      : <CrudForm schema={registerSchema} submitLabel={asMentor ? 'Create mentor account' : 'Create account'} onSuccess={() => setDone(true)}
          fields={[{ name: 'name', label: 'Full name', autoComplete: 'name' }, { name: 'email', label: 'Email address', type: 'email', autoComplete: 'email' }, { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', description: passwordHelp }]}
          onSubmit={async values => {
            const result = await apiCall('/api/auth/register', { method: 'POST', body: { ...values, asMentor: asMentor || undefined } });
            setTaken(!result.ok && result.error.code === 'email_taken');
            return result;
          }} />}
  </AuthPanel></Screen>;
}

function BecomeMentor() {
  const [done, setDone] = useState(false);
  return <Screen><AuthPanel title="Become a mentor" description="Publish a page with your public work and the times you can take text sessions." footer={<Link href="#/">Back to Mentio</Link>}>
    {done ? <Alert role="status"><AlertTitle>You are now a mentor</AlertTitle><AlertDescription>Taking you to your mentor page.</AlertDescription></Alert>
      : <ActionButton label="Become a mentor" pendingLabel="Saving…" run={() => apiCall('/api/auth/mentor', { method: 'POST' })} onSuccess={() => setDone(true)} />}
  </AuthPanel></Screen>;
}

const respond = (path: string, status: number, body: JsonBodyType) => http.post(path, () => HttpResponse.json(body, { status }));
const account = { ok: true, data: { id: 'u1', email: 'alex@example.test', name: 'Alex Kowalski', roles: ['mentee'] } };

const meta = {
  title: 'Product/Platform and accounts/Screens',
  parameters: { layout: 'fullscreen', msw: { handlers: [respond('/api/auth/login', 200, account), respond('/api/auth/register', 201, account), respond('/api/auth/mentor', 200, account)] } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

async function signIn(canvasElement: HTMLElement, password = 'a-long-passphrase') {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText('Email address'), 'alex@example.test');
  await userEvent.type(canvas.getByLabelText('Password'), password);
  await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
  return canvas;
}
async function register(canvasElement: HTMLElement, submit = 'Create account') {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText('Full name'), 'Alex Kowalski');
  await userEvent.type(canvas.getByLabelText('Email address'), 'alex@example.test');
  await userEvent.type(canvas.getByLabelText('Password'), 'zażółć-gęślą');
  await userEvent.click(canvas.getByRole('button', { name: submit }));
  return canvas;
}

export const SignInForm: Story = { name: 'Sign in — form', render: () => <SignIn /> };
export const SignInInvalidCredentials: Story = {
  name: 'Sign in — invalid credentials', render: () => <SignIn />,
  parameters: { msw: { handlers: [respond('/api/auth/login', 401, { ok: false, error: { code: 'invalid_credentials', message: 'The email address or password is incorrect.' } })] } },
  play: async ({ canvasElement }) => {
    const canvas = await signIn(canvasElement);
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent('The email address or password is incorrect.');
    await waitFor(() => expect(alert).toHaveFocus());
    await expect(canvas.getByLabelText('Email address')).toHaveValue('alex@example.test');
  },
};
export const SignInTooManyAttempts: Story = {
  name: 'Sign in — too many attempts', render: () => <SignIn />,
  parameters: { msw: { handlers: [respond('/api/auth/login', 429, { ok: false, error: { code: 'too_many_attempts', message: 'Too many attempts. Try again in 15 minutes.' } })] } },
  play: async ({ canvasElement }) => { await expect(await (await signIn(canvasElement)).findByRole('alert')).toHaveTextContent('Try again in 15 minutes'); },
};
export const SignInNetworkError: Story = {
  name: 'Sign in — network error', render: () => <SignIn />,
  parameters: { msw: { handlers: [http.post('/api/auth/login', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => { await expect(await (await signIn(canvasElement)).findByRole('alert')).toHaveTextContent('Check your connection, then try again.'); },
};
export const SignInPending: Story = {
  name: 'Sign in — pending', render: () => <SignIn />,
  parameters: { msw: { handlers: [http.post('/api/auth/login', async () => { await delay('infinite'); return HttpResponse.json({}); })] } },
  play: async ({ canvasElement }) => { await expect(await (await signIn(canvasElement)).findByRole('button', { name: 'Saving…' })).toBeDisabled(); },
};
export const SignInSuccess: Story = {
  name: 'Sign in — success (stands in for redirect)', render: () => <SignIn />,
  play: async ({ canvasElement }) => { await expect(await (await signIn(canvasElement)).findByRole('status')).toHaveTextContent('You are signed in'); },
};
export const RegistrationForm: Story = { name: 'Registration — form', render: () => <Registration /> };
export const RegistrationEmailTaken: Story = {
  name: 'Registration — email taken (or lost response)', render: () => <Registration />,
  parameters: { msw: { handlers: [respond('/api/auth/register', 409, { ok: false, error: { code: 'email_taken', message: 'Check the highlighted field.', fieldErrors: { email: ['This email address is already taken'] } } })] } },
  play: async ({ canvasElement }) => {
    const canvas = await register(canvasElement);
    await expect(await canvas.findByText('This email address is already taken')).toBeInTheDocument();
    await expect(canvas.getByText('If the account was already created, sign in with the password you set.')).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: 'Already have an account? Sign in' })).toHaveAttribute('href', `#/logowanie?returnTo=${returnTo}`);
    await waitFor(() => expect(canvas.getByLabelText('Email address')).toHaveFocus());
  },
};
export const RegistrationPasswordTooLong: Story = {
  name: 'Registration — password over 72 bytes', render: () => <Registration />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Password'), 'ż'.repeat(40));
    await userEvent.tab();
    await expect(await canvas.findByText(/longer than 72 bytes/)).toBeInTheDocument();
  },
};
export const RegistrationTooManyAttempts: Story = {
  name: 'Registration — too many attempts', render: () => <Registration />,
  parameters: { msw: { handlers: [respond('/api/auth/register', 429, { ok: false, error: { code: 'too_many_attempts', message: 'Too many attempts. Try again in 60 minutes.' } })] } },
  play: async ({ canvasElement }) => { await expect(await (await register(canvasElement)).findByRole('alert')).toHaveTextContent('Try again in 60 minutes'); },
};
export const RegistrationNetworkError: Story = {
  name: 'Registration — network error', render: () => <Registration />,
  parameters: { msw: { handlers: [http.post('/api/auth/register', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => {
    const canvas = await register(canvasElement);
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Check your connection, then try again.');
    await expect(canvas.getByRole('link', { name: 'Already have an account? Sign in' })).toBeInTheDocument();
  },
};
export const MentorRegistration: Story = {
  name: 'Mentor registration — success', render: () => <Registration asMentor />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'Create a mentor account' })).toBeInTheDocument();
    await register(canvasElement, 'Create mentor account');
    await expect(await canvas.findByRole('status')).toHaveTextContent('Your account was created');
  },
};
export const BecomeMentorScreen: Story = { name: 'Become a mentor — action', render: () => <BecomeMentor /> };
export const BecomeMentorFailed: Story = {
  name: 'Become a mentor — failed', render: () => <BecomeMentor />,
  parameters: { msw: { handlers: [http.post('/api/auth/mentor', () => HttpResponse.error())] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Become a mentor' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Check your connection, then try again.');
  },
};
export const BecomeMentorSuccess: Story = {
  name: 'Become a mentor — success', render: () => <BecomeMentor />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Become a mentor' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('You are now a mentor');
  },
};
export const NarrowRegistration: Story = { ...RegistrationEmailTaken, name: 'Registration — narrow, email taken', globals: { viewport: { value: 'mobile1', isRotated: false } } };
