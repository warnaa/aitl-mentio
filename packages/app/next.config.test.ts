import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const loadRepoEnv = vi.hoisted(() => vi.fn());
vi.mock('./src/lib/repo-env', () => ({ loadRepoEnv }));

describe('next.config', () => {
  it('loads the repository-root .env before Next reads any configuration', async () => {
    const { default: config } = await import('./next.config');

    expect(loadRepoEnv).toHaveBeenCalledTimes(1);
    const [path] = loadRepoEnv.mock.calls[0] as [URL];
    expect(fileURLToPath(path)).toBe(resolve(import.meta.dirname, '..', '..', '.env'));
    expect(config.transpilePackages).toContain('@devmentor/core');
  });
});
