import { resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  currentUrl,
  integrationArtifactsDirectory,
  runAgentBrowser,
  signInAs,
} from './agent-browser';

describe('TC-ADMIN-001 admin panel basics', () => {
  it('shows a connected dashboard and the seeded users table to a signed-in operator', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const session = inject('adminBrowserSession');

    try {
      // /admin is operator-only (E01): mock-operator is on OPERATOR_EMAILS and lands there.
      await signInAs(session, baseUrl, 'mock-operator');
      expect((await currentUrl(session)).pathname).toBe('/admin');
      await runAgentBrowser(session, 'wait', '--text', 'Connected');
      const dashboard = await runAgentBrowser(session, 'snapshot');

      expect(dashboard).toContain('heading "Operator workspace"');
      expect(dashboard).toContain('StaticText "Connected"');
      expect(dashboard).toContain('link "Users"');
      expect(dashboard).toContain('link "View users"');
      expect(dashboard).toContain('button "Sign out"');

      await runAgentBrowser(
        session,
        'screenshot',
        resolve(integrationArtifactsDirectory, 'admin-dashboard.png'),
        '--full',
      );

      await runAgentBrowser(session, 'open', `${baseUrl}/admin/users`);
      await runAgentBrowser(session, 'wait', '--text', 'Ada Lovelace');
      const users = await runAgentBrowser(session, 'snapshot');

      expect(users).toContain('heading "Users"');
      expect(users).toContain('cell "Ada Lovelace"');
      expect(users).toContain('cell "mock-mentor@devmentor.test"');
      expect(users).toContain('list "Roles of Ada Lovelace"');

      await runAgentBrowser(
        session,
        'screenshot',
        resolve(integrationArtifactsDirectory, 'admin-users.png'),
        '--full',
      );
    } catch (error) {
      await captureBrowserFailure(session, 'admin');
      throw error;
    } finally {
      await closeAgentBrowser(session);
    }
  });
});
