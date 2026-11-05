import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it, vi } from 'vitest';
import { command, ensureSourceUnchanged, fingerprint } from '../../.ai/scripts/test-env.mjs';

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

it('stops descendants of a timed-out preparation command before returning', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devmentor-timeout-'));
  const processFile = join(directory, 'owned-processes.json');
  const code = `
    const { spawn } = require('node:child_process');
    const { writeFileSync } = require('node:fs');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
    writeFileSync(process.argv[1], JSON.stringify([process.pid, child.pid]));
    setInterval(() => {}, 1000);
  `;
  let owned = [];
  try {
    await expect(command(process.execPath, ['-e', code, processFile], process.env, 'timeout-regression', 1500)).rejects.toThrow('timed out');
    owned = JSON.parse(await readFile(processFile, 'utf8'));
    expect(owned).toHaveLength(2);
    await vi.waitFor(() => expect(owned.map(alive)).toEqual([false, false]));
  } finally {
    // Only fixture-owned PIDs, kept in this unique temporary directory, may be stopped.
    if (owned.length === 0) {
      try { owned = JSON.parse(await readFile(processFile, 'utf8')); } catch { /* Child may not have started. */ }
    }
    for (const pid of owned) {
      if (!alive(pid)) continue;
      if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      else process.kill(pid, 'SIGKILL');
    }
    await rm(directory, { recursive: true, force: true });
  }
});

it('refuses readiness when a source file changed after the build fingerprint was captured', async () => {
  const source = fileURLToPath(new URL('../../.ai/scripts/test-env.mjs', import.meta.url));
  const original = await stat(source);
  const built = await fingerprint();
  await expect(ensureSourceUnchanged(built)).resolves.toBe(built);
  try {
    await utimes(source, original.atimeMs / 1000, original.mtimeMs / 1000 + 5);
    await expect(ensureSourceUnchanged(built)).rejects.toThrow('Source changed during preparation/build/startup');
  } finally {
    await utimes(source, original.atimeMs / 1000, original.mtimeMs / 1000);
  }
});
