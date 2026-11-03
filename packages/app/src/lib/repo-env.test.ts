import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadRepoEnv } from './repo-env';

const PREFIX = 'DEVMENTOR_REPO_ENV_TEST_';

describe('loadRepoEnv', () => {
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'devmentor-repo-env-'));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const key of Object.keys(process.env)) {
      if (key.startsWith(PREFIX)) {
        delete process.env[key];
      }
    }
  });

  it('loads variables from the file', async () => {
    const path = join(directory, 'loads.env');
    await writeFile(path, `${PREFIX}LOADED=from-file\n`, 'utf8');

    loadRepoEnv(path);

    expect(process.env[`${PREFIX}LOADED`]).toBe('from-file');
  });

  it('keeps a variable the real environment already sets, even to an empty string', async () => {
    const path = join(directory, 'precedence.env');
    await writeFile(path, `${PREFIX}SET=from-file\n${PREFIX}BLANK=from-file\n`, 'utf8');
    vi.stubEnv(`${PREFIX}SET`, 'from-environment');
    vi.stubEnv(`${PREFIX}BLANK`, '');

    loadRepoEnv(path);

    expect(process.env[`${PREFIX}SET`]).toBe('from-environment');
    expect(process.env[`${PREFIX}BLANK`]).toBe('');
  });

  it('ignores a missing file', () => {
    expect(() => loadRepoEnv(join(directory, 'absent.env'))).not.toThrow();
  });

  it('rethrows any failure other than a missing file', () => {
    // A directory is not a readable env file: EISDIR on POSIX, EISDIR/EPERM on Windows.
    expect(() => loadRepoEnv(directory)).toThrow();
  });
});
