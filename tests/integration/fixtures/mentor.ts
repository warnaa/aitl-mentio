import { inject } from 'vitest';
import { integrationChildEnvironment } from '../environment';
import { runNpm } from '../npm';

/** The header `apiCall` sends; `apiHandler` refuses a state-changing request without it. */
export const CSRF_HEADERS = { 'x-devmentor-request': '1' };

/** Arguments reach a Windows shell as one string, so fixtures pass only shell-inert values. */
const SHELL_INERT = /^[A-Za-z0-9@._,-]+$/;

/**
 * A pending invitation created through the operator command itself (`npm run invite`),
 * against the integration app's database (T1). Returns the one-time link it printed.
 */
export async function seedPendingInvitation(email: string, tags: readonly string[] = ['react']): Promise<string> {
  for (const value of [email, ...tags]) {
    if (!SHELL_INERT.test(value)) throw new Error(`seedPendingInvitation: unsafe argument ${value}`);
  }
  const baseUrl = inject('integrationBaseUrl');
  const stdout = await runNpm(
    ['run', 'invite', '--', 'create', '--operator', 'integration', '--email', email, '--tags', tags.join(',')],
    integrationChildEnvironment(inject('integrationDatabaseUrl'), baseUrl),
  );
  const link = stdout.split(/\r?\n/).find((line) => line.startsWith(`${baseUrl}/invitation/`));
  if (!link) throw new Error(`npm run invite printed no invitation link:\n${stdout}`);
  return link;
}

/** The invitation token at the end of a link printed by `seedPendingInvitation`. */
export const tokenOf = (link: string) => new URL(link).pathname.split('/').at(-1)!;

/** A `cookie` request header from the session cookie a response set. */
function sessionHeader(response: Response): Record<string, string> {
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie?.startsWith('devmentor_session=')) throw new Error('the response set no session cookie');
  return { cookie };
}

/**
 * Turn a signed-in persona into a mentor through the real invitation flow and return
 * the re-issued session (the grant bumps `session_version`, retiring `signedIn`).
 */
export async function acceptInvitationAs(
  baseUrl: string,
  login: string,
  signedIn: Record<string, string>,
): Promise<Record<string, string>> {
  const token = tokenOf(await seedPendingInvitation(`${login}@devmentor.test`));
  const response = await fetch(`${baseUrl}/api/invitations/${token}/accept`, {
    method: 'POST',
    headers: { ...signedIn, ...CSRF_HEADERS },
  });
  if (!response.ok) throw new Error(`accepting the invitation for ${login} answered ${response.status}`);
  return sessionHeader(response);
}

export const PUBLIC_WORK_URL = 'https://github.com/devmentor-fixture';

/** Complete the page gate for a mentor session; never publishes. */
export async function completeMentorProfile(
  baseUrl: string,
  mentor: Record<string, string>,
  bio: string,
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/mentors/me`, {
    method: 'PUT',
    headers: { ...mentor, ...CSRF_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify({ publicWorkUrl: PUBLIC_WORK_URL, bio, stackTags: ['react', 'typescript'] }),
  });
  if (!response.ok) throw new Error(`saving the mentor profile answered ${response.status}`);
}

export interface TransitionResult {
  status: number;
  body: {
    ok: boolean;
    data?: { slug: string | null; publishedAt: string | null };
    error?: { fieldErrors?: Record<string, string[]> };
  };
}

/** POST a publication transition and return the status and envelope. */
export async function transition(
  baseUrl: string,
  mentor: Record<string, string>,
  action: 'publish' | 'unpublish',
): Promise<TransitionResult> {
  const response = await fetch(`${baseUrl}/api/mentors/me/${action}`, {
    method: 'POST',
    headers: { ...mentor, ...CSRF_HEADERS },
  });
  return { status: response.status, body: (await response.json()) as TransitionResult['body'] };
}

/** A complete, published mentor page (T1); the name makes its non-null slug explicit. */
export async function seedPublishedMentorProfile(
  baseUrl: string,
  mentor: Record<string, string>,
  bio = 'I help teams ship typed React applications.',
): Promise<string> {
  await completeMentorProfile(baseUrl, mentor, bio);
  const published = await transition(baseUrl, mentor, 'publish');
  const slug = published.body.data?.slug;
  if (published.status !== 200 || !slug) throw new Error(`publishing answered ${published.status}`);
  return slug;
}
