import { resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  cookieHeader,
  integrationArtifactsDirectory,
  runAgentBrowser,
  signInAs,
} from './agent-browser';

/**
 * Guards the re-run guarantee `npm run setup` depends on. The global setup applies
 * migrations and then runs `db:seed` **twice** against the ephemeral database, so
 * reaching this test at all proves the second seed did not fail. These assertions add
 * the other half: the repeated seed must not have duplicated the sample mentor either.
 * The user list is operator-only (E01), so both reads sign in as the seeded operator.
 */
describe('TC-SETUP-001 setup is idempotent', () => {
  it('leaves exactly one sample mentor after the seeder ran twice', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const session = `devmentor-setup-api-${process.pid}`;

    let response: Response;
    try {
      const operator = await signInAs(session, baseUrl, 'mock-operator');
      response = await fetch(`${baseUrl}/api/users`, { headers: cookieHeader(operator) });
    } finally {
      await closeAgentBrowser(session);
    }
    const payload = (await response.json()) as {
      ok: boolean;
      data?: { email: string; displayName: string }[];
    };

    expect(response.ok).toBe(true);
    expect(payload.ok).toBe(true);

    const seeded = (payload.data ?? []).filter((user) => user.email === 'mock-mentor@devmentor.test');

    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.displayName).toBe('Ada Lovelace');
  });

  it('still renders a single seeded row on the admin users page', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const session = `devmentor-setup-${process.pid}`;

    try {
      await signInAs(session, baseUrl, 'mock-operator');
      await runAgentBrowser(session, 'open', `${baseUrl}/admin/users`);
      await runAgentBrowser(session, 'wait', '--text', 'Ada Lovelace');
      const snapshot = await runAgentBrowser(session, 'snapshot');

      expect(snapshot).toContain('cell "Ada Lovelace"');
      expect(snapshot.match(/cell "mock-mentor@devmentor\.test"/g) ?? []).toHaveLength(1);

      await runAgentBrowser(
        session,
        'screenshot',
        resolve(integrationArtifactsDirectory, 'setup-idempotent-users.png'),
        '--full',
      );
    } catch (error) {
      await captureBrowserFailure(session, 'setup');
      throw error;
    } finally {
      await closeAgentBrowser(session);
    }
  });
});
