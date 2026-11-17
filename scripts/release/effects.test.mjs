import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeEffects } from './effects.mjs';

describe('createNodeEffects', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'release-effects-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reads and writes UTF-8 text files', () => {
    const effects = createNodeEffects({ env: {} });
    const file = join(dir, 'notes.md');
    effects.writeText(file, '## ✨ Features\n');
    expect(effects.readText(file)).toBe('## ✨ Features\n');
  });

  it('exposes the environment it was given, defaulting to the process', () => {
    expect(createNodeEffects({ env: { A: '1' } }).env).toEqual({ A: '1' });
    expect(createNodeEffects().env).toBe(process.env);
  });

  it('lists git tags starting with v, ignoring blank lines', () => {
    const exec = vi.fn().mockReturnValue('v0.1.0\n\n  v0.2.0 \n');
    expect(createNodeEffects({ env: {}, exec }).listTags()).toEqual(['v0.1.0', 'v0.2.0']);
    expect(exec).toHaveBeenCalledWith('git', ['tag', '--list', 'v*'], { encoding: 'utf8' });
  });

  it('runs the real git by default', () => {
    // Runs in a git checkout (the repository itself): whatever tags exist, only v* ones come back.
    const tags = createNodeEffects({ env: {} }).listTags();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.every((tag) => tag.startsWith('v'))).toBe(true);
  });

  it('appends workflow outputs to the GITHUB_OUTPUT file', () => {
    const output = join(dir, 'output');
    writeFileSync(output, 'earlier=1\n');
    const stdout = { write: vi.fn() };
    createNodeEffects({ env: { GITHUB_OUTPUT: output }, stdout }).appendOutput('version=1.0.0');
    expect(readFileSync(output, 'utf8')).toBe('earlier=1\nversion=1.0.0\n');
    expect(stdout.write).not.toHaveBeenCalled();
  });

  it('prints outputs to stdout when there is no GITHUB_OUTPUT', () => {
    const stdout = { write: vi.fn() };
    createNodeEffects({ env: {}, stdout }).appendOutput('version=1.0.0');
    expect(stdout.write).toHaveBeenCalledWith('version=1.0.0\n');
  });

  it('writes to process.stdout by default', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    createNodeEffects({ env: {} }).appendOutput('x=1');
    expect(write).toHaveBeenCalledWith('x=1\n');
    write.mockRestore();
  });
});
