import { resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  expectFitsMobile,
  integrationArtifactsDirectory,
  runAgentBrowser,
} from './agent-browser';

describe('TC-HOME-001 public home page', () => {
  it('renders the designed homepage with actions only to pages that exist', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const session = inject('homeBrowserSession');

    try {
      await runAgentBrowser(session, 'open', `${baseUrl}/`);
      await runAgentBrowser(session, 'wait', '--text', 'Book a session for your question.');
      const snapshot = await runAgentBrowser(session, 'snapshot');

      expect(snapshot).toMatch(/heading "Work through your code ?with a mentor\." \[level=1/);
      expect(snapshot).toContain('heading "Book a session for your question."');
      expect(snapshot).toContain('link "How it works"');
      expect(snapshot).toContain('link "Sign in"');
      expect(snapshot.match(/link "Create an account"/g)?.length).toBeGreaterThanOrEqual(2);
      // The mentor catalogue is not built yet, so nothing links to it (spec A12).
      expect(snapshot).not.toMatch(/Find your mentor|Meet Alex/);

      await runAgentBrowser(session, 'screenshot', resolve(integrationArtifactsDirectory, 'home.png'), '--full');
      await expectFitsMobile(session, 'home');
    } catch (error) {
      await captureBrowserFailure(session, 'home');
      throw error;
    } finally {
      await closeAgentBrowser(session);
    }
  });
});
