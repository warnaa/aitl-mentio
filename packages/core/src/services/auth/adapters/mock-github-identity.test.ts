import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableError } from '../../../http/errors';
import {
  MOCK_CODE_PREFIX,
  MOCK_DEFAULT_LOGIN,
  MOCK_TOKEN_PREFIX,
  MockGithubIdentityAdapter,
} from './mock-github-identity';

const env = { APP_URL: 'http://127.0.0.1:41234', INTEGRATION_TEST_RUN: true };
const fetchMock = vi.fn<typeof fetch>();

function adapter() {
  return new MockGithubIdentityAdapter({ env });
}

/** Run the whole flow the routes run: authorize URL → callback code → token → identity. */
async function signIn(login?: string) {
  const mock = adapter();
  const url = new URL(mock.authorizeUrl({ state: 'signed-state', login }));
  const token = await mock.exchangeCode(url.searchParams.get('code')!);
  return mock.fetchIdentity(token);
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('MockGithubIdentityAdapter', () => {
  it('refuses to exist outside an integration run', () => {
    expect(
      () => new MockGithubIdentityAdapter({ env: { ...env, INTEGRATION_TEST_RUN: false } }),
    ).toThrow(/refused unless INTEGRATION_TEST_RUN=1/);
  });

  it('sends the browser straight to our own callback with the state and a persona code', () => {
    const url = new URL(adapter().authorizeUrl({ state: 'signed-state', login: 'mock-mentor' }));

    expect(`${url.origin}${url.pathname}`).toBe('http://127.0.0.1:41234/api/auth/github/callback');
    expect(url.searchParams.get('state')).toBe('signed-state');
    expect(url.searchParams.get('code')).toBe(`${MOCK_CODE_PREFIX}mock-mentor`);
  });

  it.each([undefined, ''])('uses the default persona for a %j hint', async (login) => {
    const url = new URL(adapter().authorizeUrl({ state: 's', login }));

    expect(url.searchParams.get('code')).toBe(`${MOCK_CODE_PREFIX}${MOCK_DEFAULT_LOGIN}`);
    await expect(signIn(login)).resolves.toMatchObject({
      login: 'mock-mentee',
      email: 'mock-mentee@devmentor.test',
    });
  });

  it('derives the whole identity from the login hint', async () => {
    const identity = await signIn('mock-operator');

    expect(identity).toEqual({
      githubId: expect.stringMatching(/^\d+$/),
      login: 'mock-operator',
      displayName: 'mock-operator',
      avatarUrl: null,
      email: 'mock-operator@devmentor.test',
    });
  });

  it('yields the same identity for the same login, every time', async () => {
    const first = await signIn('mock-mentor');
    const second = await signIn('mock-mentor');

    expect(second).toEqual(first);
  });

  it('yields two different, stable identities for two logins', async () => {
    const mentor = await signIn('mock-mentor');
    const mentee = await signIn('mock-mentee');

    expect(mentor.githubId).not.toBe(mentee.githubId);
    expect(mentor.email).not.toBe(mentee.email);
  });

  it('treats logins case-insensitively, as GitHub does', async () => {
    await expect(signIn('Mock-Mentor')).resolves.toEqual(await signIn('mock-mentor'));
  });

  it('never touches the network', async () => {
    await signIn('mock-mentor');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['', 'gho_real-code', `${MOCK_CODE_PREFIX}`, `${MOCK_CODE_PREFIX}not a login`, `${MOCK_CODE_PREFIX}${'a'.repeat(40)}`])(
    'refuses the unrecognised code %j',
    async (code) => {
      await expect(adapter().exchangeCode(code)).rejects.toThrow(ServiceUnavailableError);
    },
  );

  it.each(['', 'gho_real-token', `${MOCK_CODE_PREFIX}mock-mentor`, `${MOCK_TOKEN_PREFIX}bad/login`])(
    'refuses the unrecognised token %j',
    async (token) => {
      await expect(adapter().fetchIdentity(token)).rejects.toThrow(ServiceUnavailableError);
    },
  );
});
