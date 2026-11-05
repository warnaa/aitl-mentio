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
