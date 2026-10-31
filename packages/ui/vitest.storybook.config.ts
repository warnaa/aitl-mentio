import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const configDir = fileURLToPath(new URL('./.storybook', import.meta.url));
export default defineConfig({
  test: {
    projects: await Promise.all(['light', 'dark'].map(async (theme) => ({
      extends: false,
      plugins: await storybookTest({ configDir, initialGlobals: { theme } }),
      test: {
        name: `storybook-${theme}`,
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({ launchOptions: { args: ['--no-sandbox'] }, contextOptions: { colorScheme: theme as 'light' | 'dark', reducedMotion: 'reduce' } }),
          instances: [{ browser: 'chromium' }],
        },
      },
    }))),
  },
});
