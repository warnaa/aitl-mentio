// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigation } from '../../lib/navigation';
import { AccountPanel } from './AccountPanel';

/*
 * The real AccountForm and CrudForm, submitting through the real apiCall; only `fetch`
 * and the hard-navigation seam are stubbed.
 */
const fetchMock = vi.fn<typeof fetch>();
let assign: ReturnType<typeof vi.spyOn>;

const answer = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
const sentBody = () => JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as Record<string, unknown>;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  assign = vi.spyOn(navigation, 'assign').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const props = { githubHref: '/api/auth/github?returnTo=%2Fmentor', switchHref: '/register?returnTo=%2Fmentor' };

async function signIn(user: ReturnType<typeof userEvent.setup>, password = 'correct horse battery') {
  await user.type(screen.getByLabelText(/Email address/), 'Grace@DevMentor.Test');
  await user.type(screen.getByLabelText(/^Password/), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('AccountPanel — sign-in', () => {
  it('offers GitHub first, then the email form', () => {
    render(<AccountPanel mode="sign-in" {...props} />);
    const github = screen.getByRole('button', { name: 'Continue with GitHub' });
    const email = screen.getByRole('group', { name: 'Sign in with email' });
    expect(github.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('posts the credentials with returnTo to /api/auth/login, then reloads onto redirectTo', async () => {
    const user = userEvent.setup();
    answer({ ok: true, data: { redirectTo: '/mentor' } });
    render(<AccountPanel mode="sign-in" returnTo="/mentor" {...props} />);

    await signIn(user);

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/mentor'));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/login');
    expect(sentBody()).toEqual({ email: 'grace@devmentor.test', password: 'correct horse battery', returnTo: '/mentor' });
  });

  it('sends no returnTo when the page has none', async () => {
    const user = userEvent.setup();
    answer({ ok: true, data: { redirectTo: '/home' } });
    render(<AccountPanel mode="sign-in" {...props} />);

    await signIn(user);

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/home'));
    expect(sentBody()).not.toHaveProperty('returnTo');
  });

  it('shows the generic refusal and stays on the page', async () => {
    const user = userEvent.setup();
    answer({ ok: false, error: { code: 'unauthorized', message: 'Email or password is incorrect.' } }, 401);
    render(<AccountPanel mode="sign-in" {...props} />);

    await signIn(user, 'wrong password');

    expect((await screen.findByRole('alert')).textContent).toBe('Email or password is incorrect.');
    expect(assign).not.toHaveBeenCalled();
  });

  it('goes to GitHub and to the registration page through full page loads', async () => {
    const user = userEvent.setup();
    render(<AccountPanel mode="sign-in" {...props} />);

    await user.click(screen.getByRole('button', { name: 'Continue with GitHub' }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(assign.mock.calls).toEqual([[props.githubHref], [props.switchHref]]);
  });
});

describe('AccountPanel — register', () => {
  it('posts the registration and replaces the form with "Check your inbox"', async () => {
    const user = userEvent.setup();
    answer({ ok: true, data: { email: 'grace@devmentor.test' } });
    render(<AccountPanel mode="register" returnTo="/mentor" {...props} switchHref="/sign-in?returnTo=%2Fmentor" />);

    await user.type(screen.getByLabelText(/Display name/), 'Grace Hopper');
    await user.type(screen.getByLabelText(/Email address/), 'grace@devmentor.test');
    await user.type(screen.getByLabelText(/^Password/), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Check your inbox')).toBeTruthy();
    expect(screen.getByText('We sent the link to grace@devmentor.test. It works for 24 hours.')).toBeTruthy();
    expect(screen.queryByRole('group', { name: /Create an account with email/ })).toBeNull();
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/register');
    expect(sentBody()).toEqual({
      displayName: 'Grace Hopper',
      email: 'grace@devmentor.test',
      password: 'correct horse battery',
      returnTo: '/mentor',
    });
    expect(assign).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(assign).toHaveBeenCalledWith('/sign-in?returnTo=%2Fmentor');
  });

  it('validates the password length in the browser before posting', async () => {
    const user = userEvent.setup();
    render(<AccountPanel mode="register" {...props} />);

    await user.type(screen.getByLabelText(/Display name/), 'Grace Hopper');
    await user.type(screen.getByLabelText(/Email address/), 'grace@devmentor.test');
    await user.type(screen.getByLabelText(/^Password/), 'too short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    // The description repeats this text, so assert the field's error state, not the text alone.
    await vi.waitFor(() => expect(screen.getByLabelText(/^Password/).getAttribute('aria-invalid')).toBe('true'));
    expect(screen.getAllByText('Use at least 12 characters.')).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a 409 with the route’s message', async () => {
    const user = userEvent.setup();
    answer({ ok: false, error: { code: 'conflict', message: 'This email address signs in with GitHub. Choose Continue with GitHub.' } }, 409);
    render(<AccountPanel mode="register" {...props} />);

    await user.type(screen.getByLabelText(/Display name/), 'Grace Hopper');
    await user.type(screen.getByLabelText(/Email address/), 'grace@devmentor.test');
    await user.type(screen.getByLabelText(/^Password/), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect((await screen.findByRole('alert')).textContent).toBe('This email address signs in with GitHub. Choose Continue with GitHub.');
  });

  it('renders a notice above the form', () => {
    render(<AccountPanel mode="register" {...props} notice={<p>Heads up</p>} />);
    expect(screen.getByText('Heads up')).toBeTruthy();
  });
});
