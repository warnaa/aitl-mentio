import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/*.integration.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    // Invitation-backed scenarios launch isolated operator CLI processes and browser sessions.
    testTimeout: 180_000,
    hookTimeout: 180_000,
    teardownTimeout: 30_000,
    retry: 0,
  },
});
